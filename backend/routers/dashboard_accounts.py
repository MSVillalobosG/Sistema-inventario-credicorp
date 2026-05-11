from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require_super_admin
from models import DashboardAccount
from schemas import (
    DashboardAccountCreate,
    DashboardAccountResponse,
    DashboardAccountUpdate,
)
from security import hash_password

router = APIRouter(prefix="/dashboard-accounts", tags=["Dashboard accounts"])


def _to_out(acc: DashboardAccount) -> DashboardAccountResponse:
    return DashboardAccountResponse(
        id=acc.id,
        email=acc.email,
        display_name=acc.display_name,
        role=acc.role,
        is_active=bool(acc.is_active),
    )


def _count_super_admins(db: Session) -> int:
    return (
        db.query(DashboardAccount)
        .filter(
            DashboardAccount.role == "super_admin",
            DashboardAccount.is_active.is_(True),
        )
        .count()
    )


@router.get("/", response_model=list[DashboardAccountResponse])
def list_accounts(
    db: Session = Depends(get_db),
    _: DashboardAccount = Depends(require_super_admin),
):
    rows = db.query(DashboardAccount).order_by(DashboardAccount.id.asc()).all()
    return [_to_out(a) for a in rows]


@router.post("/", response_model=DashboardAccountResponse)
def create_account(
    body: DashboardAccountCreate,
    db: Session = Depends(get_db),
    _: DashboardAccount = Depends(require_super_admin),
):
    email = body.email.strip().lower()
    if db.query(DashboardAccount).filter(DashboardAccount.email == email).first():
        raise HTTPException(status_code=400, detail="Ya existe una cuenta con ese correo")
    acc = DashboardAccount(
        email=email,
        password_hash=hash_password(body.password),
        display_name=body.display_name.strip(),
        role=body.role,
        is_active=True,
    )
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return _to_out(acc)


@router.patch("/{account_id}", response_model=DashboardAccountResponse)
def update_account(
    account_id: int,
    body: DashboardAccountUpdate,
    db: Session = Depends(get_db),
    actor: DashboardAccount = Depends(require_super_admin),
):
    acc = db.query(DashboardAccount).filter(DashboardAccount.id == account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")

    if body.display_name is not None:
        acc.display_name = body.display_name.strip()
    if body.new_password is not None:
        acc.password_hash = hash_password(body.new_password)

    if body.role is not None and body.role != acc.role:
        if acc.role == "super_admin" and body.role != "super_admin":
            if _count_super_admins(db) <= 1:
                raise HTTPException(
                    status_code=400,
                    detail="Debe existir al menos un administrador general activo",
                )
        acc.role = body.role

    if body.is_active is not None and body.is_active is False:
        if acc.role == "super_admin" and _count_super_admins(db) <= 1:
            raise HTTPException(
                status_code=400,
                detail="No puede desactivar el unico administrador general",
            )
        acc.is_active = body.is_active
    elif body.is_active is not None:
        acc.is_active = body.is_active

    db.commit()
    db.refresh(acc)
    return _to_out(acc)
