from services import create_movement
from models import MovementType

try:
    movement = create_movement(
        device_id=1,
        movement_type=MovementType.RETURN,
        notes="Devolución del equipo"
    )

    print("Movimiento creado:", movement.type)

except Exception as e:
    print("Error:", e)
