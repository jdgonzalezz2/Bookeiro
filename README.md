# La Cima Barbería ✂️🏆

Sistema SaaS integral para la gestión de barberías premium. Incluye una aplicación cliente para reservas (PWA) y un panel administrativo completo con POS, gestión de barberos y reportes financieros.

## 🚀 Cómo Ejecutar el Proyecto

Tienes dos formas de poner en marcha el sistema:

### 1. Usando Docker (Recomendado) 🐳
Esta es la forma más rápida, ya que configura la base de datos y ambos servicios automáticamente.

1. Asegúrate de tener **Docker** y **Docker Compose** instalados.
2. Ejecuta el siguiente comando en la raíz del proyecto:
   ```bash
   docker-compose up --build
   ```
3. El sistema estará disponible en las siguientes URLs:
   - **Frontend (Cliente/Admin):** [http://localhost:3000](http://localhost:3000)
   - **Backend API:** [http://localhost:4000](http://localhost:4000)
   - **Base de Datos (Postgres):** Puerto `5433`

### 2. Ejecución Local (Desarrollo) 💻
Si prefieres correrlo sin Docker, necesitarás Node.js v18+ y PostgreSQL.

1. **Configurar Base de Datos**: 
   - Crea una base de datos llamada `lacima_db`.
   - Copia `.env.example` a `.env` y ajusta las credenciales de tu DB.
2. **Iniciar Backend**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
3. **Iniciar Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## 🔐 Acceso y Credenciales

Una vez que la aplicación esté corriendo, puedes iniciar sesión con las siguientes cuentas de prueba:

| Rol | Usuario | Contraseña |
| :--- | :--- | :--- |
| **Administrador** | `admin@lacima.co` | `LaCima2024!` |
| **Barbero (Ejemplo)** | `alejandro@lacima.co` | `barbero123` |

Para acceder al panel administrativo, ve a: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

---

## 🛠️ Estructura del Proyecto

- `/frontend`: Aplicación Next.js 14 (App Router).
- `/backend`: API REST en Node.js + Express + PostgreSQL.
- `docker-compose.yml`: Orquestación de contenedores para DB y servicios.
- `WALKTHROUGH.md`: Notas detalladas sobre funcionalidades y arquitectura.

---

## ✨ Características Principales
- **Reservas en 4 pasos**: Selección de barbero, servicio, fecha y hora.
- **PWA Ready**: Instalable en dispositivos móviles para una experiencia nativa.
- **POS Integrado**: Gestión de cobros vinculada directamente a las citas.
- **Dashboard Financiero**: Visualización de ingresos y comisiones de barberos en tiempo real.
- **Gestión de Disponibilidad**: Motor automático de slots basado en horarios laborales.