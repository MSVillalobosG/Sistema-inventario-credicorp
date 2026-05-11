from fastapi import APIRouter

router = APIRouter(prefix="/catalogs", tags=["Catalogs"])

@router.get("/cities")
def get_cities():
    return [
        {"id": 1, "name": "BOGOTA"},
        {"id": 2, "name": "MEDELLIN"},
        {"id": 3, "name": "CALI"},
        {"id": 4, "name": "BARRANQUILLA"},
    ]