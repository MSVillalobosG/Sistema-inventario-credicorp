from datetime import datetime, timezone

from sqlalchemy import desc, text
from sqlalchemy.orm import Session
from database import SessionLocal
from datetime_iso import format_as_utc_z_iso
from models import Movement, MovementType


def _serialize_movement_history_row(row: dict, include_actors: bool) -> dict:
    ca = row["created_at"]
    item = {
        "id": row["id"],
        "type": str(row["type"]),
        "notes": row["notes"],
        "created_at": format_as_utc_z_iso(ca) if ca else None,
    }
    if include_actors:
        item["actor_email"] = row.get("actor_email")
        item["actor_display_name"] = row.get("actor_display_name")
    else:
        item["actor_email"] = None
        item["actor_display_name"] = None
    return item


def fetch_movement_history_dicts(db: Session, device_id: int) -> list[dict]:
    """
    Historial de movements por device_id (cronológico ascendente).
    SQL directo con reintento sin columnas actor_* si la BD aún no las tiene.
    """
    try:
        r = db.execute(
            text(
                "SELECT id, device_id, type, notes, created_at, actor_email, actor_display_name "
                "FROM movements WHERE device_id = :did ORDER BY created_at ASC"
            ),
            {"did": device_id},
        )
        return [
            _serialize_movement_history_row(dict(m), True)
            for m in r.mappings().all()
        ]
    except Exception:
        db.rollback()
        r = db.execute(
            text(
                "SELECT id, device_id, type, notes, created_at FROM movements "
                "WHERE device_id = :did ORDER BY created_at ASC"
            ),
            {"did": device_id},
        )
        return [
            _serialize_movement_history_row(dict(m), False)
            for m in r.mappings().all()
        ]

def get_last_movement(db, device_id):
    return (
        db.query(Movement)
        .filter(Movement.device_id == device_id)
        .order_by(desc(Movement.created_at))
        .first()
    )


def get_device_movements(db, device_id: int):
    return (
        db.query(Movement)
        .filter(Movement.device_id == device_id)
        .order_by(desc(Movement.created_at))
        .all()
    )


def get_device_status(db, device_id):
    last = get_last_movement(db, device_id)

    if not last:
        return "SIN_MOVIMIENTOS"

    if last.type == MovementType.INCOME:
        return "DISPONIBLE"

    if last.type in [MovementType.ASSIGN, MovementType.REASSIGN]:
        return "ASIGNADO"

    if last.type == MovementType.RETURN:
        return "DISPONIBLE"

    if last.type == MovementType.RETIRE:
        return "RETIRADO"

    return "DESCONOCIDO"


def validate_movement(db, device_id, movement_type):
    current_status = get_device_status(db, device_id)

    if current_status == "RETIRADO":
        raise Exception("El equipo está RETIRADO y no admite movimientos.")

    if movement_type == MovementType.ASSIGN:
        if current_status != "DISPONIBLE":
            raise Exception("Solo se puede asignar un equipo DISPONIBLE.")

    if movement_type == MovementType.REASSIGN:
        if current_status != "ASIGNADO":
            raise Exception("Solo se puede reasignar un equipo ASIGNADO.")

    if movement_type == MovementType.RETURN:
        if current_status != "ASIGNADO":
            raise Exception("Solo se puede devolver un equipo ASIGNADO.")

    if movement_type == MovementType.RETIRE:
        if current_status == "RETIRADO":
            raise Exception("El equipo ya está retirado.")

    return True


def format_trace_procesado_por(
    display_name: str | None,
    email: str | None,
    *,
    sistema_o_agente: str | None = None,
) -> str:
    """Línea final estándar: 'Cambio realizado por: …'"""
    if sistema_o_agente and str(sistema_o_agente).strip():
        return f"Cambio realizado por: {str(sistema_o_agente).strip()}"
    dn = (display_name or "").strip()
    em = (email or "").strip()
    if dn and em:
        return f"Cambio realizado por: {dn} ({em})"
    if dn:
        return f"Cambio realizado por: {dn}"
    if em:
        return f"Cambio realizado por: {em}"
    return "Cambio realizado por: (no identificado)"


def _linea_asignado_usuario_red(usuario_red: str, nombre_completo: str | None) -> str:
    u = (usuario_red or "").strip()
    n = (nombre_completo or "").strip()
    if n and u:
        return f"Asignado a usuario de red: {n} · {u}"
    return f"Asignado a usuario de red: {u or '—'}"


def trace_nota_asignacion(
    placa: str,
    usuario_red: str,
    display_name: str | None,
    email: str | None,
    *,
    nombre_completo: str | None = None,
) -> str:
    return (
        "Asignación\n\n"
        f"Equipo · placa: {placa}\n"
        f"{_linea_asignado_usuario_red(usuario_red, nombre_completo)}\n\n"
        f"{format_trace_procesado_por(display_name, email)}"
    )


def trace_nota_cambio_equipo(
    placa_anterior: str,
    placa_nueva: str,
    usuario_red: str,
    display_name: str | None,
    email: str | None,
    *,
    nombre_completo: str | None = None,
) -> str:
    return (
        f"Cambio de equipo: {placa_anterior} cambia a placa {placa_nueva}\n"
        f"{_linea_asignado_usuario_red(usuario_red, nombre_completo)}\n\n"
        f"{format_trace_procesado_por(display_name, email)}"
    )


