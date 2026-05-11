from fastapi import APIRouter, Depends, HTTPException, Query

from dependencies import require_inventory_editor
from sqlalchemy import desc, text
from sqlalchemy.orm import Session

from database import get_db
from models import Device, Movement, MovementType
from datetime_iso import format_as_utc_z_iso
from services import create_movement, fetch_movement_history_dicts
from schemas import MovementCreate, MovementType as ApiMovementType

router = APIRouter(prefix="/movements", tags=["Movements"])


def _fetch_feed_sql(db: Session, limit: int, with_actors: bool) -> list[dict]:
    base_cols = (
        "m.id, m.device_id, m.type, m.notes, m.from_user_id, m.to_user_id, m.created_at, "
        "d.placa_equipo, d.sede, d.usuario_asignado, d.estado"
    )
    actor_cols = ", m.actor_email, m.actor_display_name" if with_actors else ""
    sql = (
        f"SELECT {base_cols}{actor_cols} FROM movements m "
        "JOIN devices d ON d.id = m.device_id "
        "ORDER BY m.created_at DESC LIMIT :lim"
    )
    r = db.execute(text(sql), {"lim": limit})
    out = []
    for row in r:
        mp = dict(row._mapping)
        ca = mp["created_at"]
        item = {
            "id": mp["id"],
            "device_id": mp["device_id"],
            "type": str(mp["type"]),
            "notes": mp["notes"],
            "from_user_id": mp["from_user_id"],
            "to_user_id": mp["to_user_id"],
            "created_at": format_as_utc_z_iso(ca) if ca else None,
            "placa_equipo": mp["placa_equipo"],
            "sede": mp["sede"],
            "usuario_asignado": mp["usuario_asignado"],
            "estado": mp["estado"],
        }
        if with_actors:
            item["actor_email"] = mp.get("actor_email")
            item["actor_display_name"] = mp.get("actor_display_name")
        else:
            item["actor_email"] = None
            item["actor_display_name"] = None
        out.append(item)
    return out


@router.get("/feed")
def list_movement_feed(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Últimos movimientos con datos del equipo (placa, sede) para dashboard."""
    try:
        rows = (
            db.query(Movement, Device)
            .join(Device, Movement.device_id == Device.id)
            .order_by(desc(Movement.created_at))
            .limit(limit)
            .all()
        )
        out = []
        for m, d in rows:
            out.append(
                {
                    "id": m.id,
                    "device_id": m.device_id,
                    "type": m.type.value if hasattr(m.type, "value") else str(m.type),
                    "notes": m.notes,
                    "from_user_id": m.from_user_id,
                    "to_user_id": m.to_user_id,
                    "created_at": format_as_utc_z_iso(m.created_at) if m.created_at else None,
                    "placa_equipo": d.placa_equipo,
                    "sede": d.sede,
                    "usuario_asignado": d.usuario_asignado,
                    "estado": d.estado,
                    "actor_email": m.actor_email,
                    "actor_display_name": m.actor_display_name,
                }
            )
        return out
    except Exception:
        db.rollback()
        try:
            return _fetch_feed_sql(db, limit, True)
        except Exception:
            db.rollback()
            return _fetch_feed_sql(db, limit, False)


@router.get("/by-device/{device_id}")
def list_movements_by_device(device_id: int, db: Session = Depends(get_db)):
    """Historial de trazas de un equipo (cronológico, más antiguo primero). Consulta / inventario."""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    return fetch_movement_history_dicts(db, device_id)


def _api_type_to_db(api: ApiMovementType) -> MovementType:
    """API usa ASSIGN/RETURN/CHANGE; BD usa REASSIGN para cambios de titular."""
    if api == ApiMovementType.change:
        return MovementType.REASSIGN
    return MovementType(api.value)


@router.post("/")
def create_new_movement(
    movement: MovementCreate,
    auth=Depends(require_inventory_editor),
):

    movement_type = _api_type_to_db(movement.type)

    new_movement = create_movement(
        device_id=movement.device_id,
        movement_type=movement_type,
        from_user_id=movement.from_user_id,
        to_user_id=movement.to_user_id,
        notes=movement.notes,
        actor_email=auth.email,
        actor_display_name=auth.display_name,
    )

    return {
        "id": new_movement.id,
        "type": new_movement.type,
    }
