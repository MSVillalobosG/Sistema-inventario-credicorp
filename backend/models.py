from sqlalchemy import Boolean, Column, Integer, String, Date, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
from enum import Enum


class MovementType(str, Enum):
    """Tipos alineados con services.py / lógica de inventario."""
    INCOME = "INCOME"
    ASSIGN = "ASSIGN"
    REASSIGN = "REASSIGN"
    RETURN = "RETURN"
    RETIRE = "RETIRE"


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)

    # 🔹 Campos técnicos generales
    fecha_ultimo_reporte = Column(DateTime, default=datetime.utcnow)
    ip_ultimo_reporte = Column(String, nullable=True)

    placa_equipo = Column(String)
    tipo_equipo = Column(String)
    tipo_contrato = Column(String)
    serial_number = Column(String, unique=True, index=True)
    nombre_equipo = Column(String)

    marca = Column(String)
    modelo = Column(String)
    sistema_operativo = Column(String)
    tipo_procesador = Column(String)
    capacidad_ram = Column(String)
    tipo_ram = Column(String)
    tipo_disco = Column(String)
    capacidad_disco = Column(String)

    mac = Column(String)
    ip_consola = Column(String)

    documento = Column(String)
    usuario_responsable = Column(String)
    usuario_asignado = Column(String)
    # Nombre completo del titular (maestro users o enviado al asignar)
    nombre_usuario_asignado = Column(String, nullable=True)
    correo_usuario = Column(String)

    sede = Column(String)
    ubicacion = Column(String)
    vicepresidencia = Column(String)
    area = Column(String)
    centro_costo = Column(String)
    nombre_centro_costo = Column(String)
    ciudad = Column(String)

    # 🔹 ORIGEN DEL EQUIPO
    origen = Column(String, default="NUEVO")  # NUEVO / DEVOLUCION / REPARACION / BAJA

    # 🔹 ESTADO OPERATIVO DEL EQUIPO
    estado = Column(String, default="EN_BODEGA")  # ASIGNADO / EN_BODEGA / EN_REPARACION / DE_BAJA

    ram_libre_gb = Column(String)
    disco_libre_gb = Column(String)
    ultimo_boot = Column(String)
    usuario_actual = Column(String)
    dominio = Column(String)
    arquitectura = Column(String)

    # 🔹 NUEVOS CAMPOS PARA INGRESO POR LOTE
    codigo_ml = Column(String, nullable=True)
    descripcion_ingreso = Column(String, nullable=True)
    accesorios = Column(String, nullable=True)

    batch_id = Column(Integer, ForeignKey("device_batches.id"), nullable=True)

    batch = relationship("DeviceBatch", back_populates="devices")
    movements = relationship("Movement", back_populates="device")


class Movement(Base):
    __tablename__ = "movements"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False, index=True)
    type = Column(String, nullable=False)  # MovementType value
    from_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    # Quién ejecutó la acción desde el panel (dashboard_accounts), para trazabilidad
    actor_email = Column(String, nullable=True)
    actor_display_name = Column(String, nullable=True)

    device = relationship("Device", back_populates="movements")


class DeviceTemplate(Base):
    __tablename__ = "device_templates"

    id = Column(Integer, primary_key=True, index=True)

    nombre_modelo = Column(String, nullable=False)
    marca = Column(String, nullable=False)
    modelo = Column(String, nullable=False)

    sistema_operativo = Column(String)
    tipo_procesador = Column(String)

    capacidad_ram = Column(Integer)
    tipo_ram = Column(String)

    tipo_disco = Column(String)
    capacidad_disco = Column(Integer)


class DeviceBatch(Base):
    __tablename__ = "device_batches"

    id = Column(Integer, primary_key=True, index=True)

    proveedor = Column(String)
    orden_instalacion = Column(String)
    numero_pedido = Column(String)
    contrato = Column(String)
    fecha_ingreso = Column(Date)

    template_id = Column(Integer, ForeignKey("device_templates.id"))

    ciudad = Column(String)
    sede = Column(String)

    devices = relationship("Device", back_populates="batch")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    cedula = Column(String, unique=True, nullable=False)
    nombre = Column(String, nullable=False)

    fecha_ingreso = Column(Date)
    cargo = Column(String)
    vp_funcional = Column(String)
    lider = Column(String)
    fecha_nacimiento = Column(Date)

    email = Column(String, unique=True, nullable=False)
    documento = Column(String, unique=True, index=True)
    usuario = Column(String, unique=True, nullable=False)
    sede = Column(String)


class DashboardAccount(Base):
    """Cuentas del panel web (login + rol). Distintas del maestro `users` de inventario."""

    __tablename__ = "dashboard_accounts"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    display_name = Column(String, nullable=False)
    # super_admin | admin | editor | viewer
    role = Column(String, nullable=False, default="viewer")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)