def trace_nota_baja_equipo(
    placa: str,
    ref_usuario: str,
    display_name: str | None,
    email: str | None,
) -> str:
    return (
        "Baja de equipo:\n\n"
        f"Equipo · placa: {placa}\n"
        f"Usuario de referencia / titular: {ref_usuario or 'N/A'}\n\n"
        f"{format_trace_procesado_por(display_name, email)}"
    )


def trace_nota_devolucion_reasignacion(
    placa: str,
    ref_usuario: str,
    display_name: str | None,
    email: str | None,
) -> str:
    return (
        "Devolución a bodega (reasignación)\n\n"
        f"Equipo · placa: {placa}\n"
        f"Usuario de referencia / titular: {ref_usuario or 'N/A'}\n\n"
        f"{format_trace_procesado_por(display_name, email)}"
    )


def trace_nota_envio_reparacion(
    placa: str,
    ref_usuario: str,
    display_name: str | None,
    email: str | None,
) -> str:
    return (
        "Envío a reparación\n\n"
        f"Equipo · placa: {placa}\n"
        f"Usuario de referencia / titular: {ref_usuario or 'N/A'}\n\n"
        f"{format_trace_procesado_por(display_name, email)}"
    )


def trace_nota_ingreso_panel(
    motivo: str,
    placa: str,
    display_name: str | None,
    email: str | None,
    detalle_extra: str | None = None,
) -> str:
    lines = [
        "Ingreso al inventario",
        "",
        motivo.strip(),
        f"Equipo · placa: {placa or '—'}",
    ]
    if detalle_extra and detalle_extra.strip():
        lines.append(detalle_extra.strip())
    lines.append("")
    lines.append(format_trace_procesado_por(display_name, email))
    return "\n".join(lines)


def trace_nota_ingreso_agente(ip: str) -> str:
    return (
        "Ingreso al inventario\n\n"
        "Origen: sincronización automática (agente)\n"
        f"IP del reporte: {ip}\n\n"
        f"{format_trace_procesado_por(None, None, sistema_o_agente='Agente de inventario')}"
    )


def trace_nota_actualizacion_admin(
    placa: str,
    campos: str,
    display_name: str | None,
    email: str | None,
) -> str:
    """Traza de edición manual de ficha desde el panel (PATCH administrativo)."""
    return (
        "Actualización administrativa de ficha\n\n"
        f"Equipo · placa: {placa or '—'}\n"
        f"Campos modificados: {campos}\n\n"
        f"{format_trace_procesado_por(display_name, email)}"
    )


def _trace_notes_with_operator(
    summary: str | None,
    actor_email: str | None,
    actor_display_name: str | None,
) -> str | None:
    """
    Añade 'Cambio realizado por:' si el resumen aún no lo trae (p. ej. textos cortos legacy).
    """
    chunks: list[str] = []
    s = (summary or "").strip()
    if s:
        chunks.append(s)
    if "Cambio realizado por:" in (s or "") or "Proceso realizado por:" in (s or ""):
        return "\n".join(chunks) if chunks else None
    dn = (actor_display_name or "").strip()
    em = (actor_email or "").strip()
    if dn or em:
        chunks.append(format_trace_procesado_por(dn, em))
    if not chunks:
        return None
    return "\n".join(chunks)


def append_inventory_trace(
    db: Session,
    device_id: int,
    movement_type: MovementType,
    summary: str | None = None,
    actor_email: str | None = None,
    actor_display_name: str | None = None,
    *,
    include_operator_footer: bool = True,
) -> None:
    """
    Registro de trazabilidad en `movements` sin validar máquina de estados.
    Usa SQL + savepoint: si la BD no tiene columnas actor_*, reintenta sin ellas
    sin hacer rollback del resto de cambios en la misma sesión (evita 500 en PUT /return-device, etc.).
    Si include_operator_footer=False, `summary` debe llevar ya al operador (p. ej. cambio de equipo).
    """
    typ = movement_type.value
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if include_operator_footer:
        notes = _trace_notes_with_operator(summary, actor_email, actor_display_name)
    else:
        sn = (summary or "").strip()
        notes = sn if sn else None
    try:
        with db.begin_nested():
            db.execute(
                text(
                    "INSERT INTO movements (device_id, type, notes, created_at, actor_email, actor_display_name) "
                    "VALUES (:did, :typ, :notes, :ca, :ae, :adn)"
                ),
                {
                    "did": device_id,
                    "typ": typ,
                    "notes": notes,
                    "ca": now,
                    "ae": actor_email,
                    "adn": actor_display_name,
                },
            )
    except Exception:
        with db.begin_nested():
            db.execute(
                text(
                    "INSERT INTO movements (device_id, type, notes, created_at) "
                    "VALUES (:did, :typ, :notes, :ca)"
                ),
                {"did": device_id, "typ": typ, "notes": notes, "ca": now},
            )


def create_movement(
    device_id: int,
    movement_type: MovementType,
    from_user_id: int = None,
    to_user_id: int = None,
    notes: str = None,
    actor_email: str | None = None,
    actor_display_name: str | None = None,
):
    db = SessionLocal()

    try:
        validate_movement(db, device_id, movement_type)

        movement = Movement(
            device_id=device_id,
            type=movement_type.value,
            from_user_id=from_user_id,
            to_user_id=to_user_id,
            notes=notes,
            actor_email=actor_email,
            actor_display_name=actor_display_name,
        )

        db.add(movement)
        db.commit()
        db.refresh(movement)

        return movement

    except Exception as e:
        db.rollback()
        raise e

    finally:
        db.close()
