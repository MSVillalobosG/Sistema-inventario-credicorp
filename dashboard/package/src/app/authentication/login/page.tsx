'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Box, Button, Paper, Typography, Alert, Stack, TextField, CircularProgress } from '@mui/material'
import {
  getAuthToken,
  getStoredUser,
  loginWithCredentials,
  getGenericAccounts,
} from '@/services/auth'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionHint, setSessionHint] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const accounts = getGenericAccounts()

  useEffect(() => {
    const reason = searchParams.get('reason')
    if (reason === 'session' || reason === 'expired') {
      setSessionHint(
        'Su sesion caduco o el servidor rechazo el token (p. ej. cambio JWT_SECRET). Inicie sesion de nuevo con el backend en marcha.'
      )
      return
    }
    if (getStoredUser() && getAuthToken()) {
      router.replace('/dashboard')
    }
  }, [router, searchParams])

  const onLoginGeneric = async () => {
    try {
      setLoading(true)
      setError('')
      await loginWithCredentials(email, password)
      router.replace('/dashboard')
    } catch (err: any) {
      setError(err?.message || 'No fue posible iniciar sesion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <Paper sx={{ p: 4, width: '100%', maxWidth: 420 }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          Inventario TI
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Para asignar equipos y usar el API debe iniciar sesión con el backend en marcha (obtiene un token JWT). El
          acceso genérico local sin token solo sirve para navegar; no puede ejecutar asignaciones.
        </Typography>

        {sessionHint && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {sessionHint}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={1.5}>
          <TextField
            fullWidth
            label="Correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            size="small"
          />
          <TextField
            fullWidth
            label="Contrasena"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            size="small"
          />
          <Button fullWidth variant="contained" onClick={onLoginGeneric} disabled={loading}>
            {loading ? 'Iniciando...' : 'Ingresar'}
          </Button>
        </Stack>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Cuentas genericas habilitadas
          </Typography>
          {accounts.map((a) => (
            <Typography key={a.email} variant="caption" display="block">
              {a.email} / {a.password}
            </Typography>
          ))}
        </Alert>

      </Paper>
    </Box>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
