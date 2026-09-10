"""Job de cron: a las 20:15 Caracas guarda la tasa BCV del día siguiente.

El BCV publica de tarde la tasa que aplica desde mañana. El cobro sigue
usando la fila de hoy, nunca la más nueva.

  python jobs/sincronizar_tasa_bcv.py
  python jobs/sincronizar_tasa_bcv.py --hoy
  python jobs/sincronizar_tasa_bcv.py --fecha 2026-09-11
"""

from __future__ import annotations

import argparse
import sys
from datetime import date
from pathlib import Path

directorio_backend = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(directorio_backend))

from fastapi import HTTPException  # noqa: E402

from database import SessionLocal  # noqa: E402
from modelos.tasa_modelo import sincronizar_tasas_bcv  # noqa: E402
from utilidades.fecha_operativa import fecha_operativa_hoy, fecha_operativa_manana  # noqa: E402


def _fecha_desde_args(args: argparse.Namespace) -> date:
    if args.fecha:
        return date.fromisoformat(args.fecha)
    if args.hoy:
        return fecha_operativa_hoy()
    return fecha_operativa_manana()


def main() -> int:
    parser = argparse.ArgumentParser(description="Sincroniza la tasa BCV.")
    parser.add_argument("--hoy", action="store_true", help="Guarda la tasa con fecha de hoy.")
    parser.add_argument("--fecha", help="Fecha efectiva Y-m-d.")
    args = parser.parse_args()

    try:
        fecha = _fecha_desde_args(args)
    except ValueError:
        print("Fecha inválida. Usa Y-m-d.", file=sys.stderr)
        return 1

    db = SessionLocal()
    try:
        resultado = sincronizar_tasas_bcv(db, solo_si_falta=False, fecha_efectiva=fecha)
        print(resultado.get("mensaje", resultado))
        return 0
    except HTTPException as error:
        print(error.detail, file=sys.stderr)
        return 1
    except Exception as error:
        print(f"Error sincronizando tasa BCV: {error}", file=sys.stderr)
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
