"""Quita las rutinas de 20260917_funcion_procedimiento_reportes.sql.

No borra tablas ni filas. Desde backend/:

    python migraciones/20260917_quitar_funcion_procedimiento_reportes.py
"""

from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import create_engine, text

directorio_backend = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(directorio_backend))

from database import nombre_bd, url_mysql  # noqa: E402


def quitar() -> None:
    motor = create_engine(url_mysql(nombre_bd), pool_pre_ping=True)
    with motor.connect() as conexion:
        conexion = conexion.execution_options(isolation_level="AUTOCOMMIT")
        conexion.execute(text(f"DROP FUNCTION IF EXISTS `{nombre_bd}`.`fn_ocupacion_viaje`"))
        conexion.execute(text(f"DROP FUNCTION IF EXISTS `{nombre_bd}`.`fn_ingresos_periodo`"))
        conexion.execute(text(f"DROP PROCEDURE IF EXISTS `{nombre_bd}`.`sp_ingresos_periodo`"))
    motor.dispose()
    print("Listo. Se quitaron fn_ocupacion_viaje, fn_ingresos_periodo y sp_ingresos_periodo")


if __name__ == "__main__":
    quitar()
