"""Unicidad de correo y cédula en cuentas activas. El nombre no es único.

Desde backend/:

    python migraciones/20260918_unicidad_correo_documento.py
"""

from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import create_engine, text

directorio_backend = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(directorio_backend))

from database import nombre_bd, nombre_bd_seguridad, url_mysql  # noqa: E402


def _tiene_columna(conexion, esquema: str, tabla: str, columna: str) -> bool:
    fila = conexion.execute(
        text(
            """
            SELECT COUNT(*) AS n
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = :esquema
              AND TABLE_NAME = :tabla
              AND COLUMN_NAME = :columna
            """
        ),
        {"esquema": esquema, "tabla": tabla, "columna": columna},
    ).mappings().first()
    return bool(fila and fila["n"])


def _tiene_indice(conexion, esquema: str, tabla: str, indice: str) -> bool:
    fila = conexion.execute(
        text(
            """
            SELECT COUNT(*) AS n
            FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = :esquema
              AND TABLE_NAME = :tabla
              AND INDEX_NAME = :indice
            """
        ),
        {"esquema": esquema, "tabla": tabla, "indice": indice},
    ).mappings().first()
    return bool(fila and fila["n"])


def migrar() -> None:
    motor = create_engine(url_mysql(), pool_pre_ping=True)
    with motor.begin() as conexion:
        if not _tiene_columna(conexion, nombre_bd_seguridad, "usuarios", "correo_activo"):
            conexion.execute(
                text(
                    f"ALTER TABLE `{nombre_bd_seguridad}`.`usuarios` "
                    "ADD COLUMN correo_activo VARCHAR(320) "
                    "GENERATED ALWAYS AS (IF(eliminado_en IS NULL, correo, NULL)) STORED"
                )
            )
        if not _tiene_indice(conexion, nombre_bd_seguridad, "usuarios", "uq_usuarios_correo_vigente"):
            conexion.execute(
                text(
                    f"CREATE UNIQUE INDEX uq_usuarios_correo_vigente "
                    f"ON `{nombre_bd_seguridad}`.`usuarios` (correo_activo)"
                )
            )
        if not _tiene_columna(conexion, nombre_bd, "clientes", "documento_activo"):
            conexion.execute(
                text(
                    f"ALTER TABLE `{nombre_bd}`.`clientes` "
                    "ADD COLUMN documento_activo VARCHAR(62) "
                    "GENERATED ALWAYS AS ("
                    "IF(eliminado_en IS NULL, CONCAT(tipo_documento, '-', numero_documento), NULL)"
                    ") STORED"
                )
            )
        if not _tiene_indice(conexion, nombre_bd, "clientes", "uq_clientes_documento_vigente"):
            conexion.execute(
                text(
                    f"CREATE UNIQUE INDEX uq_clientes_documento_vigente "
                    f"ON `{nombre_bd}`.`clientes` (documento_activo)"
                )
            )


if __name__ == "__main__":
    migrar()
    print("Unicidad de correo y documento aplicada.")
