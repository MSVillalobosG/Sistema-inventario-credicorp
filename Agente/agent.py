import psutil
import wmi
import socket
import requests
import uuid
import platform
from datetime import datetime

# URL del backend (FastAPI) para sincronizar el dispositivo.
API_URL = "http://10.233.102.22:7000/devices/sync"

def get_device_info():
    c = wmi.WMI()

    bios = c.Win32_BIOS()[0]
    system = c.Win32_ComputerSystem()[0]
    processor = c.Win32_Processor()[0]
    os_info = c.Win32_OperatingSystem()[0]
    disk = c.Win32_LogicalDisk(DeviceID="C:")[0]

    ram_total_gb = round(psutil.virtual_memory().total / (1024**3))
    ram_free_gb = round(psutil.virtual_memory().available / (1024**3))

    disk_total_gb = round(int(disk.Size) / (1024**3))
    disk_free_gb = round(int(disk.FreeSpace) / (1024**3))

    boot_time = datetime.fromtimestamp(psutil.boot_time())

    return {
        "placa_equipo": socket.gethostname(),
        "tipo_equipo": "Laptop" if system.PCSystemType == 2 else "Desktop",
        "tipo_contrato": "Credicorp",
        "serial_number": bios.SerialNumber.strip(),
        "nombre_equipo": socket.gethostname(),
        "marca": system.Manufacturer,
        "modelo": system.Model,
        "sistema_operativo": os_info.Caption,
        "tipo_procesador": processor.Name,
        "capacidad_ram": str(ram_total_gb),
        "tipo_ram": "DDR4",
        "tipo_disco": "SSD",
        "capacidad_disco": str(disk_total_gb),
        "mac": ':'.join(['{:02x}'.format((uuid.getnode() >> ele) & 0xff)
                         for ele in range(0,8*6,8)][::-1]),
        "ip_consola": socket.gethostbyname(socket.gethostname()),
        "documento": "",
        "usuario_responsable": "",
        "usuario_asignado": "",
        "correo_usuario": "",
        "sede": "",
        "ubicacion": "",
        "vicepresidencia": "",
        "area": "",
        "centro_costo": "",
        "nombre_centro_costo": "",
        "ciudad": "",
        "ram_libre_gb": str(ram_free_gb),
        "disco_libre_gb": str(disk_free_gb),
        "ultimo_boot": str(boot_time),
        "usuario_actual": system.UserName,
        "dominio": system.Domain,
        "arquitectura": platform.architecture()[0]
    }

def send_to_api(data):
    headers = {
        "Authorization": "Bearer credicorp_internal_sync_2026"
    }

    try:
        response = requests.post(API_URL, json=data, headers=headers)
        print("Status:", response.status_code)
        print("Response:", response.json())
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    device_info = get_device_info()
    send_to_api(device_info)