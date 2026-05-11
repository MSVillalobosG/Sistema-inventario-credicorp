from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from dependencies import require_inventory_editor
from models import User
from schemas import UserCreate, UserResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/", response_model=UserResponse)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    _auth=Depends(require_inventory_editor),
):

    new_user = User(
        nombre=user.nombre,
        email=user.email,
        documento=user.documento,
        cedula=user.documento,
        usuario=user.usuario,
        cargo=user.cargo,
        sede=user.sede
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.get("/", response_model=list[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()


from sqlalchemy import or_

@router.get("/search", response_model=list[UserResponse])
def search_users(q: str, db: Session = Depends(get_db)):

    users = (
        db.query(User)
        .filter(
            or_(
                User.usuario.ilike(f"%{q}%"),
                User.documento.ilike(f"%{q}%"),
                User.nombre.ilike(f"%{q}%")
            )
        )
        .limit(10)
        .all()
    )

    return users

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user: UserCreate,
    db: Session = Depends(get_db),
    _auth=Depends(require_inventory_editor),
):

    db_user = db.query(User).filter(User.id == user_id).first()

    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    db_user.nombre = user.nombre
    db_user.email = user.email
    db_user.documento = user.documento
    db_user.usuario = user.usuario
    db_user.cargo = user.cargo
    db_user.sede = user.sede

    db.commit()
    db.refresh(db_user)

    return db_user