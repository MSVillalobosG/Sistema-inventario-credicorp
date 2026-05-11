'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material'
import { IconPrinter, IconArrowLeft } from '@tabler/icons-react'
import InventoryPageShell from '@/app/(DashboardLayout)/components/shared/InventoryPageShell'
import { fetcher } from '@/services/api'
import {
  clearActaSalidaDraft,
  readActaSalidaDraft,
  type ActaSalidaDraft,
} from '@/lib/actaSalidaDraft'

type DeviceFields = NonNullable<ActaSalidaDraft['device']>

export default function ActaSalidaPage() {
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)
  const [draft, setDraft] = useState<ActaSalidaDraft | null>(null)
  /** Datos frescos del equipo tras asignar (completa nombre, serial, tipo, etc.). */
  const [deviceLive, setDeviceLive] = useState<DeviceFields | null>(null)
  const [cargandoEquipo, setCargandoEquipo] = useState(false)

  const [seeded, setSeeded] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({
    ordenServicio: '',
    fecha: '',
    nombreUsuario: '',
    documento: '',
    sede: '',
    dependencia: '',
    eqn_nombre: '',
    eqn_tipo: '',
    eqn_marca: '',
    eqn_modelo: '',
    eqn_serial: '',
    eqn_so: '',
    eqn_procesador: '',
    eqn_ip: '',
    eqn_ram: '',
    eqn_disco: '',
    eqn_monitor_serial: '',
    eqn_monitor_marca: '',
    eqn_placa: '',
    eqn_contrato: '',
    eqn_modelo2: '',
    eqn_tipo_ram_disco: '',
    eqa_nombre: '',
    eqa_tipo: '',
    eqa_marca: '',
    eqa_modelo: '',
    eqa_serial: '',
    eqa_so: '',
    eqa_procesador: '',
    eqa_ip: '',
    eqa_ram: '',
    eqa_disco: '',
    eqa_monitor_serial: '',
    eqa_monitor_marca: '',
    eqa_placa: '',
    eqa_contrato: '',
    eqa_modelo2: '',
    observaciones: '',
    instaladoPor: '',
    recibidoPor: '',
  })
  const [tipo, setTipo] = useState<'nueva' | 'formateo' | 'cambio'>('nueva')
  const [backup, setBackup] = useState({
    descargas: false,
    documentos: false,
    escritorio: false,
    favoritos: false,
  })
  const [apps, setApps] = useState({
    zoom: false,
    vpn: false,
    citrix: false,
    office: false,
    outlook: false,
    teams: false,
    chrome: false,
  })

  const refrescarEquipoPorPlaca = useCallback(async (placa: string) => {
    const p = placa.trim()
    if (!p) return
    setCargandoEquipo(true)
    try {
      const api = await fetcher(`/devices/by-placa/${encodeURIComponent(p)}`)
      setDeviceLive({
        id: api.id,
        placa_equipo: api.placa_equipo,
        marca: api.marca,
        modelo: api.modelo,
        serial_number: api.serial_number,
        nombre_equipo: api.nombre_equipo,
        tipo_equipo: api.tipo_equipo,
        sistema_operativo: api.sistema_operativo,
        tipo_procesador: api.tipo_procesador,
        capacidad_ram: api.capacidad_ram,
        tipo_ram: api.tipo_ram,
        tipo_disco: api.tipo_disco,
        capacidad_disco: api.capacidad_disco,
        sede: api.sede,
        tipo_contrato: api.tipo_contrato,
        ip_consola: api.ip_consola,
      })
    } catch {
      setDeviceLive(null)
    } finally {
      setCargandoEquipo(false)
    }
  }, [])

  useEffect(() => {
    const d = readActaSalidaDraft()
    setDraft(d)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!draft?.placa) return
    refrescarEquipoPorPlaca(draft.placa)
  }, [draft?.placa, refrescarEquipoPorPlaca])

  const d = draft
  const dev = useMemo(() => {
    if (!d) return null
    const base = d.device || {}
    const live = deviceLive || {}
    return { ...base, ...live } as DeviceFields
  }, [d, deviceLive])

  useEffect(() => {
    if (!draft || seeded) return
    const formatDate = (iso: string) =>
      new Date(iso).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    setForm((prev) => ({
      ...prev,
      fecha: formatDate(draft.asignadoEn),
      nombreUsuario: draft.nombreUsuario || '',
      documento: draft.documento || '',
      sede: draft.sedeUsuario || '',
      dependencia: draft.cargo || '',
      eqn_nombre: dev?.nombre_equipo || '',
      eqn_tipo: dev?.tipo_equipo || '',
      eqn_marca: dev?.marca || '',
      eqn_modelo: dev?.modelo || '',
      eqn_serial: dev?.serial_number || '',
      eqn_so: dev?.sistema_operativo || '',
      eqn_procesador: dev?.tipo_procesador || '',
      eqn_ip: dev?.ip_consola || '',
      eqn_ram: dev?.capacidad_ram ? `${dev.capacidad_ram} GB` : '',
      eqn_disco: dev?.capacidad_disco ? `${dev.capacidad_disco} GB` : '',
      eqn_placa: dev?.placa_equipo || draft.placa || '',
      eqn_contrato: dev?.tipo_contrato || '',
      eqn_tipo_ram_disco: `${dev?.tipo_ram || ''}${dev?.tipo_disco ? ` / ${dev?.tipo_disco}` : ''}`.trim(),
      recibidoPor: draft.nombreUsuario || '',
    }))
    setSeeded(true)
  }, [draft, dev, seeded])

  const handlePrint = () => {
    window.print()
  }

  const volverAsignacion = () => {
    clearActaSalidaDraft()
    router.push('/movements/assign')
  }

  if (!hydrated) {
    return (
      <InventoryPageShell title="Acta de salida" description="Cargando…">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      </InventoryPageShell>
    )
  }

  if (!d) {
    return (
      <InventoryPageShell
        title="Acta de salida"
        description="Se genera al confirmar una asignación de equipo."
      >
        <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
          No hay datos de una asignación reciente. Vaya a{' '}
          <Link href="/movements/assign" style={{ fontWeight: 700 }}>
            Asignación de equipo
          </Link>{' '}
          y complete el flujo de confirmación.
        </Alert>
      </InventoryPageShell>
    )
  }

  const updateField = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const Row = ({
    l1,
    n1,
    l2,
    n2,
  }: {
    l1: string
    n1: string
    l2: string
    n2: string
  }) => (
    <tr>
      <td className="lbl">{l1}</td>
      <td className="val">
        <input className="cell-input" value={form[n1] || ''} onChange={(e) => updateField(n1, e.target.value)} />
      </td>
      <td className="lbl">{l2}</td>
      <td className="val">
        <input className="cell-input" value={form[n2] || ''} onChange={(e) => updateField(n2, e.target.value)} />
      </td>
    </tr>
  )

  return (
    <InventoryPageShell
      title="Acta de salida"
      description="Formato de alistamiento y entrega de equipos. Imprima o guarde como PDF desde el navegador."
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }} className="no-print">
        <Button
          variant="outlined"
          startIcon={<IconArrowLeft size={18} />}
          onClick={volverAsignacion}
          sx={{ textTransform: 'none' }}
        >
          Volver a asignación
        </Button>
        <Button
          variant="contained"
          startIcon={<IconPrinter size={18} />}
          onClick={handlePrint}
          sx={{ textTransform: 'none' }}
        >
          Imprimir / PDF
        </Button>
      </Stack>

      <Box id="acta-print-root" className="acta-root">
        {cargandoEquipo ? (
          <Typography variant="caption" color="text.secondary" className="no-print" sx={{ display: 'block', mb: 1 }}>
            Actualizando datos del equipo desde el inventario…
          </Typography>
        ) : null}
        <Box className="acta-paper">
          <table className="acta-table">
            <tbody>
              <tr>
                <td colSpan={4} className="title-row">
                  FORMATO DE ALISTAMIENTO Y ENTREGA DE EQUIPOS
                </td>
              </tr>
              <tr>
                <td className="lbl">Orden de Servicio N°</td>
                <td className="val">
                  <input className="cell-input" value={form.ordenServicio} onChange={(e) => updateField('ordenServicio', e.target.value)} />
                </td>
                <td className="lbl">Fecha</td>
                <td className="val">
                  <input className="cell-input" value={form.fecha} onChange={(e) => updateField('fecha', e.target.value)} />
                </td>
              </tr>
              <tr>
                <td className="lbl">Tipo</td>
                <td colSpan={3} className="val">
                  <label className="check"><input type="checkbox" checked={tipo === 'nueva'} onChange={() => setTipo('nueva')} /> Nueva instalación</label>
                  <label className="check"><input type="checkbox" checked={tipo === 'formateo'} onChange={() => setTipo('formateo')} /> Formateo</label>
                  <label className="check"><input type="checkbox" checked={tipo === 'cambio'} onChange={() => setTipo('cambio')} /> Cambio</label>
                </td>
              </tr>
              <tr>
                <td className="lbl">Nombre Usuario</td>
                <td className="val"><input className="cell-input" value={form.nombreUsuario} onChange={(e) => updateField('nombreUsuario', e.target.value)} /></td>
                <td className="lbl">Documento</td>
                <td className="val"><input className="cell-input" value={form.documento} onChange={(e) => updateField('documento', e.target.value)} /></td>
              </tr>
              <tr>
                <td className="lbl">Sede</td>
                <td className="val"><input className="cell-input" value={form.sede} onChange={(e) => updateField('sede', e.target.value)} /></td>
                <td className="lbl">Dependencia / Área</td>
                <td className="val"><input className="cell-input" value={form.dependencia} onChange={(e) => updateField('dependencia', e.target.value)} /></td>
              </tr>

              <tr>
                <td colSpan={4} className="section-title">
                  CARACTERÍSTICAS (EQUIPO NUEVO)
                </td>
              </tr>
              <Row l1="Nombre de equipo" n1="eqn_nombre" l2="Memoria RAM" n2="eqn_ram" />
              <Row l1="Tipo" n1="eqn_tipo" l2="Tamaño de disco" n2="eqn_disco" />
              <Row l1="Marca PC" n1="eqn_marca" l2="Monitor Serial" n2="eqn_monitor_serial" />
              <Row l1="Modelo PC" n1="eqn_modelo" l2="Monitor Marca" n2="eqn_monitor_marca" />
              <Row l1="Serial Equipo" n1="eqn_serial" l2="Placa Inventario" n2="eqn_placa" />
              <Row l1="Sistema Operativo" n1="eqn_so" l2="Contrato" n2="eqn_contrato" />
              <Row l1="Procesador" n1="eqn_procesador" l2="Modelo" n2="eqn_modelo2" />
              <Row l1="Dirección IP" n1="eqn_ip" l2="Tipo RAM/Disco" n2="eqn_tipo_ram_disco" />

              <tr>
                <td colSpan={4} className="section-title">
                  BACKUP DATOS
                </td>
              </tr>
              <tr>
                <td colSpan={4} className="val">
                  <label className="check"><input type="checkbox" checked={backup.descargas} onChange={(e) => setBackup((p) => ({ ...p, descargas: e.target.checked }))} /> Descargas</label>
                  <label className="check"><input type="checkbox" checked={backup.documentos} onChange={(e) => setBackup((p) => ({ ...p, documentos: e.target.checked }))} /> Documentos</label>
                  <label className="check"><input type="checkbox" checked={backup.escritorio} onChange={(e) => setBackup((p) => ({ ...p, escritorio: e.target.checked }))} /> Escritorio</label>
                  <label className="check"><input type="checkbox" checked={backup.favoritos} onChange={(e) => setBackup((p) => ({ ...p, favoritos: e.target.checked }))} /> Favoritos</label>
                </td>
              </tr>

              <tr>
                <td colSpan={4} className="section-title">
                  APLICACIONES CORPORATIVAS INSTALADAS
                </td>
              </tr>
              <tr>
                <td colSpan={4} className="val apps-row">
                  <label className="check"><input type="checkbox" checked={apps.zoom} onChange={(e) => setApps((p) => ({ ...p, zoom: e.target.checked }))} /> ZOOM</label>
                  <label className="check"><input type="checkbox" checked={apps.vpn} onChange={(e) => setApps((p) => ({ ...p, vpn: e.target.checked }))} /> GLOBAL PROTECT VPN</label>
                  <label className="check"><input type="checkbox" checked={apps.citrix} onChange={(e) => setApps((p) => ({ ...p, citrix: e.target.checked }))} /> CITRIX</label>
                  <label className="check"><input type="checkbox" checked={apps.office} onChange={(e) => setApps((p) => ({ ...p, office: e.target.checked }))} /> PAQUETE OFFICE</label>
                  <label className="check"><input type="checkbox" checked={apps.outlook} onChange={(e) => setApps((p) => ({ ...p, outlook: e.target.checked }))} /> MICROSOFT OUTLOOK</label>
                  <label className="check"><input type="checkbox" checked={apps.teams} onChange={(e) => setApps((p) => ({ ...p, teams: e.target.checked }))} /> MICROSOFT TEAMS</label>
                  <label className="check"><input type="checkbox" checked={apps.chrome} onChange={(e) => setApps((p) => ({ ...p, chrome: e.target.checked }))} /> NAVEGADOR CHROME</label>
                </td>
              </tr>

              <tr>
                <td colSpan={4} className="section-title">
                  CARACTERÍSTICAS (EQUIPO ANTIGUO)
                </td>
              </tr>
              <Row l1="Nombre de equipo" n1="eqa_nombre" l2="Memoria RAM" n2="eqa_ram" />
              <Row l1="Tipo" n1="eqa_tipo" l2="Tamaño de disco" n2="eqa_disco" />
              <Row l1="Marca PC" n1="eqa_marca" l2="Monitor Serial" n2="eqa_monitor_serial" />
              <Row l1="Modelo PC" n1="eqa_modelo" l2="Monitor Marca" n2="eqa_monitor_marca" />
              <Row l1="Serial Equipo" n1="eqa_serial" l2="Placa Inventario" n2="eqa_placa" />
              <Row l1="Sistema Operativo" n1="eqa_so" l2="Contrato" n2="eqa_contrato" />
              <Row l1="Procesador" n1="eqa_procesador" l2="Modelo" n2="eqa_modelo2" />
              <Row l1="Dirección IP" n1="eqa_ip" l2="" n2="eqa_ip" />

              <tr>
                <td colSpan={4} className="lbl">Observaciones de equipo asignado</td>
              </tr>
              <tr>
                <td colSpan={4} className="val obs-box">
                  <textarea className="cell-input textarea" value={form.observaciones} onChange={(e) => updateField('observaciones', e.target.value)} />
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="sign-box">
                  Instalado por: <span className="line"><input className="cell-input sign-input" value={form.instaladoPor} onChange={(e) => updateField('instaladoPor', e.target.value)} /></span>
                </td>
                <td colSpan={2} className="sign-box">
                  Recibido por (usuario): <span className="line"><input className="cell-input sign-input" value={form.recibidoPor} onChange={(e) => updateField('recibidoPor', e.target.value)} /></span>
                </td>
              </tr>
            </tbody>
          </table>
        </Box>
      </Box>

      <style jsx global>{`
        .acta-root .acta-paper {
          background: #fff;
          border: 1px solid #222;
          border-radius: 2px;
          max-width: 900px;
          margin: 0 auto;
          padding: 8px;
        }
        .acta-root .acta-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          color: #111;
        }
        .acta-root .acta-table td {
          border: 1px solid #222;
          padding: 4px 6px;
          vertical-align: middle;
        }
        .acta-root .title-row {
          font-weight: 700;
          text-align: center;
          font-size: 13px;
          letter-spacing: 0.2px;
        }
        .acta-root .section-title {
          font-weight: 700;
          text-align: center;
          background: #f2f2f2;
        }
        .acta-root .lbl {
          font-weight: 600;
          width: 18%;
        }
        .acta-root .val {
          width: 32%;
        }
        .acta-root .check {
          margin-right: 14px;
          white-space: nowrap;
          display: inline-block;
        }
        .acta-root .check input {
          margin-right: 4px;
          transform: scale(0.85);
        }
        .acta-root .cell-input {
          width: 100%;
          border: 0;
          background: transparent;
          outline: none;
          padding: 0;
          font: inherit;
          color: inherit;
        }
        .acta-root .textarea {
          min-height: 58px;
          resize: none;
        }
        .acta-root .apps-row .check {
          margin-bottom: 2px;
        }
        .acta-root .obs-box {
          min-height: 68px;
          white-space: pre-wrap;
        }
        .acta-root .sign-box {
          height: 44px;
        }
        .acta-root .line {
          display: inline-block;
          min-width: 180px;
          border-bottom: 1px solid #111;
          margin-left: 8px;
          line-height: 1.1;
        }
        .acta-root .sign-input {
          border: 0;
          width: 100%;
          min-width: 140px;
        }

        @media print {
          body * {
            visibility: hidden !important;
          }
          #acta-print-root,
          #acta-print-root * {
            visibility: visible !important;
          }
          #acta-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .acta-root .acta-paper {
            border: 1px solid #111 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 auto !important;
            width: 190mm !important;
            max-width: 190mm !important;
            padding: 2mm !important;
          }
          .acta-root .acta-table {
            font-size: 9px !important;
          }
          .acta-root .acta-table td {
            padding: 2px 3px !important;
          }
          .acta-root .obs-box {
            min-height: 32px !important;
          }
          @page {
            size: A4 portrait;
            margin: 4mm;
          }
        }
      `}</style>
    </InventoryPageShell>
  )
}
