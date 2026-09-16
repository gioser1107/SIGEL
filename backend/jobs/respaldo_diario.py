"""Cron diario: respalda las dos bases y rota archivos de más de 7 días."""

from __future__ import annotations

import sys
from pathlib import Path

directorio_backend = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(directorio_backend))

from utilidades.respaldo import generar_respaldo  # noqa: E402


def main() -> None:
    resultado = generar_respaldo()
    print("Respaldo", resultado["marca"], "método", resultado["metodo"])
    for archivo in resultado["archivos"]:
        print(" ", archivo["archivo"], archivo["bytes"], "bytes")
    if resultado["eliminados_por_retencion"]:
        print("Rotados:", ", ".join(resultado["eliminados_por_retencion"]))


if __name__ == "__main__":
    main()
