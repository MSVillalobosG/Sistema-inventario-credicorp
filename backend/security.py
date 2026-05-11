import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

# Acepte JWT_SECRET_KEY por compatibilidad con .env que usaban ese nombre.
SECRET = (
    os.getenv("JWT_SECRET")
    or os.getenv("JWT_SECRET_KEY")
    or "dev-cambiar-en-produccion-inventario"
)
ALGO = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7


def hash_password(plain: str) -> str:
    """Hash con bcrypt nativo (evita incompatibilidad passlib + bcrypt 4.x)."""
    digest = bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=12))
    return digest.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(*, sub: int, email: str, role: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(sub), "email": email, "role": role, "exp": exp}
    return jwt.encode(payload, SECRET, algorithm=ALGO)


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET, algorithms=[ALGO])
