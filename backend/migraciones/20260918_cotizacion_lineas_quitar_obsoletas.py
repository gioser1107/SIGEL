"""Quita categoria y descripcion de cotizacion_lineas. El texto queda en concepto.

Desde backend/:

    python migraciones/20260918_cotizacion_lineas_quitar_obsoletas.py
"""

from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import create_engine, text

directorio_backend = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(directorio_backend))

from database import nombre_bd, url_mysql  # noqa: E402


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
        tiene_concepto = _tiene_columna(conexion, "cotizacion_lineas", "concepto")
        tiene_descripcion = _tiene_columna(conexion, "cotizacion_lineas", "descripcion")
        tiene_categoria = _tiene_columna(conexion, "cotizacion_lineas", "categoria")

        if not tiene_concepto and tiene_descripcion:
            if tiene_categoria:
                conexion.execute(
                    text(
                        """
                        UPDATE cotizacion_lineas
                        SET descripcion = CASE categoria
                            WHEN 'pasaje' THEN 'Pasaje'
                            WHEN 'hospedaje' THEN 'Hospedaje'
                            WHEN 'alimentacion' THEN 'Alimentación'
                            WHEN 'transporte' THEN 'Transporte'
                            WHEN 'extra' THEN 'Extra'
                            WHEN 'combustible' THEN 'Transporte'
                            WHEN 'logistica' THEN 'Transporte'
                            WHEN 'pago_guia' THEN 'Transporte'
                            WHEN 'peajes' THEN 'Transporte'
                            ELSE 'Servicio'
                        END
                        WHERE descripcion IS NULL OR TRIM(descripcion) = ''
                        """
                    )
                )
            else:
                conexion.execute(
                    text(
                        """
                        UPDATE cotizacion_lineas
                        SET descripcion = 'Servicio'
                        WHERE descripcion IS NULL OR TRIM(descripcion) = ''
                        """
                    )
                )
            conexion.execute(
                text(
                    "ALTER TABLE cotizacion_lineas "
                    "CHANGE descripcion concepto VARCHAR(255) NOT NULL"
                )
            )
            tiene_concepto = True
            tiene_descripcion = False
        elif not tiene_concepto:
            conexion.execute(
                text(
                    "ALTER TABLE cotizacion_lineas "
                    "ADD COLUMN concepto VARCHAR(255) NOT NULL DEFAULT 'Servicio' "
                    "AFTER cotizacion_id"
                )
            )
            tiene_concepto = True

        if tiene_descripcion:
            conexion.execute(
                text(
                    """
                    UPDATE cotizacion_lineas
                    SET concepto = descripcion
                    WHERE (concepto IS NULL OR TRIM(concepto) = '')
                      AND descripcion IS NOT NULL
                      AND TRIM(descripcion) <> ''
                    """
                )
            )
            conexion.execute(text("ALTER TABLE cotizacion_lineas DROP COLUMN descripcion"))

        if tiene_categoria:
            conexion.execute(text("ALTER TABLE cotizacion_lineas DROP COLUMN categoria"))

        if _tiene_columna(conexion, "cotizacion_lineas", "concepto"):
            conexion.execute(
                text(
                    "ALTER TABLE cotizacion_lineas "
                    "MODIFY concepto VARCHAR(255) NOT NULL AFTER cotizacion_id"
                )
            )

    motor.dispose()
    print("Listo. Se quitaron categoria y descripcion; el texto quedó en concepto.")


if __name__ == "__main__":
    migrar()
