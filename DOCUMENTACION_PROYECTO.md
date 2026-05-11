# Documentación del proyecto — Inventario Credicorp

Este documento describe la arquitectura, las tecnologías y los módulos del sistema de inventario: qué hace cada parte, con qué está construido y cómo se relacionan entre sí.

---

## 1. Visión general

El proyecto es un **sistema de inventario de equipos de cómputo** orientado a una organización (Credicorp). Permite:

- Registrar y consultar **dispositivos** (laptops, desktops, etc.) con datos técnicos y organizacionales.
- Gestionar el **ciclo de vida** del equipo: ingreso, asignación a usuarios, devoluciones, cambios, bajas y reparaciones.
- Llevar un **historial de movimientos** con trazabilidad (notas, tipos de movimiento, y en muchos casos quién actuó desde el panel).
- Administrar un **maestro de usuarios** de inventario (distinto de las cuentas que entran al panel web).
- Operar desde un **panel web (dashboard)** y complementar el registro con un **agente ligero en Windows** que envía inventario automático al servidor.

La solución se apoya en tres piezas principales:

| Pieza | Rol |
|--------|-----|
| **Backend (API)** | FastAPI + SQLAlchemy: datos, reglas de negocio, autenticación del panel, endpoints REST. |
| **Dashboard (frontend)** | Next.js + Material UI: interfaz para consulta, reportes y operaciones de inventario. |
| **Agente** | Script Python en Windows (WMI, psutil): recopila datos del PC y llama al endpoint de sincronización. |

---

## 2. Estructura de carpetas (alto nivel)

- **`backend/`** — API REST, modelos de base de datos, lógica de servicios, routers, seguridad (JWT, bcrypt), semillas de datos del panel.
- **`dashboard/package/`** — Aplicación Next.js (plantilla tipo “Modernize”): páginas del panel, layout, servicios HTTP hacia la API.
- **`Agente/`** — Agente de sincronización de dispositivo (`agent.py`).
- **`package.json` (raíz)** — Scripts que delegan en `dashboard/package` (`npm run dev`, `build`, etc.).
- El antiguo **`frontend/`** aparece eliminado en el historial del repo; el front activo es **`dashboard/package`**.

---

## 3. Backend (API)

### 3.1 Tecnologías

Definidas en `backend/requirements.txt`:

| Dependencia | Uso |
|-------------|-----|
| **FastAPI** | Framework web asíncrono, rutas, validación con Pydantic, documentación OpenAPI automática. |
| **Uvicorn** | Servidor ASGI para ejecutar la aplicación. |
| **SQLAlchemy 2.x** | ORM y acceso a PostgreSQL (u otro motor compatible con la URL configurada). |
| **Pydantic v2** | Esquemas de entrada/salida de la API. |
| **python-dotenv** | Carga de variables desde `backend/.env`. |
| **PyJWT** | Emisión y validación de tokens JWT para el dashboard. |
| **bcrypt** | Hash y verificación de contraseñas de cuentas del panel. |
| **psycopg2-binary** | Driver PostgreSQL (ajustable si la `DATABASE_URL` usa otro dialecto). |

### 3.2 Punto de entrada y arranque

- **`main.py`** crea la app `FastAPI`, ejecuta `Base.metadata.create_all` para crear tablas si no existen, aplica **migraciones ligeras en caliente** (por ejemplo: valores de enum en PostgreSQL para `ADMIN_UPDATE`, columnas `actor_email` / `actor_display_name` en `movements`, `nombre_usuario_asignado` en `devices`), semilla cuentas del panel si aplica, registra los **routers** y configura **CORS** para orígenes locales (p. ej. `localhost:3000` y regex para puertos variables).

### 3.3 Base de datos y configuración

- **`database.py`** lee **`DATABASE_URL`** desde `backend/.env` (obligatoria si no está definida, falla al importar).
- Contempla entornos con **Supabase / pooler limitado**: variables opcionales como `DATABASE_USE_NULL_POOL`, `DB_POOL_SIZE`, `DB_MAX_OVERFLOW`, `DB_POOL_RECYCLE` para no agotar conexiones.
- **`get_db()`** entrega sesiones SQLAlchemy por petición (patrón típico con `yield` y cierre en `finally`).

