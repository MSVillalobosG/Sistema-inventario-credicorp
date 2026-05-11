# =========================================================
# IMPORTS
# =========================================================

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import List

from database import get_db
from dependencies import require_inventory_editor
from models import Device, DeviceTemplate, DeviceBatch, Movement, MovementType, User
from services import (
    append_inventory_trace,
    fetch_movement_history_dicts,
    trace_nota_actualizacion_admin,
    trace_nota_asignacion,
    trace_nota_baja_equipo,
    trace_nota_cambio_equipo,
    trace_nota_devolucion_reasignacion,
    trace_nota_envio_reparacion,
    trace_nota_ingreso_agente,
    trace_nota_ingreso_panel,
)
from schemas import (
    DeviceCreate,
    DeviceResponse,
    DeviceUpdate,
    MovementResponse,
    DeviceBatchCreate,
    DeviceBatchResult
)

def _nombre_usuario_inventario(
    db: Session,
    usuario_red: str | None,
    correo: str | None = None,
) -> str | None:
    """Nombre en maestro `users` por `usuario` o, si no hay match, por `email`."""
    if usuario_red and str(usuario_red).strip():
        u = usuario_red.strip()
        row = (
            db.query(User.nombre)
            .filter(func.lower(User.usuario) == func.lower(u))
            .first()
        )
        if row:
            return row[0]
    if correo and str(correo).strip():
        e = correo.strip().lower()
        row = (
            db.query(User.nombre)
            .filter(func.lower(User.email) == e)
            .first()
        )
        if row:
            return row[0]
    return None


def _resolver_nombre_para_asignacion(
    db: Session,
    usuario_red: str,
    nombre_param: str | None,
) -> str | None:
    """Prioridad: nombre enviado al asignar → maestro users."""
    if nombre_param and str(nombre_param).strip():
        return nombre_param.strip()
    return _nombre_usuario_inventario(db, usuario_red)


# =========================================================
# ROUTER
# =========================================================

router = APIRouter(prefix="/devices", tags=["Devices"])

_DEVICE_PATCH_COLUMNS = {c.key for c in Device.__table__.columns} - {"id"}


def _norm_placa(placa: str | None) -> str:
    return (placa or "").strip()


def _placa_eq_col(placa_raw: str):
    """Filtro SQLAlchemy: placa coincide ignorando mayúsculas y espacios laterales."""
    p = _norm_placa(placa_raw)
    if not p:
        return None
    return func.lower(Device.placa_equipo) == func.lower(p)


# =========================================================
# 🔹 GET ALL DEVICES
# =========================================================

@router.get("/", response_model=List[DeviceResponse])
def get_devices(ciudad: str | None = None, db: Session = Depends(get_db)):

    query = db.query(Device)

    if ciudad:
        query = query.filter(func.lower(Device.ciudad) == ciudad.lower())

    return query.all()


# =========================================================
# 🔹 CIUDADES/DESDE SEDE DISPONIBLES (para filtros en dashboard)
# =========================================================

@router.get("/cities", response_model=List[str])
def get_device_cities(db: Session = Depends(get_db)):
    rows = (
        db.query(Device.sede)
        .filter(Device.sede != None)
        .distinct()
        .order_by(Device.sede.asc())
        .all()
    )
    return [r[0] for r in rows if r and r[0]]


# =========================================================
# 🔹 EQUIPOS DISPONIBLES (SIN ASIGNAR) POR CIUDAD
# =========================================================

