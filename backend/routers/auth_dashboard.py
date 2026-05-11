from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import DashboardAccount
from schemas import DashboardLoginBody, DashboardLoginResponse, DashboardAccountResponse
from security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["Auth dashboard"])


def _to_user_out(acc: DashboardAccount) -> DashboardAccountResponse:
    return DashboardAccountResponse(
        id=acc.id,
        email=acc.email,
        display_name=acc.display_name,
        role=acc.role,
        is_active=bool(acc.is_active),
    )


@router.post("/dashboard-login", response_model=DashboardLoginResponse)
def dashboard_login(body: DashboardLoginBody, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    acc = db.query(DashboardAccount).filter(DashboardAccount.email == email).first()
    if not acc or not acc.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Credenciales invalidas",
        )
    if not verify_password(body.password, acc.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Credenciales invalidas",
        )
    token = create_access_token(sub=acc.id, email=acc.email, role=acc.role)
    return DashboardLoginResponse(
        access_token=token,
        token_type="bearer",
        user=_to_user_out(acc),
    )
