from database import SessionLocal
from models import Movement, MovementType
from services import validate_movement

db = SessionLocal()

validate_movement(1, MovementType.ASSIGN)

movement = Movement(
    device_id=1,
    type=MovementType.ASSIGN,
    to_user_id=1,
    notes="Entrega inicial a Milton"
)

db.add(movement)
db.commit()

print("Equipo asignado correctamente 🚀")
