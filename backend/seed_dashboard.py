"""Crea cuentas iniciales del panel si la tabla está vacía (mismas claves que el login genérico del front)."""

from sqlalchemy.orm import Session

from models import DashboardAccount
from security import hash_password


def seed_dashboard_accounts_if_empty(db: Session) -> None:
    if db.query(DashboardAccount).first() is not None:
        return

    initial = [
        ("admin@credicorp.com", "Admin123*", "Administrador TI", "super_admin"),
        ("bodega.cali@credicorp.com", "Bodega123*", "Bodega Cali", "editor"),
        ("soporte@credicorp.com", "Soporte123*", "Mesa de Ayuda", "editor"),
    ]
    for email, password, name, role in initial:
        db.add(
            DashboardAccount(
                email=email,
                password_hash=hash_password(password),
                display_name=name,
                role=role,
                is_active=True,
            )
        )
    db.commit()