### 3.4 Modelos principales (`models.py`)

- **`Device`** — Equipo inventariado: identificación (serial, placa, nombre), hardware, red, ubicación organizacional, origen (`NUEVO`, `DEVOLUCION`, etc.), **estado** (`EN_BODEGA`, `ASIGNADO`, etc.), datos de lote/plantilla, fechas de último reporte e IP del agente.
- **`Movement`** — Movimiento sobre un dispositivo: tipo (`MovementType`: ingreso, asignación, reasignación, devolución, retiro, actualización administrativa), usuarios origen/destino, notas, fecha, y campos opcionales de **actor del panel** (`actor_email`, `actor_display_name`).
- **`User`** — Maestro de personas/usuarios de inventario (cédula, email, sede, etc.), usado en asignaciones y resolución de nombres.
- **`DashboardAccount`** — Cuentas del **panel web**: email, hash de contraseña, nombre para mostrar, **rol** (`super_admin`, `admin`, `editor`, `viewer`), activo/inactivo.
- **`DeviceTemplate`** / **`DeviceBatch`** — Plantillas de modelo y lotes de ingreso con relación a dispositivos.

### 3.5 Autenticación y autorización

- **`security.py`**: contraseñas con **bcrypt**; JWT (**HS256**) con `JWT_SECRET` y vigencia por defecto de varios días.
- **`dependencies.py`**:
  - **`get_current_dashboard_account`**: valida el Bearer JWT y carga la cuenta activa.
  - **`require_super_admin`**: solo `super_admin`.
  - **`require_inventory_editor`**: roles con permiso de escritura (`super_admin`, `admin`, `editor`); `viewer` queda en lectura.

- **`routers/auth_dashboard.py`**: login del panel (`POST /auth/dashboard-login`) con email/contraseña; responde `access_token` y datos del usuario.

### 3.6 Routers (módulos HTTP)

Incluidos desde `main.py` (nombres orientativos según archivos en `backend/routers/`):

- **`devices`** — CRUD/consultas de dispositivos, asignaciones, administración de campos, historial, **sincronización del agente** (`POST /devices/sync`), etc.
- **`movements`** — Operaciones relacionadas con movimientos de inventario.
- **`catalogs`** — Catálogos auxiliares si aplica al dominio.
- **`templates`** — Plantillas de equipo.
- **`batches`** — Lotes de ingreso.
- **`users`** — Maestro de usuarios de inventario.
- **`auth_dashboard`** — Autenticación del panel.
- **`dashboard_accounts`** — Gestión de cuentas del panel (según rol).

La lógica de negocio y las notas de trazabilidad están centralizadas en gran parte en **`services.py`** (funciones de trazas, historial, etc.).

### 3.7 Agente y endpoint `/devices/sync`

- El script **`Agente/agent.py`** usa **WMI**, **psutil** y librerías estándar para armar un JSON alineado con el modelo de dispositivo y hace `POST` a la URL configurada (ejemplo en código: `.../devices/sync`).
- Si el serial ya existe, el backend **actualiza** campos técnicos pero **preserva** ciertos datos de inventario (placa, contrato, ciudad, sede, usuario asignado, estado, origen, etc.). Si no existe, **crea** el equipo (con valores por defecto de estado/origen según la lógica del router) y puede registrar un movimiento de tipo ingreso vía trazabilidad.
- **Nota de seguridad:** el agente en el ejemplo envía un header `Authorization: Bearer ...`. Para producción conviene que el backend **valide explícitamente** un token de servicio o mTLS y no dependa solo de la red interna.

### 3.8 CORS

Configurado para desarrollo local: orígenes como `http://localhost:3000` y un `allow_origin_regex` para `localhost` / `127.0.0.1` con cualquier puerto, con credenciales habilitadas.

---

## 4. Dashboard (frontend)

### 4.1 Tecnologías (`dashboard/package/package.json`)

