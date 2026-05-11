import jwt
from jwt.exceptions import DecodeError, ExpiredSignatureError, InvalidSignatureError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database import get_db
from models import DashboardAccount
from security import decode_token

security = HTTPBearer(auto_error=False)


def get_current_dashboard_account(
    creds: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> DashboardAccount:
    if not creds or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_token(creds.credentials)
        aid = int(payload["sub"])
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado. Cierre sesion e inicie de nuevo.",
        )
    except InvalidSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Token no valido para este servidor (el secreto JWT cambio o es distinto al del login). "
                "Cierre sesion y vuelva a entrar. Revise que JWT_SECRET en backend/.env sea el mismo desde el ultimo arranque."
            ),
        )
    except (DecodeError, KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token con formato invalido. Cierre sesion e inicie de nuevo.",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido o expirado. Cierre sesion e inicie de nuevo.",
        )
    acc = db.query(DashboardAccount).filter(DashboardAccount.id == aid).first()
    if not acc or not acc.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Cuenta no valida")
    return acc


def require_super_admin(
    acc: DashboardAccount = Depends(get_current_dashboard_account),
) -> DashboardAccount:
    if acc.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el administrador general puede realizar esta accion",
        )
    return acc


INVENTORY_WRITE_ROLES = frozenset({"super_admin", "admin", "editor"})


def require_inventory_editor(
    acc: DashboardAccount = Depends(get_current_dashboard_account),
) -> DashboardAccount:
    """Solo cuentas con permiso de edición (no 'viewer'). Requiere Bearer JWT."""
    if acc.role not in INVENTORY_WRITE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Su cuenta solo tiene permiso de lectura. Solicite rol de editor o administrador.",
        )
    return acc
