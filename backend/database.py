import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

# Desarrollo local sin Supabase: en backend/.env ponga USE_LOCAL_SQLITE=true
# (o defina DATABASE_URL=sqlite:///./inventario_local.db).
_use_local_sqlite = os.getenv("USE_LOCAL_SQLITE", "").lower() in ("1", "true", "yes")
DATABASE_URL = (os.getenv("DATABASE_URL") or "").strip()

if _use_local_sqlite:
    _db_file = (BASE_DIR / "inventario_local.db").resolve()
    DATABASE_URL = "sqlite:///" + _db_file.as_posix()
elif not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL no está definida en backend/.env. "
        "Opciones: (1) copie la cadena de conexión actual desde Supabase → Project Settings → Database, "
        "o (2) para probar en su PC sin Postgres, añada USE_LOCAL_SQLITE=true (ver .env.example)."
    )

_is_sqlite = DATABASE_URL.lower().startswith("sqlite")

# Supabase pooler en modo *Session* (puerto 5432) limita muy pocas conexiones por origen.
# Sin tope, SQLAlchemy usa pool_size=5 y max_overflow=10 → puede agotar el pool y dar:
#   MaxClientsInSessionMode: max clients reached
# Opciones: (1) pool pequeño aquí, (2) usar URL del pooler en modo *Transaction* (puerto 6543)
#   y DATABASE_USE_NULL_POOL=true, ver https://supabase.com/docs/guides/database/connecting-to-postgres
_use_null_pool = os.getenv("DATABASE_USE_NULL_POOL", "").lower() in ("1", "true", "yes")

if _is_sqlite:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
    )
elif _use_null_pool:
    engine = create_engine(
        DATABASE_URL,
        poolclass=NullPool,
        pool_pre_ping=True,
    )
else:
    _ps = int(os.getenv("DB_POOL_SIZE", "2"))
    _mo = int(os.getenv("DB_MAX_OVERFLOW", "1"))
    _recycle = int(os.getenv("DB_POOL_RECYCLE", "300"))
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=max(1, _ps),
        max_overflow=max(0, _mo),
        pool_timeout=30,
        pool_recycle=max(60, _recycle),
    )

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

# 🔥 AGREGA ESTO ↓↓↓

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
