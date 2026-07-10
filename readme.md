# Sistema Travel BQTO

Repositorio principal del sistema integral para la gestión logística turística.

## Tecnologías
- **Backend:** Python + FastAPI + MySQL
- **Frontend:** React + TypeScript + Vite

## Estructura
- `/backend`: Lógica del servidor y conexión a base de datos.
- `/frontend`: Interfaz interactiva de usuario.

## Cómo levantar el proyecto

### Backend
```bash
cd backend
# activar el entorno virtual del proyecto
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

La API por defecto queda en `http://localhost:8000/api` (ver `frontend/.env.example`).
