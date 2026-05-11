import { fetcher } from './api'
import type { DashboardRole } from './auth'

export type DashboardAccountRow = {
  id: number
  email: string
  display_name: string
  role: DashboardRole
  is_active: boolean
}

export function listDashboardAccounts() {
  return fetcher('/dashboard-accounts/') as Promise<DashboardAccountRow[]>
}

export function createDashboardAccount(body: {
  email: string
  password: string
  display_name: string
  role: DashboardRole
}) {
  return fetcher('/dashboard-accounts/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as Promise<DashboardAccountRow>
}

export function updateDashboardAccount(
  id: number,
  body: {
    display_name?: string
    role?: DashboardRole
    is_active?: boolean
    new_password?: string
  }
) {
  return fetcher(`/dashboard-accounts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as Promise<DashboardAccountRow>
}
