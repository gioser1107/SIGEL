"""Convierte las líneas de cotización a formato factura (cantidad × precio).

Desde backend/:

    python migraciones/20260918_cotizacion_lineas_factura.py
"""

from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import create_engine, text

directorio_backend = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(directorio_backend))

from database import nombre_bd, url_mysql  # noqa: E402

ENUM_AMPLIO = (
    "'combustible','logistica','pago_guia','alimentacion','peajes','otro',"
    "'pasaje','hospedaje','transporte','extra'"
)
ENUM_FINAL = "'pasaje','hospedaje','alimentacion','transporte','extra','otro'"


def _tiene_columna(conexion, tabla: str, columna: str) -> bool:
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
        {"esquema": nombre_bd, "tabla": tabla, "columna": columna},
    ).mappings().first()
    return bool(fila and fila["n"])


def migrar() -> None:
    motor = create_engine(url_mysql(nombre_bd), pool_pre_ping=True)
    with motor.begin() as conexion:
        if not _tiene_columna(conexion, "cotizacion_lineas", "cantidad"):
            conexion.execute(
                text(
                    "ALTER TABLE cotizacion_lineas "
                    "ADD COLUMN cantidad NUMERIC(10, 2) NOT NULL DEFAULT 1.00 AFTER categoria"
                )
            )
        if not _tiene_columna(conexion, "cotizacion_lineas", "unidad"):
            conexion.execute(
                text(
                    "ALTER TABLE cotizacion_lineas "
                    "ADD COLUMN unidad VARCHAR(20) NOT NULL DEFAULT 'personas' AFTER cantidad"
                )
            )
        if not _tiene_columna(conexion, "cotizacion_lineas", "precio_unitario_eur"):
            conexion.execute(
                text(
                    "ALTER TABLE cotizacion_lineas "
                    "ADD COLUMN precio_unitario_eur NUMERIC(12, 2) NULL AFTER unidad"
                )
            )

        conexion.execute(
            text(
                f"ALTER TABLE cotizacion_lineas "
                f"MODIFY COLUMN categoria ENUM({ENUM_AMPLIO}) NOT NULL DEFAULT 'otro'"
            )
        )
        conexion.execute(
            text(
                """
                UPDATE cotizacion_lineas
                SET categoria = CASE
                    WHEN categoria IN ('combustible', 'logistica', 'pago_guia', 'peajes') THEN 'transporte'
                    WHEN categoria = 'alimentacion' THEN 'alimentacion'
                    WHEN categoria IN ('pasaje', 'hospedaje', 'transporte', 'extra', 'otro') THEN categoria
                    ELSE 'otro'
                END
                """
            )
        )
        conexion.execute(
            text(
                f"ALTER TABLE cotizacion_lineas "
                f"MODIFY COLUMN categoria ENUM({ENUM_FINAL}) NOT NULL DEFAULT 'pasaje'"
            )
        )
        conexion.execute(
            text(
                """
                UPDATE cotizacion_lineas
                SET
                    cantidad = COALESCE(cantidad, 1.00),
                    unidad = CASE
                        WHEN unidad IS NULL OR TRIM(unidad) = '' THEN 'personas'
                        ELSE unidad
                    END,
                    precio_unitario_eur = COALESCE(precio_unitario_eur, monto_eur),
                    descripcion = CASE
                        WHEN descripcion IS NULL OR TRIM(descripcion) = '' THEN
                            CASE categoria
                                WHEN 'pasaje' THEN 'Pasaje'
                                WHEN 'hospedaje' THEN 'Hospedaje'
                                WHEN 'alimentacion' THEN 'Alimentación'
                                WHEN 'transporte' THEN 'Transporte'
                                WHEN 'extra' THEN 'Extra'
                                ELSE 'Servicio'
                            END
                        ELSE descripcion
                    END
                """
            )
        )
        conexion.execute(
            text(
                "ALTER TABLE cotizacion_lineas "
                "MODIFY COLUMN precio_unitario_eur NUMERIC(12, 2) NOT NULL"
            )
        )
    motor.dispose()
    print("Listo. cotizacion_lineas ahora guarda cantidad, unidad y precio unitario.")


if __name__ == "__main__":
    migrar()
