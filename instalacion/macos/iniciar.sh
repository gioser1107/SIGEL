#!/bin/sh
set -e
RAIZ="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
cd "$RAIZ"

if [ ! -f frontend/dist/index.html ]; then
  echo "[ERROR] Falta frontend/dist. En desarrollo: cd frontend && npm run build"
  exit 1
fi

if [ ! -f backend/.env ]; then
  echo "[ERROR] Falta backend/.env. Copie backend/.env.example y configure MySQL."
  exit 1
fi

if [ -x backend/.venv/bin/python ]; then
  PYTHON_SIGEL="backend/.venv/bin/python"
else
  PYTHON_SIGEL="python3"
fi

echo "Iniciando SIGEL en http://127.0.0.1:8000"
open "http://127.0.0.1:8000" 2>/dev/null || true
cd backend
exec "$PYTHON_SIGEL" -m uvicorn main:app --host 127.0.0.1 --port 8000
