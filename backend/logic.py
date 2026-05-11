from sqlalchemy import desc
from database import SessionLocal
from models import Movement, MovementType

def get_device_status(device_id: int):
    db = SessionLocal()

    last_movement = (
        db.query(Movement)
        .filter(Movement.device_id == device_id)
        .order_by(desc(Movement.created_at))
        .first()
    )

    if not last_movement:
        return "SIN_MOVIMIENTOS"

    if last_movement.type == MovementType.INCOME:
        return "DISPONIBLE"

    if last_movement.type in [MovementType.ASSIGN, MovementType.REASSIGN]:
        return "ASIGNADO"

    if last_movement.type == MovementType.RETURN:
        return "DISPONIBLE"

    if last_movement.type == MovementType.RETIRE:
        return "RETIRADO"

    return "DESCONOCIDO"