| Tecnología | Uso |
|------------|-----|
| **Next.js 16** (App Router) | Framework React, rutas bajo `src/app/`, SSR/SSG según página. |
| **React 18** | UI. |
| **TypeScript** | Tipado. |
| **Material UI (MUI) v7** | Componentes, tema, Data Grid donde aplica. |
| **Emotion** | Estilos CSS-in-JS usados por MUI. |
| **Axios** | Cliente HTTP (junto con `fetch` en servicios). |
| **React Hook Form + Zod + resolvers** | Formularios y validación (p. ej. altas). |
| **ApexCharts** | Gráficos en dashboard/métricas. |
| **Tabler Icons** | Iconografía del menú lateral. |
| **@azure/msal-browser** | Presente en dependencias (integración Microsoft / Azure AD si se usa o se planea). |

Scripts: `dev` / `build` usan **webpack** explícitamente (`--webpack`) por compatibilidad con el ecosistema del template.

### 4.2 Comunicación con la API

- **`src/services/api.ts`**: base URL desde **`NEXT_PUBLIC_API_BASE`** o por defecto `http://127.0.0.1:7000`; añade **Bearer** desde `localStorage` (sesión del login).
- Otros servicios (`auth.ts`, `devices.ts`, `movements.ts`, `users.ts`, `dashboardAccounts.ts`, etc.) encapsulan llamadas a endpoints concretos.

### 4.3 Funcionalidad por menú (orientativo)

Según `MenuItems.tsx` y filtros por rol:

- **Inventario:** Dashboard, listado de dispositivos, movimientos (asignación, equipos de cambio, cambio de equipo), altas (dispositivo, usuario; también plantillas en rutas relacionadas).
- **Consulta:** Búsqueda de equipos, gestión de usuarios del maestro.
- **Baja:** Equipos dados de baja.
- **Reportes:** Métricas, general de inventario (restringido a `super_admin` en menú), retiros / checklist.
- **Soporte / administración:** Soporte, **configuración de cuentas** del panel (solo `super_admin` en menú).

Los usuarios con rol **`viewer`** ven ocultas en el menú las rutas de alta y movimientos que modifican inventario; el backend debe seguir rechazando escrituras sin rol adecuado.

---

## 5. Cuentas iniciales del panel (semilla)

El archivo **`backend/seed_dashboard.py`** puede crear cuentas por defecto si la tabla está vacía (emails y roles de ejemplo tipo administrador TI, bodega, soporte). En producción debe revisarse **cambio de contraseñas** y desactivar o personalizar semillas.

---

## 6. Variables de entorno relevantes

### Backend (`backend/.env`)

- **`DATABASE_URL`** — Cadena SQLAlchemy (típicamente PostgreSQL).
- Opcionales: **`DATABASE_USE_NULL_POOL`**, **`DB_POOL_SIZE`**, **`DB_MAX_OVERFLOW`**, **`DB_POOL_RECYCLE`**.
- **`JWT_SECRET`** — Secreto para firmar JWT (imprescindible endurecer en producción).

### Frontend

- **`NEXT_PUBLIC_API_BASE`** — URL pública del backend (mismo host/puerto que sirve la API, p. ej. `http://127.0.0.1:7000`).

---

## 7. Cómo ejecutar en desarrollo (referencia)

1. **Base de datos:** PostgreSQL (u otro compatible) accesible con la `DATABASE_URL` configurada.
2. **Backend:** desde `backend/`, entorno virtual recomendado, `pip install -r requirements.txt`, variables en `.env`, levantar con Uvicorn (p. ej. puerto **7000** si así lo usa el front).
3. **Dashboard:** desde la raíz del repo, `npm install` si aplica, luego `npm run dev` (delega en `dashboard/package`); Next suele usar el puerto **3000**, alineado con CORS del backend.

---

## 8. Resumen de “con qué está hecho”

- **API:** Python, **FastAPI**, **SQLAlchemy**, **Pydantic**, **JWT + bcrypt**, **PostgreSQL** (vía psycopg2).
- **Panel:** **Next.js 16**, **React 18**, **TypeScript**, **MUI 7**, formularios con **React Hook Form** y **Zod**, gráficos **ApexCharts**.
- **Agente:** Python en **Windows** con **WMI** y **psutil**, HTTP hacia la API.
- **Patrón:** cliente-servidor REST; el panel y el agente son clientes del mismo backend; la base de datos es la fuente de verdad del inventario.

---

*Documento generado a partir del código del repositorio. Si cambian routers, modelos o dependencias, conviene actualizar esta referencia en la misma iteración del cambio.*
