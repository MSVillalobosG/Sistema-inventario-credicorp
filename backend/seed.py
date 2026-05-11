from database import SessionLocal
from models import City, DeviceType, ContractType

db = SessionLocal()

# ---- CITIES ----
cities = ["BOGOTA", "MEDELLIN", "CALI", "BARRANQUILLA"]

for city in cities:
    if not db.query(City).filter(City.name == city).first():
        db.add(City(name=city))

# ---- DEVICE TYPES ----
device_types = ["DE OFICINA", "PORTATIL", "SERVIDOR"]

for dt in device_types:
    if not db.query(DeviceType).filter(DeviceType.name == dt).first():
        db.add(DeviceType(name=dt))

# ---- CONTRACT TYPES ----
contract_types = ["MILENIO", "CREDICORP", "IBM"]

for ct in contract_types:
    if not db.query(ContractType).filter(ContractType.name == ct).first():
        db.add(ContractType(name=ct))

db.commit()
db.close()

print("✅ Datos maestros insertados correctamente")