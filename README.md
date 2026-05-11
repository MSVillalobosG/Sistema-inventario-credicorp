# 🚀 Sistema de Inventario Credicorp

<img width="1899" height="906" alt="image" src="https://github.com/user-attachments/assets/4be0e4d7-fdc6-42de-a084-24119f127cab" />

Sistema fullstack para la gestión de inventario empresarial desarrollado para optimizar el control y trazabilidad de activos tecnológicos dentro de una organización.

La plataforma permite administrar dispositivos, usuarios, asignaciones, devoluciones y movimientos desde un dashboard web moderno, reemplazando procesos manuales realizados en Excel.

---

# 🛠 Tecnologías utilizadas

## Backend

* Python
* FastAPI
* SQLAlchemy
* PostgreSQL
* JWT Authentication
* Pydantic

## Frontend

* Next.js
* React
* TypeScript
* Material UI

## Agente

* Python
* WMI
* psutil

---

# ⚙️ Funcionalidades

* Gestión de dispositivos
* Registro de usuarios
* Asignación y devolución de equipos
* Historial de movimientos
* Dashboard administrativo
* Roles y autenticación
* Trazabilidad de activos
* Sincronización automática mediante agente en Windows

---

# 🧠 Arquitectura

```bash
Agente Windows → API FastAPI → PostgreSQL → Dashboard React/Next.js
```

---

# 🚀 Instalación

## Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## Frontend

```bash
cd dashboard/package
npm install
npm run dev
```

---

# 🔐 Variables de entorno

Crear archivo `.env` en backend:

```env
DATABASE_URL=your_database_url
JWT_SECRET=your_secret
```

---

# 📌 Estado del proyecto

Proyecto en desarrollo y mejora continua.

---

# 👨‍💻 Autor

**Milton Sebastian Villalobos Guataquira**
