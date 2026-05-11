from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from dependencies import require_inventory_editor
from models import DeviceTemplate
from schemas import DeviceTemplateCreate, DeviceTemplateResponse

router = APIRouter(prefix="/templates", tags=["Device Templates"])


# 🔹 Crear plantilla
@router.post("/", response_model=DeviceTemplateResponse)
def create_template(
    template: DeviceTemplateCreate,
    db: Session = Depends(get_db),
    _auth=Depends(require_inventory_editor),
):
    new_template = DeviceTemplate(**template.dict())
    db.add(new_template)
    db.commit()
    db.refresh(new_template)
    return new_template


# 🔹 Listar plantillas
@router.get("/", response_model=list[DeviceTemplateResponse])
def get_templates(db: Session = Depends(get_db)):
    return db.query(DeviceTemplate).all()