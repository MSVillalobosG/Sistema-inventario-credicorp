/**
 * Formato de alistamiento y entrega de equipos (plantilla tipo Word corporativo).
 * Casillas reales para marcar lo instalado antes de imprimir / guardar como PDF.
 * Sin dependencias: HTML en ventana nueva; desde la app se abre el diálogo de impresión al cargar.
 */

export type ActaEntregaUsuario = {
  nombre?: string | null
  documento?: string | null
  email?: string | null
  cargo?: string | null
  sede?: string | null
  usuario?: string | null
  /** Si el API de usuarios lo envía, se usa en * Ubicación */
  vp_funcional?: string | null
}

export type TipoAlistamiento = 'nueva_instalacion' | 'formateo' | 'cambio'

export type ActaEntregaPayload = {
  device: Record<string, unknown>
  usuarioRed: string
  usuarioDetalle: ActaEntregaUsuario | null
  instaladorNombre?: string | null
  /** Número de orden de servicio si existe */
  ordenServicio?: string | null
  /** Tipo de trabajo (marca el radio correspondiente) */
  tipoAlistamiento?: TipoAlistamiento | null
}

function txt(v: unknown, fallback = '-'): string {
  if (v == null || String(v).trim() === '') return fallback
  return String(v).trim()
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escAttr(s: string): string {
  return esc(s)
}

function safeFilenamePart(s: string): string {
  return s.replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_').slice(0, 48) || 'equipo'
}

function fmtGb(v: unknown): string {
  const s = txt(v, '')
  if (!s) return '-'
  if (/gb/i.test(s)) return s.toUpperCase().replace(/\s+/g, '')
  return `${s}GB`
}

function fechaColombia(): string {
  return new Date().toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const NOTA_RECEPCION =
  'Nota recepción del Equipo : Con la firma de la presente acta, confirmo que recibo a satisfacción todos los elementos de Software y Hardware. A su vez certifico que fueron probados todos los accesos, aplicaciones y funcionalidades las cuales operan correctamente.'

/** Checklist único de aplicaciones corporativas (solo estos ítems). */
const APPS_COLS: string[][] = [
  ['ZOOM', 'ORION', 'ANTIVIRUS TRENDMICRO', 'SIF', 'SIFI'],
  [
    'GLOBAL PROTECT VPN',
    'NAVEGADOR CHROME',
    'CIFRADO DE DISCO (FULL DISK)',
    'CONTROLADORES',
    'ADOBE READER',
  ],
  ['CITRIX', 'UNIDADES DE RED', 'FORMATEO', 'FORESCOUT (NAC)', 'ZTNA (NAVEGACION SEGURA)'],
  ['PAQUETE OFFICE', 'MICROSOFT OUTLOOK', 'MICROSOFT TEAMS'],
]

function radioTipo(value: TipoAlistamiento, current: TipoAlistamiento): string {
  const checked = current === value ? ' checked' : ''
  return `<label class="lbl-rad"><input type="radio" name="tipo_alistamiento" value="${value}"${checked} /> ${esc(
    value === 'nueva_instalacion' ? 'Nueva Instalación' : value === 'formateo' ? 'Formateo' : 'Cambio'
  )}</label>`
}

function chkLine(label: string, id: string, checkedByDefault = false): string {
  const checked = checkedByDefault ? ' checked' : ''
  return `<label class="lbl-chk"><input type="checkbox" id="${esc(id)}" name="${esc(id)}"${checked} /> ${esc(label)}</label>`
}

/** Apps corporativas: casi todas marcadas por defecto; ZOOM y CITRIX quedan sin marcar. */
function appsGridHtml(): string {
  return APPS_COLS.map((col, ci) => {
    const cells = col.map((lab, ri) => {
      const defaultOn = lab !== 'ZOOM' && lab !== 'CITRIX'
      return chkLine(lab, `app_${ci}_${ri}`, defaultOn)
    })
    return `<div class="apps-col">${cells.join('')}</div>`
  }).join('')
}

function twoColTable(
  title: string,
  leftFields: { l: string; v: string }[],
  rightFields: { l: string; v: string }[]
): string {
  const n = Math.max(leftFields.length, rightFields.length)
  const rows: string[] = []
  for (let i = 0; i < n; i++) {
    const lf = leftFields[i]
    const rf = rightFields[i]
    const lv = lf ? escAttr(String(lf.v).trim()) : ''
    const rv = rf ? escAttr(String(rf.v).trim()) : ''
    rows.push(`<tr>
      <td class="lab">${lf ? esc(lf.l) : ''}</td>
      <td class="val"><input type="text" class="field-ul" value="${lf ? lv : ''}" /></td>
      <td class="mid"></td>
      <td class="lab">${rf ? esc(rf.l) : ''}</td>
      <td class="val"><input type="text" class="field-ul" value="${rf ? rv : ''}" /></td>
    </tr>`)
  }
  return `<div class="box"><div class="hdr-bar">${esc(title)}</div><div class="box-inner"><table class="car">${rows.join('')}</table></div></div>`
}

export function buildActaHtml(data: ActaEntregaPayload): string {
  const { device: d, usuarioRed, usuarioDetalle, instaladorNombre } = data
  const ordenExplicit =
    data.ordenServicio != null && String(data.ordenServicio).trim() !== ''
      ? String(data.ordenServicio).trim()
      : ''
  const tipoSel: TipoAlistamiento = data.tipoAlistamiento ?? 'nueva_instalacion'

  const nombreEquipo =
    txt(d.nombre_equipo) !== '-'
      ? txt(d.nombre_equipo)
      : txt(d.serial_number) !== '-'
        ? txt(d.serial_number)
        : txt(d.placa_equipo)
  const tipoEq = txt(d.tipo_equipo) !== '-' ? txt(d.tipo_equipo).toUpperCase() : 'PORTATIL'
  const marca = txt(d.marca).toUpperCase()
  const modelo = txt(d.modelo)
  const serial = txt(d.serial_number)
  const so = txt(d.sistema_operativo)
  const morral = txt(d.accesorios) !== '-' ? txt(d.accesorios) : '-'
  const ip = txt(d.ip_consola) !== '-' ? txt(d.ip_consola) : txt(d.ip_ultimo_reporte)
  const placa = txt(d.placa_equipo)
  const ordenServicioValor = ordenExplicit || (placa !== '-' ? placa : '')
  const contrato = txt(d.tipo_contrato).toUpperCase()
  const ram = fmtGb(d.capacidad_ram)
  const disco = fmtGb(d.capacidad_disco)

  const nombreUsuario = txt(usuarioDetalle?.nombre)
  const documentoU = txt(usuarioDetalle?.documento)
  const sedeU = txt(usuarioDetalle?.sede)
  const ubicacion =
    txt(usuarioDetalle?.vp_funcional) !== '-'
      ? txt(usuarioDetalle?.vp_funcional)
      : txt(d.area) !== '-'
        ? txt(d.area)
        : txt(d.ubicacion)
  const dependencia = txt(usuarioDetalle?.cargo)
  const recibeDoc = documentoU
  const instala = txt(instaladorNombre, '').trim()
  const recibeNombre = nombreUsuario

  const leftNuevo: { l: string; v: string }[] = [
    { l: '* Nombre de equipo:', v: nombreEquipo },
    { l: '* Tipo:', v: tipoEq },
    { l: '* Marca PC:', v: marca },
    { l: '* Modelo PC:', v: modelo },
    { l: '* Serial Equipo:', v: serial },
    { l: '* Sistema Operativo:', v: so },
    { l: '* Morral:', v: morral },
    { l: '* Direccion IP:', v: ip },
    { l: '* Placa Inventario:', v: placa },
    { l: '* Contrato:', v: contrato },
  ]
  const rightNuevo: { l: string; v: string }[] = [
    { l: '* Memoria RAM:', v: ram },
    { l: '* Tamaño de disco:', v: disco },
    { l: '* Monitor Serial:', v: '-' },
    { l: '* Monitor Marca:', v: '-' },
    { l: '* Placa Inventario:', v: '-' },
    { l: '* Contrato:', v: '-' },
    { l: '* Modelo:', v: '-' },
  ]

  const emptyLeft = leftNuevo.map((x) => ({ l: x.l, v: '' }))
  const emptyRight = rightNuevo.map((x) => ({ l: x.l, v: '' }))

  const uNombre = nombreUsuario !== '-' ? nombreUsuario : ''
  const uDoc = documentoU !== '-' ? documentoU : ''
  const uSede = sedeU !== '-' ? sedeU : ''
  const uUb = ubicacion !== '-' ? ubicacion : ''
  const uDep = dependencia !== '-' ? dependencia : ''

  const css = `
    * { box-sizing: border-box; }
    @page { size: letter portrait; margin: 0.2in; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; color: #000; margin: 0 auto; padding: 10mm; max-width: 8.5in; background: #fff; }
    .acta-toolbar { position: sticky; top: 0; z-index: 100; background: #eef2ff; border-bottom: 2px solid #2E4FA9; padding: 10px 14px; margin: -10mm -10mm 12px -10mm; width: calc(100% + 20mm); max-width: calc(8.5in + 20mm); box-sizing: border-box; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .acta-toolbar-hint { margin: 0; font-size: 10pt; flex: 1; min-width: 200px; line-height: 1.35; }
    .acta-btn-print { background: #2E4FA9; color: #fff; border: none; padding: 10px 22px; font-size: 11pt; font-weight: bold; cursor: pointer; border-radius: 4px; font-family: inherit; }
    .acta-btn-print:hover { background: #243d82; }
    input.field-ul, input.fill-inp, input.v-inp, input.fecha-inp, input.firma-name-inp, input.cedula-inp, textarea.obs-area {
      font: inherit; color: inherit; background: transparent;
    }
    input.field-ul { width: 100%; border: none; border-bottom: 1px solid #000; min-height: 18px; padding: 0 2px 4px; border-radius: 0; }
    input.fill-inp { flex: 1; border: none; border-bottom: 1px solid #000; min-height: 20px; padding: 2px 4px 5px; min-width: 80px; }
    input.v-inp { flex: 1; border: none; border-bottom: 1px solid #000; min-height: 18px; min-width: 40px; padding: 0 2px 4px; }
    input.fecha-inp { border: none; border-bottom: 1px solid #000; width: 92px; text-align: center; padding: 0 2px; }
    textarea.obs-area { width: 100%; margin: 8px 0 0; min-height: 72px; border: 1px solid #999; padding: 10px; resize: vertical; font: inherit; }
    .firma-cedula { margin-top: 6px; font-size: 8.5pt; }
    input.firma-name-inp { width: 100%; border: none; border-bottom: 1px solid #000; text-align: center; margin-top: 6px; font: inherit; }
    input.cedula-inp { border: none; border-bottom: 1px solid #000; width: 140px; font: inherit; margin-left: 4px; }
    .outer {
      border: 2px solid #000;
      display: flex;
      flex-direction: column;
      min-height: 11in;
      width: 100%;
    }
    .acta-top { flex: 0 0 auto; display: flex; flex-direction: column; gap: 0.06in; }
    .acta-flex-gap {
      flex: 1 1 auto;
      min-height: 0.15in;
    }
    .head-table { width: 100%; border-collapse: collapse; border-bottom: 2px solid #000; }
    .head-table td { vertical-align: middle; padding: 0; border: none; }
    .logo-gft { width: 22%; background: #2E4FA9; color: #fff; text-align: center; font-weight: bold; font-size: 17pt; padding: 14px 8px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .logo-gft .sq { display: inline-block; width: 10px; height: 10px; background: #fff; margin-left: 6px; vertical-align: middle; }
    .title-cell { width: 56%; text-align: center; font-weight: bold; font-size: 11.5pt; padding: 12px 8px; line-height: 1.25; }
    .logo-cc { width: 22%; text-align: center; font-weight: bold; font-size: 10pt; padding: 8px 6px; border-left: 2px solid #000; vertical-align: middle; }
    .credicorp-brand { display: inline-flex; align-items: center; justify-content: center; gap: 5px; flex-wrap: wrap; max-width: 100%; }
    .credicorp-mark-svg { flex-shrink: 0; display: block; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .credicorp-wordmark { font-weight: bold; font-size: 10pt; letter-spacing: -0.02em; line-height: 1.1; white-space: nowrap; }
    .cc-credicorp { color: #d35400; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .cc-capital { color: #0f3d6b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .row-os { display: flex; align-items: center; border-bottom: 1px solid #000; padding: 8px 10px; gap: 10px; }
    .row-os strong { white-space: nowrap; }
    .row-tipo { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 10px; border-bottom: 1px solid #000; }
    .lbl-rad { display: inline-flex; align-items: center; gap: 4px; margin-right: 12px; cursor: pointer; }
    .lbl-rad input { width: 14px; height: 14px; margin: 0; }
    .note-ast { font-size: 9pt; padding: 7px 10px; font-style: italic; }
    .grid-user { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 12px; padding: 11px; border-bottom: 1px solid #000; font-size: 10pt; }
    .grid-user2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; padding: 11px; border-bottom: 1px solid #000; font-size: 10pt; }
    .uf { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px; }
    .uf .k { font-weight: bold; }
    .box { border: 1px solid #000; margin: 10px 0; }
    .hdr-bar { background: #e8e8e8; border-bottom: 1px solid #000; text-align: center; font-weight: bold; font-size: 11pt; padding: 8px 8px; }
    .box-inner { padding: 7px 9px 11px; }
    table.car { width: 100%; border-collapse: collapse; font-size: 9.75pt; }
    table.car td { vertical-align: bottom; padding: 6px 6px 5px; }
    table.car td.lab { font-weight: bold; width: 22%; }
    table.car td.val { width: 26%; }
    table.car td.mid { width: 2%; border-left: 1px solid #000; padding: 0; }
    .backup-row { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; padding: 10px 12px; font-weight: bold; border-bottom: 1px solid #000; }
    .lbl-chk { display: inline-flex; align-items: center; gap: 5px; cursor: pointer; font-weight: normal; }
    .lbl-chk input { width: 12px; height: 12px; margin: 0; flex-shrink: 0; }
    .apps-wrap { padding: 10px 12px; }
    .apps-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 6px 14px; align-items: start; }
    .apps-col { display: flex; flex-direction: column; gap: 6px; }
    .firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 16px 12px; font-size: 10pt; }
    .firma-blk { text-align: center; }
    .firma-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 6px; }
    .nota-box {
      flex-shrink: 0;
      border: 1px solid #000;
      margin: 0 10px 10px;
      padding: 11px 12px;
      font-size: 9pt;
      line-height: 1.45;
    }
    .page-break { break-before: page; page-break-before: always; }
    @media print {
      @page {
        size: letter portrait;
        margin: 0.17in;
      }
      html, body {
        height: auto !important;
        overflow: visible !important;
      }
      body {
        padding: 0 !important;
        margin: 0 !important;
        max-width: none !important;
        font-size: 7.35pt !important;
        line-height: 1.24 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .outer {
        display: flex !important;
        flex-direction: column !important;
        min-height: calc(11in - 0.34in) !important;
        border-width: 1.5px;
        zoom: 0.848;
      }
      .acta-top {
        flex: 0 0 auto !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 0.05in !important;
      }
      .acta-flex-gap {
        display: block !important;
        flex: 1 1 auto !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .head-table { border-bottom-width: 1.5px !important; }
      .logo-gft {
        padding: 6px 5px !important;
        font-size: 12pt !important;
      }
      .title-cell {
        font-size: 8.5pt !important;
        padding: 6px 6px !important;
        line-height: 1.18 !important;
      }
      .logo-cc { padding: 5px 5px !important; }
      .credicorp-wordmark { font-size: 8pt !important; }
      .credicorp-mark-svg {
        width: 16px !important;
        height: 15px !important;
      }
      .row-os, .row-tipo {
        padding: 4px 7px !important;
        gap: 7px !important;
      }
      .note-ast {
        font-size: 7pt !important;
        padding: 3px 7px !important;
        margin: 0 !important;
      }
      .grid-user, .grid-user2 {
        padding: 5px 7px !important;
        gap: 4px 9px !important;
        font-size: 7.5pt !important;
      }
      .box { margin: 3px 0 !important; }
      .hdr-bar {
        padding: 3px 6px !important;
        font-size: 8pt !important;
      }
      .box-inner { padding: 4px 6px 5px !important; }
      table.car { font-size: 7.25pt !important; }
      table.car td { padding: 4px 4px 3px !important; vertical-align: bottom !important; }
      input.field-ul {
        min-height: 15px !important;
        padding-bottom: 2px !important;
      }
      input.fill-inp, input.v-inp, input.fecha-inp {
        min-height: 15px !important;
        padding-bottom: 2px !important;
      }
      .backup-row {
        padding: 5px 9px !important;
        gap: 9px !important;
        font-size: 7.15pt !important;
      }
      .lbl-chk { font-size: 7pt !important; gap: 4px !important; }
      .lbl-chk input {
        width: 9px !important;
        height: 9px !important;
      }
      .apps-wrap { padding: 5px 9px 6px !important; }
      .apps-wrap > p {
        margin: 0 0 3px !important;
        font-size: 7pt !important;
      }
      .apps-grid { gap: 3px 8px !important; }
      .apps-col { gap: 3px !important; }
      .firmas {
        padding: 7px 9px !important;
        gap: 11px !important;
        font-size: 7.5pt !important;
      }
      .firma-line {
        margin-top: 16px !important;
        padding-top: 2px !important;
      }
      input.firma-name-inp {
        margin-top: 3px !important;
        min-height: 16px !important;
        padding-bottom: 2px !important;
      }
      .firma-cedula { margin-top: 3px !important; font-size: 7pt !important; }
      textarea.obs-area {
        min-height: 36px !important;
        max-height: 48px !important;
        margin-top: 3px !important;
        padding: 4px 5px !important;
      }
      .nota-box {
        flex-shrink: 0 !important;
        margin: 0 5px 0 !important;
        padding: 4px 6px !important;
        font-size: 6.85pt !important;
        line-height: 1.22 !important;
      }
      input.cedula-inp { min-height: 14px !important; padding-bottom: 2px !important; }
      .no-print { display: none !important; }
      input, textarea { outline: none !important; box-shadow: none !important; }
      .acta-toolbar { display: none !important; }
    }
  `

  const toolbarBlock = `<div class="acta-toolbar no-print">
    <p class="acta-toolbar-hint">Revise el acta, marque lo instalado y corrija datos si hace falta. Al imprimir use <strong>Carta / Letter</strong>, márgenes mínimos si hace falta y active <strong>Gráficos de fondo</strong> para ver GFT y Credicorp en color. Luego <strong>Guardar como PDF</strong> si lo desea.</p>
    <button type="button" class="acta-btn-print" onclick="window.print()">Imprimir / PDF</button>
  </div>`

  const footNote = `<p class="no-print" style="font-size:7pt;color:#555;margin-top:10px;">
    Use el botón <strong>Imprimir / PDF</strong> arriba cuando el acta esté listo.
  </p>`

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Formato alistamiento y entrega de equipos</title>
  <style>${css}</style>
</head>
<body>
  ${toolbarBlock}
  <div class="outer">
    <div class="acta-top">
    <table class="head-table">
      <tr>
        <td class="logo-gft">GFT <span class="sq"></span></td>
        <td class="title-cell">FORMATO DE ALISTAMIENTO Y ENTREGA DE EQUIPOS</td>
        <td class="logo-cc">
          <div class="credicorp-brand">
            <svg class="credicorp-mark-svg" width="20" height="18" viewBox="0 0 20 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <polygon points="10,1 18,16 2,16" fill="#0f2940"/>
              <polygon points="12,11 18,16 6,16" fill="#c4122e"/>
            </svg>
            <span class="credicorp-wordmark"><span class="cc-credicorp">Credicorp</span><span class="cc-capital">Capital</span></span>
          </div>
        </td>
      </tr>
    </table>

    <div class="row-os">
      <strong>Orden de Servicio No.</strong>
      <input type="text" class="fill-inp" name="orden_servicio" value="${escAttr(ordenServicioValor)}" />
    </div>

    <div class="row-tipo">
      <span><strong>Tipo:</strong></span>
      ${radioTipo('nueva_instalacion', tipoSel)}
      ${radioTipo('formateo', tipoSel)}
      ${radioTipo('cambio', tipoSel)}
      <span style="margin-left:auto;display:inline-flex;align-items:center;gap:4px;"><strong>Fecha:</strong> <input type="text" class="fecha-inp" name="fecha_acta" value="${escAttr(fechaColombia())}" /></span>
    </div>

    <p class="note-ast">* Los campos con asterisco * son obligatorios, este checklist debe ser diligenciado en todos los casos de alistamiento y/o formateo de equipos</p>

    <div class="grid-user">
      <div class="uf"><span class="k">* Nombre Usuario</span><input type="text" class="v-inp" name="u_nombre" value="${escAttr(uNombre)}" /></div>
      <div class="uf"><span class="k">* Documento</span><input type="text" class="v-inp" name="u_documento" value="${escAttr(uDoc)}" /></div>
      <div class="uf"><span class="k">* Sede</span><input type="text" class="v-inp" name="u_sede" value="${escAttr(uSede)}" /></div>
    </div>
    <div class="grid-user2">
      <div class="uf"><span class="k">* Ubicación</span><input type="text" class="v-inp" name="u_ubicacion" value="${escAttr(uUb)}" /></div>
      <div class="uf"><span class="k">* Dependencia / Área</span><input type="text" class="v-inp" name="u_dependencia" value="${escAttr(uDep)}" /></div>
    </div>

    ${twoColTable('CARACTERISTICAS (EQUIPO NUEVO)', leftNuevo, rightNuevo)}

    <div class="box">
      <div class="hdr-bar">BackUP Datos</div>
      <div class="backup-row">
        ${chkLine('Descargas', 'bk_descargas')}
        ${chkLine('Documentos', 'bk_documentos')}
        ${chkLine('Escritorio', 'bk_escritorio')}
        ${chkLine('D:', 'bk_d')}
        ${chkLine('Favoritos', 'bk_favoritos')}
      </div>
    </div>

    <div class="box">
      <div class="hdr-bar">APLICACIONES CORPORATIVAS INSTALADAS</div>
      <div class="apps-wrap">
        <p style="margin:0 0 6px;font-size:8.5pt;">Marque con ✓ lo que se instaló en el equipo:</p>
        <div class="apps-grid">${appsGridHtml()}</div>
      </div>
    </div>

    ${twoColTable('CARACTERISTICAS (EQUIPO ANTIGUO)', emptyLeft, emptyRight)}

    <div class="box">
      <div class="box-inner">
        <p style="margin:0;font-weight:bold;">Observaciones de equipo asignado:</p>
        <textarea class="obs-area" name="observaciones" rows="2" placeholder=" "></textarea>
      </div>
    </div>

    <div class="firmas">
      <div class="firma-blk">
        <div style="text-align:left;font-weight:bold;">Instalado Por:</div>
        <input type="text" class="firma-name-inp" name="instalador" value="${escAttr(instala)}" />
        <div class="firma-line"></div>
      </div>
      <div class="firma-blk">
        <div style="text-align:left;font-weight:bold;">Recibido Por: (usuario)</div>
        <input type="text" class="firma-name-inp" name="recibe_nombre" value="${escAttr(recibeNombre !== '-' ? recibeNombre : '')}" />
        <div class="firma-line"></div>
        <div class="firma-cedula"><strong>Número de cédula:</strong> <input type="text" class="cedula-inp" name="recibe_cedula" value="${escAttr(recibeDoc !== '-' ? recibeDoc : '')}" /></div>
      </div>
    </div>
    </div>

    <div class="acta-flex-gap" aria-hidden="true"></div>

    <div class="nota-box">${esc(NOTA_RECEPCION)}</div>
  </div>

  ${footNote}
</body>
</html>`
}

/** Inserta script para abrir el cuadro de impresión al cargar (solo al abrir el acta en pestaña nueva desde la app). */
function htmlConImpresionAlCargar(html: string): string {
  const s =
    '<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},200);});<\/script>'
  return html.replace('</body>', `${s}</body>`)
}

/** Guarda el acta como .html (con barra Imprimir). */
export function descargarActaHtmlArchivo(data: ActaEntregaPayload): void {
  if (typeof window === 'undefined') return
  const html = buildActaHtml(data)
  const placaFn = safeFilenamePart(txt(data.device.placa_equipo) !== '-' ? txt(data.device.placa_equipo) : txt(data.device.nombre_equipo))
  const usrFn = safeFilenamePart(data.usuarioRed || txt(data.usuarioDetalle?.usuario))
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Alistamiento_entrega_${placaFn}_${usrFn}.html`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** Abre el acta en una pestaña nueva y dispara la impresión al cargar. */
export function descargarActaEntregaEquipoPdf(data: ActaEntregaPayload): boolean {
  if (typeof window === 'undefined') return false

  const html = htmlConImpresionAlCargar(buildActaHtml(data))
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const w = window.open(url, '_blank', 'noopener,noreferrer')
  if (w) {
    window.setTimeout(() => URL.revokeObjectURL(url), 300_000)
    return true
  }

  URL.revokeObjectURL(url)
  descargarActaHtmlArchivo(data)
  return true
}
