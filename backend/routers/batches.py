from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from dependencies import require_inventory_editor
from models import DeviceBatch, Device, DeviceTemplate, MovementType
from services import append_inventory_trace, trace_nota_ingreso_panel
from datetime import datetime
from schemas import BatchCreate

# ✅ Router definido antes de usarlo
router = APIRouter(
    prefix="/batches",
    tags=["Device Batches"]
)


@router.post("/create")
def create_batch(
    data: BatchCreate,
    db: Session = Depends(get_db),
    auth=Depends(require_inventory_editor),
):

    template = db.query(DeviceTemplate).filter(
        DeviceTemplate.id == data.template_id
    ).first()

    if not template:
        raise HTTPException(
            status_code=404,
            detail="Template not found"
        )

    batch = DeviceBatch(
        proveedor=data.proveedor,
        orden_instalacion=data.orden_instalacion,
        numero_pedido=data.numero_pedido,
        contrato=data.contrato,
        fecha_ingreso=datetime.strptime(
            data.fecha_ingreso, "%Y-%m-%d"
        ),
        template_id=data.template_id,
        ciudad=data.ciudad.upper(),
        sede=data.sede
    )

    db.add(batch)
    db.commit()
    db.refresh(batch)

    dispositivos_creados = 0

    for ml in data.codigos_ml:

        ml_clean = ml.strip()

        if not ml_clean:
            continue

        new_device = Device(
            placa_equipo=ml_clean,
            descripcion_ingreso=template.nombre_modelo,
            accesorios=data.accesorios,
            tipo_contrato=data.contrato,
            marca=template.marca,
            modelo=template.modelo,
            sistema_operativo=template.sistema_operativo,
            tipo_procesador=template.tipo_procesador,
            capacidad_ram=template.capacidad_ram,
            tipo_ram=template.tipo_ram,
            tipo_disco=template.tipo_disco,
            capacidad_disco=template.capacidad_disco,
            ciudad=data.ciudad.upper(),
            sede=data.sede,
            batch_id=batch.id
        )

        db.add(new_device)
        db.flush()
        append_inventory_trace(
            db,
            new_device.id,
            MovementType.INCOME,
            trace_nota_ingreso_panel(
                f"Ingreso por lote de proveedor (ID lote: {batch.id}).",
                ml_clean,
                auth.display_name,
                auth.email,
            ),
            auth.email,
            auth.display_name,
            include_operator_footer=False,
        )
        dispositivos_creados += 1

    db.commit()

    return {
        "status": "batch_created",
        "batch_id": batch.id,
        "devices_created": dispositivos_creados
    }