@router.get("/available", response_model=List[DeviceResponse])
def get_available_devices(
    ciudad: str | None = None,
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    query = db.query(Device).filter(Device.usuario_asignado == None)
    if ciudad:
        # En la UI se filtra por "ciudad" usando los mismos valores que vienen en `sede`.
        query = query.filter(func.lower(func.trim(Device.sede)) == ciudad.lower())
    return query.order_by(Device.id.desc()).limit(limit).all()


# =========================================================
# 🔹 CREATE DEVICE MANUAL
# =========================================================

@router.post("/", response_model=DeviceResponse)
def create_device(
    device: DeviceCreate,
    db: Session = Depends(get_db),
    auth=Depends(require_inventory_editor),
):

    new_device = Device(**device.dict())

    # Normalizar ciudad
    if device.ciudad:
        new_device.ciudad = device.ciudad.upper()

    # Estado inicial del equipo
    new_device.estado = "EN_BODEGA"
    new_device.origen = "NUEVO"
    new_device.usuario_asignado = None

    db.add(new_device)
    db.flush()
    append_inventory_trace(
        db,
        new_device.id,
        MovementType.INCOME,
        trace_nota_ingreso_panel(
            "Alta manual desde el panel.",
            new_device.placa_equipo or "—",
            auth.display_name,
            auth.email,
        ),
        auth.email,
        auth.display_name,
        include_operator_footer=False,
    )
    db.commit()
    db.refresh(new_device)

    return new_device


# =========================================================
# 🔹 AGENT SYNC
# =========================================================

@router.post("/sync")
def sync_device(device: DeviceCreate, request: Request, db: Session = Depends(get_db)):

    existing_device = db.query(Device).filter(
        Device.serial_number == device.serial_number
    ).first()

    client_ip = request.client.host

    if existing_device:

        skip_sync = {
            "placa_equipo",
            "tipo_contrato",
            "ciudad",
            "sede",
            "nombre_usuario_asignado",
            "usuario_asignado",
            "estado",
            "origen",
        }
        for key, value in device.dict().items():
            if key not in skip_sync:
                setattr(existing_device, key, value)

        existing_device.fecha_ultimo_reporte = datetime.utcnow()
        existing_device.ip_ultimo_reporte = client_ip

        db.commit()
        db.refresh(existing_device)

        return {"status": "updated", "device_id": existing_device.id}

    else:

        new_device = Device(**device.dict())

        new_device.placa_equipo = None
        new_device.tipo_contrato = None
        new_device.ciudad = None
        new_device.sede = None

        new_device.estado = "EN_BODEGA"

        new_device.fecha_ultimo_reporte = datetime.utcnow()
        new_device.ip_ultimo_reporte = client_ip

        db.add(new_device)
        db.flush()
        append_inventory_trace(
            db,
            new_device.id,
            MovementType.INCOME,
            trace_nota_ingreso_agente(client_ip or "—"),
            None,
            None,
            include_operator_footer=False,
        )
        db.commit()
        db.refresh(new_device)

        return {"status": "created", "device_id": new_device.id}


# =========================================================
# 🔹 ASIGNAR POR ID
# =========================================================

@router.put("/{device_id}/assign")
def assign_device(
    device_id: int,
    usuario: str,
    nombre: str | None = Query(None, max_length=300),
    db: Session = Depends(get_db),
    auth=Depends(require_inventory_editor),
):

    device = db.query(Device).filter(Device.id == device_id).first()

    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    if device.usuario_asignado:
        raise HTTPException(status_code=400, detail="Device already assigned")

    u = usuario.strip()
    nom = _resolver_nombre_para_asignacion(db, u, nombre)
    device.usuario_asignado = u
    device.nombre_usuario_asignado = nom
    device.estado = "ASIGNADO"

    append_inventory_trace(
        db,
        device.id,
        MovementType.ASSIGN,
        trace_nota_asignacion(
            device.placa_equipo or "—",
            u,
            auth.display_name,
            auth.email,
            nombre_completo=nom,
        ),
        auth.email,
        auth.display_name,
        include_operator_footer=False,
    )
    db.commit()
    db.refresh(device)

    return {
        "status": "assigned",
        "device_id": device.id,
        "usuario_asignado": device.usuario_asignado
    }


# =========================================================
# 🔹 BUSCAR POR SERIAL
# =========================================================

@router.get("/by-serial/{serial}", response_model=DeviceResponse)
def get_device_by_serial(serial: str, db: Session = Depends(get_db)):

    device = db.query(Device).filter(Device.serial_number == serial).first()

    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    return device


# =========================================================
# 🔍 CONSULTA GENERAL POR PLACA
# =========================================================

@router.get("/by-placa/{placa}/movements")
def get_movement_history_by_placa(placa: str, db: Session = Depends(get_db)):
    """Historial de trazas por placa (misma API base que consulta de equipos)."""
    clause = _placa_eq_col(placa)
    if clause is None:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    device = db.query(Device).filter(clause).first()
    if not device:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    return fetch_movement_history_dicts(db, device.id)


@router.get("/by-placa/{placa}", response_model=DeviceResponse)
def get_device_by_placa(placa: str, db: Session = Depends(get_db)):
    clause = _placa_eq_col(placa)
    if clause is None:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    device = db.query(Device).filter(clause).first()

    if not device:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    base = DeviceResponse.model_validate(device)
    stored = (device.nombre_usuario_asignado or "").strip()
    nombre = stored or _nombre_usuario_inventario(
        db, device.usuario_asignado, device.correo_usuario
    )
    nom_resp = _nombre_usuario_inventario(db, device.usuario_responsable)
    return base.model_copy(
        update={
            "nombre_usuario_asignado": nombre,
            "nombre_usuario_responsable": nom_resp,
        }
    )


# =========================================================
# 🔹 CREAR DESDE PLANTILLA
# =========================================================

@router.post("/create-from-template/{template_id}")
def create_from_template(
    template_id: int,
    placa_equipo: str,
    tipo_contrato: str,
    serial_number: str,
    ciudad: str,
    sede: str,
    db: Session = Depends(get_db),
    auth=Depends(require_inventory_editor),
):

    template = db.query(DeviceTemplate).filter(
        DeviceTemplate.id == template_id
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    pnew = _norm_placa(placa_equipo)
    existe = db.query(Device).filter(func.lower(Device.placa_equipo) == func.lower(pnew)).first() if pnew else None

    if existe:
        raise HTTPException(status_code=400, detail="Placa ya existe")

    new_device = Device(
        placa_equipo=pnew or placa_equipo,
        tipo_contrato=tipo_contrato,
        serial_number=serial_number,
        marca=template.marca,
        modelo=template.modelo,
        sistema_operativo=template.sistema_operativo,
        tipo_procesador=template.tipo_procesador,
        capacidad_ram=str(template.capacidad_ram),
        tipo_ram=template.tipo_ram,
        tipo_disco=template.tipo_disco,
        capacidad_disco=str(template.capacidad_disco),
        ciudad=ciudad.upper(),
        sede=sede,
        estado="EN_BODEGA"
    )

    db.add(new_device)
    db.flush()
    append_inventory_trace(
        db,
        new_device.id,
        MovementType.INCOME,
        trace_nota_ingreso_panel(
            "Alta desde plantilla de modelo.",
            pnew or placa_equipo or "—",
            auth.display_name,
            auth.email,
            detalle_extra=f"Serial: {serial_number}" if serial_number else None,
        ),
        auth.email,
        auth.display_name,
        include_operator_footer=False,
    )
    db.commit()
    db.refresh(new_device)

    return {"status": "created_from_template", "device_id": new_device.id}


# =========================================================
# 🔥 CREAR LOTE
# =========================================================

@router.post("/batch-create", response_model=DeviceBatchResult)
def create_batch(
    batch: DeviceBatchCreate,
    db: Session = Depends(get_db),
    auth=Depends(require_inventory_editor),
):

    template = db.query(DeviceTemplate).filter(
        DeviceTemplate.id == batch.template_id
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    placas_limpias = list(set([p.strip() for p in batch.placas if p.strip()]))

    new_batch = DeviceBatch(
        proveedor=batch.proveedor,
        orden_instalacion=batch.orden_instalacion,
        numero_pedido=batch.numero_pedido,
        contrato=batch.contrato,
        fecha_ingreso=batch.fecha_ingreso,
        template_id=batch.template_id,
        ciudad=batch.ciudad,
        sede=batch.sede,
        cantidad=len(placas_limpias)
    )

    db.add(new_batch)
    db.commit()
    db.refresh(new_batch)

    creados = 0
    duplicados = []

    for placa in placas_limpias:

        pclause = _placa_eq_col(placa)
        existe = db.query(Device).filter(pclause).first() if pclause is not None else None

        if existe:
            duplicados.append(placa)
            continue

        nuevo_device = Device(
            placa_equipo=_norm_placa(placa) or placa,
            tipo_contrato=batch.contrato,
            ciudad=batch.ciudad,
            sede=batch.sede,
            marca=template.marca,
            modelo=template.modelo,
            sistema_operativo=template.sistema_operativo,
            tipo_procesador=template.tipo_procesador,
            capacidad_ram=str(template.capacidad_ram),
            tipo_ram=template.tipo_ram,
            tipo_disco=template.tipo_disco,
            capacidad_disco=str(template.capacidad_disco),
            batch_id=new_batch.id,
            estado="EN_BODEGA"
        )

        db.add(nuevo_device)
        db.flush()
        append_inventory_trace(
            db,
            nuevo_device.id,
            MovementType.INCOME,
            trace_nota_ingreso_panel(
                f"Ingreso por lote (ID lote: {new_batch.id}).",
                _norm_placa(placa) or placa,
                auth.display_name,
                auth.email,
            ),
            auth.email,
            auth.display_name,
            include_operator_footer=False,
        )
        creados += 1

    db.commit()

    return {
        "batch_id": new_batch.id,
        "total_enviados": len(placas_limpias),
        "creados": creados,
        "duplicados": duplicados
    }


# =========================================================
# 🔍 BUSCAR EQUIPO DISPONIBLE POR PLACA
# =========================================================

@router.get("/available-by-placa/{placa}")
def get_available_device_by_placa(
    placa: str,
    ciudad: str | None = None,
    db: Session = Depends(get_db),
):
    clause = _placa_eq_col(placa)
    if clause is None:
        raise HTTPException(
            status_code=404,
            detail="Equipo no disponible o no existe",
        )

    q = db.query(Device).filter(
        clause,
        Device.usuario_asignado == None
    )
    if ciudad:
        q = q.filter(func.lower(func.trim(Device.sede)) == ciudad.lower())

    device = q.first()

    if not device:
        raise HTTPException(
            status_code=404,
            detail="Equipo no disponible o no existe"
        )

    return device


# =========================================================
# 🔹 ASIGNAR POR PLACA
# =========================================================

@router.put("/assign-by-placa")
def assign_by_placa(
    placa: str,
    usuario: str,
    nombre: str | None = Query(
        None,
        max_length=300,
        description="Nombre completo del usuario (p. ej. del maestro al elegir en el panel)",
    ),
    db: Session = Depends(get_db),
    auth=Depends(require_inventory_editor),
):
    clause = _placa_eq_col(placa)
    if clause is None:
        raise HTTPException(status_code=404, detail="Equipo no disponible")

    device = db.query(Device).filter(
        clause,
        Device.usuario_asignado == None
    ).first()

    if not device:
        raise HTTPException(
            status_code=404,
            detail="Equipo no disponible"
        )

    u = usuario.strip()
    nom = _resolver_nombre_para_asignacion(db, u, nombre)
    device.usuario_asignado = u
    device.nombre_usuario_asignado = nom
    device.estado = "ASIGNADO"

    append_inventory_trace(
        db,
        device.id,
        MovementType.ASSIGN,
        trace_nota_asignacion(
            device.placa_equipo or "—",
            u,
            auth.display_name,
            auth.email,
            nombre_completo=nom,
        ),
        auth.email,
        auth.display_name,
        include_operator_footer=False,
    )
    db.commit()
    db.refresh(device)

    return {"message": "Equipo asignado correctamente"}


# =========================================================
# 🔍 BUSCAR EQUIPO ASIGNADO
# =========================================================

@router.get("/assigned-by-placa/{placa}")
def get_assigned_device_by_placa(placa: str, db: Session = Depends(get_db)):
    clause = _placa_eq_col(placa)
    if clause is None:
        raise HTTPException(
            status_code=404,
            detail="Equipo no encontrado o no está asignado",
        )

    device = db.query(Device).filter(
        clause,
        Device.usuario_asignado != None
    ).first()

    if not device:
        solo = db.query(Device).filter(clause).first()
        if solo is not None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "El equipo existe pero no tiene usuario asignado. "
                    "En cambio de equipo, la placa del equipo actual debe ser de un equipo ya asignado."
                ),
            )
        raise HTTPException(
            status_code=404,
            detail="No hay ningún equipo con esa placa",
        )

    return device


# =========================================================
# 🔄 DEVOLUCIÓN
# =========================================================

@router.put("/return-device")
def return_device(
    placa: str,
    accion: str,
    db: Session = Depends(get_db),
    auth=Depends(require_inventory_editor),
):

    clause = _placa_eq_col(placa)
    if clause is None:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    device = db.query(Device).filter(clause).first()

    if not device:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    if accion not in ("REASIGNAR", "REPARACION", "BAJA"):
        raise HTTPException(
            status_code=400,
            detail="accion debe ser REASIGNAR, REPARACION o BAJA",
        )

    # guardar usuario de procedencia (si existía) antes de limpiar asignación
    prev_user = device.usuario_asignado
    if prev_user and not device.usuario_responsable:
        device.usuario_responsable = prev_user

    # Para traza: en CAMBIO_PENDIENTE suele no haber asignado actual pero sí usuario_responsable
    ref_usuario_inv = prev_user or device.usuario_responsable

    device.usuario_asignado = None
    device.nombre_usuario_asignado = None

    if accion == "REASIGNAR":
        # Equipo vuelve a bodega disponible para asignar,
        # conservando que vino por devolución para trazabilidad
        device.estado = "EN_BODEGA"
        device.origen = "DEVOLUCION"

    elif accion == "REPARACION":
        device.estado = "EN_REPARACION"
        device.origen = "REPARACION"

    elif accion == "BAJA":
        device.estado = "DE_BAJA"
        device.origen = "BAJA"

    placa_tr = device.placa_equipo or "—"
    ref_txt = ref_usuario_inv or "N/A"

    if accion == "BAJA":
        trace_type = MovementType.RETIRE
        trace_note = trace_nota_baja_equipo(
            placa_tr,
            ref_txt,
            auth.display_name,
            auth.email,
        )
    elif accion == "REASIGNAR":
        trace_type = MovementType.RETURN
        trace_note = trace_nota_devolucion_reasignacion(
            placa_tr,
            ref_txt,
            auth.display_name,
            auth.email,
        )
    else:
        trace_type = MovementType.RETURN
        trace_note = trace_nota_envio_reparacion(
            placa_tr,
            ref_txt,
            auth.display_name,
            auth.email,
        )

    append_inventory_trace(
        db,
        device.id,
        trace_type,
        trace_note,
        auth.email,
        auth.display_name,
        include_operator_footer=False,
    )
    db.commit()
    db.refresh(device)

    return {
        "message": "Devolución procesada correctamente",
        "estado": device.estado,
        "origen": device.origen
    }


# =========================================================
# 🔄 CAMBIO DE EQUIPO
# =========================================================

@router.put("/change")
def change_device(
    old_device_id: int,
    new_device_id: int,
    db: Session = Depends(get_db),
    auth=Depends(require_inventory_editor),
):

    old_device = db.query(Device).filter(Device.id == old_device_id).first()
    new_device = db.query(Device).filter(Device.id == new_device_id).first()

    if not old_device or not new_device:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    usuario = old_device.usuario_asignado

    if not usuario:
        raise HTTPException(status_code=400, detail="El equipo no tiene usuario asignado")

    nom = (old_device.nombre_usuario_asignado or "").strip() or _nombre_usuario_inventario(
        db, usuario, old_device.correo_usuario
    )

    # equipo viejo queda pendiente
    # guardar siempre a quién se le cambió (trazabilidad)
    old_device.usuario_responsable = usuario
    old_device.usuario_asignado = None
    old_device.nombre_usuario_asignado = None
    old_device.estado = "CAMBIO_PENDIENTE"
    old_device.origen = "DEVOLUCION"

    # equipo nuevo se asigna al usuario
    new_device.usuario_asignado = usuario
    new_device.nombre_usuario_asignado = nom
    new_device.estado = "ASIGNADO"

    placa_old = old_device.placa_equipo or "sin placa"
    placa_new = new_device.placa_equipo or "sin placa"
    trace_old = trace_nota_cambio_equipo(
        placa_old,
        placa_new,
        usuario,
        auth.display_name,
        auth.email,
        nombre_completo=nom or None,
    )
    trace_new = trace_nota_cambio_equipo(
        placa_old,
        placa_new,
        usuario,
        auth.display_name,
        auth.email,
        nombre_completo=nom or None,
    )

    append_inventory_trace(
        db,
        old_device.id,
        MovementType.REASSIGN,
        trace_old,
        auth.email,
        auth.display_name,
        include_operator_footer=False,
    )
    append_inventory_trace(
        db,
        new_device.id,
        MovementType.ASSIGN,
        trace_new,
        auth.email,
        auth.display_name,
        include_operator_footer=False,
    )
    db.commit()
    db.refresh(old_device)
    db.refresh(new_device)

    return {
        "message": "Cambio realizado correctamente"
    }


# =========================================================
# 🔹 ACTUALIZAR / ELIMINAR (panel administrativo)
# Rutas con prefijo `/record/{device_id}` para no colisionar con PUT `/assign-by-placa`.
# =========================================================


def _apply_device_update(
    device_id: int,
    body: DeviceUpdate,
    db: Session,
    auth,
) -> Device:
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    data = body.model_dump(exclude_unset=True)
    if not data:
        return device

    unknown = set(data.keys()) - _DEVICE_PATCH_COLUMNS
    if unknown:
        raise HTTPException(
            status_code=400,
            detail=f"Campos no reconocidos en el modelo: {', '.join(sorted(unknown))}",
        )

    if "serial_number" in data and data["serial_number"]:
        sn = str(data["serial_number"]).strip()
        other = (
            db.query(Device.id)
            .filter(Device.serial_number == sn, Device.id != device_id)
            .first()
        )
        if other:
            raise HTTPException(
                status_code=400,
                detail="Ya existe otro equipo con ese número de serial",
            )

    if "ciudad" in data:
        c = data["ciudad"]
        if c is None or (isinstance(c, str) and not str(c).strip()):
            data["ciudad"] = None
        else:
            data["ciudad"] = str(c).strip().upper()

    campos_traza = ", ".join(sorted(data.keys()))

    for k, v in data.items():
        setattr(device, k, v)

    append_inventory_trace(
        db,
        device.id,
        MovementType.REASSIGN,
        trace_nota_actualizacion_admin(
            device.placa_equipo or "—",
            campos_traza,
            auth.display_name,
            auth.email,
        ),
        auth.email,
        auth.display_name,
        include_operator_footer=False,
    )
    db.commit()
    db.refresh(device)

    return device


# Rutas con prefijo /record/ para no colisionar con PUT /assign-by-placa (path dinámico /{id}).
@router.put("/record/{device_id}", response_model=DeviceResponse)
def put_device(
    device_id: int,
    body: DeviceUpdate,
    db: Session = Depends(get_db),
    auth=Depends(require_inventory_editor),
):
    d = _apply_device_update(device_id, body, db, auth)
    return DeviceResponse.model_validate(d)


@router.patch("/record/{device_id}", response_model=DeviceResponse)
def patch_device(
    device_id: int,
    body: DeviceUpdate,
    db: Session = Depends(get_db),
    auth=Depends(require_inventory_editor),
):
    d = _apply_device_update(device_id, body, db, auth)
    return DeviceResponse.model_validate(d)


@router.delete("/record/{device_id}")
def delete_device(
    device_id: int,
    db: Session = Depends(get_db),
    auth=Depends(require_inventory_editor),
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    db.query(Movement).filter(Movement.device_id == device_id).delete()
    db.delete(device)
    db.commit()

    return {"status": "deleted", "device_id": device_id}