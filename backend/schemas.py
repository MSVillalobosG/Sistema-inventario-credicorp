from pydantic import BaseModel, Field, ConfigDict
from typing import Literal, Optional
from datetime import datetime
from enum import Enum
from typing import List
from datetime import date


# =========================================================
# DEVICE
# =========================================================
class MovementType(str, Enum):
    assign = "ASSIGN"
    return_device = "RETURN"
    change = "CHANGE"
    
class DeviceBase(BaseModel):
    placa_equipo: str | None = None
    estado: Optional[str] = None        # 👈 AGREGAR
    origen: Optional[str] = None 
    tipo_equipo: Optional[str] = None
    tipo_contrato: str | None = None
    serial_number: str | None = None
    nombre_equipo: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    sistema_operativo: Optional[str] = None
    tipo_procesador: Optional[str] = None

    capacidad_ram: Optional[str] = None
    tipo_ram: Optional[str] = None
    tipo_disco: Optional[str] = None
    capacidad_disco: Optional[str] = None

    mac: Optional[str] = None
    ip_consola: Optional[str] = None

    documento: Optional[str] = None
    usuario_responsable: Optional[str] = None
    # Resuelto en GET by-placa desde maestro users (mismo login que usuario_responsable)
    nombre_usuario_responsable: Optional[str] = None
    usuario_asignado: Optional[str] = None
    nombre_usuario_asignado: Optional[str] = None
    correo_usuario: Optional[str] = None

    sede: str | None = None
    ubicacion: Optional[str] = None

    vicepresidencia: Optional[str] = None
    area: Optional[str] = None

    centro_costo: Optional[str] = None
    nombre_centro_costo: Optional[str] = None

    ciudad: str | None = None

    # Reporte agente / inventario (antes no estaban en el esquema y la API los omitía)
    fecha_ultimo_reporte: Optional[datetime] = None
    ip_ultimo_reporte: Optional[str] = None

    ram_libre_gb: str | None = None
    disco_libre_gb: str | None = None
    ultimo_boot: str | None = None
    usuario_actual: str | None = None
    dominio: str | None = None
    arquitectura: str | None = None

    codigo_ml: Optional[str] = None
    descripcion_ingreso: Optional[str] = None
    accesorios: Optional[str] = None


# 🔹 Para crear dispositivo
class DeviceCreate(DeviceBase):
    pass


class DeviceUpdate(BaseModel):
    """Actualización parcial (panel). Sin `nombre_usuario_responsable` (solo respuesta calculada)."""

    model_config = ConfigDict(extra="forbid")

    placa_equipo: str | None = None
    estado: Optional[str] = None
    origen: Optional[str] = None
    tipo_equipo: Optional[str] = None
    tipo_contrato: str | None = None
    serial_number: str | None = None
    nombre_equipo: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    sistema_operativo: Optional[str] = None
    tipo_procesador: Optional[str] = None

    capacidad_ram: Optional[str] = None
    tipo_ram: Optional[str] = None
    tipo_disco: Optional[str] = None
    capacidad_disco: Optional[str] = None

    mac: Optional[str] = None
    ip_consola: Optional[str] = None

    documento: Optional[str] = None
    usuario_responsable: Optional[str] = None
    usuario_asignado: Optional[str] = None
    nombre_usuario_asignado: Optional[str] = None
    correo_usuario: Optional[str] = None

    sede: str | None = None
    ubicacion: Optional[str] = None

    vicepresidencia: Optional[str] = None
    area: Optional[str] = None

    centro_costo: Optional[str] = None
    nombre_centro_costo: Optional[str] = None

    ciudad: str | None = None

    fecha_ultimo_reporte: Optional[datetime] = None
    ip_ultimo_reporte: Optional[str] = None

    ram_libre_gb: str | None = None
    disco_libre_gb: str | None = None
    ultimo_boot: str | None = None
    usuario_actual: str | None = None
    dominio: str | None = None
    arquitectura: str | None = None

    codigo_ml: Optional[str] = None
    descripcion_ingreso: Optional[str] = None
    accesorios: Optional[str] = None

    batch_id: Optional[int] = None


# 🔹 Para devolver dispositivo en respuestas
class DeviceResponse(DeviceBase):
    id: int
    batch_id: Optional[int] = None

    class Config:
        from_attributes = True


# =========================================================
# MOVEMENT
# =========================================================

class MovementCreate(BaseModel):
    device_id: int
    type: MovementType
    from_user_id: Optional[int] = None
    to_user_id: Optional[int] = None
    notes: Optional[str] = None


class MovementResponse(BaseModel):
    id: int
    device_id: int
    type: str
    from_user_id: Optional[int] = None
    to_user_id: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# =========================================================
# nueva hoja ingreso en bodega
# =========================================================

class DeviceTemplateBase(BaseModel):
    nombre_modelo: str
    marca: str
    modelo: str
    sistema_operativo: str | None = None
    tipo_procesador: str | None = None
    capacidad_ram: int | None = None
    tipo_ram: str | None = None
    tipo_disco: str | None = None
    capacidad_disco: int | None = None


class DeviceTemplateCreate(DeviceTemplateBase):
    pass


class DeviceTemplateResponse(DeviceTemplateBase):
    id: int

    class Config:
        from_attributes = True
        
  # =========================================================
# creacion de lote
# =========================================================
 
class DeviceBatchCreate(BaseModel):
    proveedor: str
    orden_instalacion: str
    numero_pedido: str
    contrato: str
    fecha_ingreso: date
    template_id: int
    ciudad: str
    sede: str
    placas: List[str]


class DeviceBatchResult(BaseModel):
    batch_id: int
    total_enviados: int
    creados: int
    duplicados: List[str]
    
    

class BatchCreate(BaseModel):
    proveedor: str
    orden_instalacion: str
    numero_pedido: str
    contrato: str
    fecha_ingreso: str
    template_id: int
    ciudad: str
    sede: str
    codigos_ml: List[str]
    accesorios: str


# 🔹 Crear usuarios
class UserCreate(BaseModel):
    nombre: str
    email: str
    documento: str
    usuario: str
    cargo: Optional[str] = None
    sede: Optional[str] = None
    
class UserResponse(BaseModel):
    id: int
    nombre: str
    email: str
    documento: str
    usuario: str
    cargo: Optional[str]
    sede: Optional[str]

    class Config:
        from_attributes = True


DashboardRoleLiteral = Literal["super_admin", "admin", "editor", "viewer"]


class DashboardLoginBody(BaseModel):
    email: str
    password: str


class DashboardAccountCreate(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=200)
    role: DashboardRoleLiteral = "viewer"


class DashboardAccountUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=200)
    role: Optional[DashboardRoleLiteral] = None
    is_active: Optional[bool] = None
    new_password: Optional[str] = Field(None, min_length=8, max_length=128)


class DashboardAccountResponse(BaseModel):
    id: int
    email: str
    display_name: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True


class DashboardLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: DashboardAccountResponse