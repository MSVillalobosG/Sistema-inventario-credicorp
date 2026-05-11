from fastapi import FastAPI
from routers import (
    auth_dashboard,
    batches,
    catalogs,
    dashboard_accounts,
    devices,
    movements,
    templates,
    users,
)
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import inspect, text

from database import SessionLocal, engine
from models import Base
from seed_dashboard import seed_dashboard_accounts_if_empty

app = FastAPI(title="Inventario Credicorp API")

# Crear tablas automáticamente
Base.metadata.create_all(bind=engine)


def _ensure_devices_nombre_usuario_asignado_column() -> None:
    try:
        insp = inspect(engine)
        if "devices" not in insp.get_table_names():
            return
        cols = {c["name"] for c in insp.get_columns("devices")}
        if "nombre_usuario_asignado" in cols:
            return
        with engine.begin() as conn:
            conn.execute(
                text("ALTER TABLE devices ADD COLUMN nombre_usuario_asignado VARCHAR(300)")
            )
    except Exception as e:
        print("Aviso: no se pudo añadir nombre_usuario_asignado a devices:", e)


_ensure_devices_nombre_usuario_asignado_column()

db_seed = SessionLocal()
try:
    seed_dashboard_accounts_if_empty(db_seed)
finally:
    db_seed.close()

# Registrar routers
app.include_router(devices.router)
app.include_router(movements.router)
app.include_router(catalogs.router)
app.include_router(templates.router)
app.include_router(batches.router)
app.include_router(users.router)
app.include_router(auth_dashboard.router)
app.include_router(dashboard_accounts.router)

# CORS (localhost con cualquier puerto + lista fija)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "API funcionando correctamente 🚀"}