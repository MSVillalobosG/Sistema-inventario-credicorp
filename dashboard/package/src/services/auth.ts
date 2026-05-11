'use client'

import { getApiBase } from './api'

export type DashboardRole = 'super_admin' | 'admin' | 'editor' | 'viewer'

export type AuthUser = {
  id?: number
  name: string
  email: string
  username: string
  provider: 'local' | 'microsoft'
  role?: DashboardRole
}

export type AuthSession = {
  token: string
  user: AuthUser
}

/** Debe coincidir con `AUTH_SESSION_KEY` en `api.ts` */
export const AUTH_SESSION_KEY = 'inv.auth.session'
const LEGACY_USER_KEY = 'inv.auth.user'

const GENERIC_USERS = [
  { name: 'Administrador TI', email: 'admin@credicorp.com', password: 'Admin123*' },
  { name: 'Bodega Cali', email: 'bodega.cali@credicorp.com', password: 'Bodega123*' },
  { name: 'Mesa de Ayuda', email: 'soporte@credicorp.com', password: 'Soporte123*' },
]

const FALLBACK_ROLES: Record<string, DashboardRole> = {
  'admin@credicorp.com': 'super_admin',
  'bodega.cali@credicorp.com': 'editor',
  'soporte@credicorp.com': 'editor',
}

export function getGenericAccounts() {
  return GENERIC_USERS.map(({ name, email, password }) => ({ name, email, password }))
}

export function hasMicrosoftConfig() {
  return false
}

function readSession(): AuthSession | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(AUTH_SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

/** Migra sesión antigua (sin JWT) y la elimina */
function migrateLegacyIfNeeded(): void {
  if (typeof window === 'undefined') return
  const legacy = localStorage.getItem(LEGACY_USER_KEY)
  if (!legacy || localStorage.getItem(AUTH_SESSION_KEY)) return
  try {
    const u = JSON.parse(legacy) as AuthUser
    localStorage.setItem(
      AUTH_SESSION_KEY,
      JSON.stringify({
        token: '',
        user: {
          ...u,
          role: FALLBACK_ROLES[u.email?.toLowerCase() ?? ''] ?? 'viewer',
        },
      } satisfies AuthSession)
    )
  } catch {
    /* ignore */
  }
  localStorage.removeItem(LEGACY_USER_KEY)
}

export function getAuthSession(): AuthSession | null {
  migrateLegacyIfNeeded()
  return readSession()
}

export function getStoredUser(): AuthUser | null {
  return getAuthSession()?.user ?? null
}

export function getAuthToken(): string | null {
  const t = getAuthSession()?.token
  return t && t.length > 0 ? t : null
}

export function isAuthenticated() {
  return !!getStoredUser()
}

export async function loginWithCredentials(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedPassword = password.trim()

  try {
    const res = await fetch(`${getApiBase()}/auth/dashboard-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, password: normalizedPassword }),
    })
    if (res.ok) {
      const data = (await res.json()) as {
        access_token: string
        user: {
          id: number
          email: string
          display_name: string
          role: DashboardRole
        }
      }
      const session: AuthSession = {
        token: data.access_token,
        user: {
          id: data.user.id,
          name: data.user.display_name,
          email: data.user.email,
          username: data.user.email,
          provider: 'local',
          role: data.user.role,
        },
      }
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
      return session.user
    }
  } catch {
    /* backend caído → respaldo local */
  }

  const account = GENERIC_USERS.find(
    (u) => u.email.toLowerCase() === normalizedEmail && u.password === normalizedPassword
  )

  if (!account) {
    throw new Error('Credenciales invalidas')
  }

  const user: AuthUser = {
    name: account.name,
    email: account.email,
    username: account.email,
    provider: 'local',
    role: FALLBACK_ROLES[account.email.toLowerCase()] ?? 'viewer',
  }

  const session: AuthSession = { token: '', user }
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
  return user
}

export async function loginWithMicrosoft() {
  throw new Error('Login Microsoft deshabilitado temporalmente')
}

export async function logoutCurrentUser() {
  localStorage.removeItem(AUTH_SESSION_KEY)
  localStorage.removeItem(LEGACY_USER_KEY)
}

export function isSuperAdmin(): boolean {
  return getStoredUser()?.role === 'super_admin'
}

/** Roles que pueden crear/editar inventario (no aplica a configuración de cuentas). */
export function canWriteInventory(): boolean {
  const r = getStoredUser()?.role
  if (r === 'viewer') return false
  const token = getAuthToken()
  if (!token) return false
  return true
}
