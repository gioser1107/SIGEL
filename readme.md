# Sistema Travel BQTO

Repositorio principal del sistema integral para la gestión logística turística.

## Tecnologías
- **Backend:** Python + FastAPI + MySQL
- **Frontend:** React + TypeScript + Vite

## Estructura
- `/backend`: Lógica del servidor y conexión a base de datos.
- `/frontend`: Interfaz interactiva de usuario.

## Instalación en una PC vacía (comunidad)

Sigue `instalacion/GUIA_PC_VIRGEN.md` (pasos, programas, usuarios). Resumen: `instalacion/INSTRUCCIONES.md`.

## Cómo levantar el proyecto

### Desarrollo (tu PC)

#### Backend
```bash
cd backend
# activar el entorno virtual del proyecto
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

#### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

La API por defecto queda en `http://localhost:8000/api` (ver `frontend/.env.example`).

### Instalación permanente (laptop de la comunidad)

No instales Node en esa máquina. Compila el frontend en tu PC y sigue `instalacion/GUIA_PC_VIRGEN.md`. En Windows ellos abren el sistema con `instalacion/windows/iniciar.bat` en `http://127.0.0.1:8000`.
