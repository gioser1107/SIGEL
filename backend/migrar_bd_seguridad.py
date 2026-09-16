"""Separa usuarios, roles, permisos y bitácora hacia la base de seguridad.

Conserva los datos de negocio. Ejecutar una vez desde backend/:

    python migrar_bd_seguridad.py
"""

from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import create_engine, text

directorio_backend = Path(__file__).resolve().parent
sys.path.insert(0, str(directorio_backend))

from database import (  # noqa: E402
    TABLAS_SEGURIDAD,
    asegurar_bases,
    nombre_bd,
    nombre_bd_seguridad,
    url_mysql,
)

ORDEN_COPIA = ("roles", "permisos", "roles_permisos", "usuarios", "bitacora")
ORDEN_BORRADO = ("bitacora", "roles_permisos", "usuarios", "permisos", "roles")
FKS_NEGOCIO_A_USUARIO = (
    ("abordajes_viaje", "registrado_por"),
    ("clientes", "usuario_id"),
    ("clientes", "creado_por"),
    ("clientes", "actualizado_por"),
    ("pagos", "creado_por"),
    ("pagos", "validado_por"),
    ("puntos_recogida", "creado_por"),
    ("reservas", "creado_por"),
    ("viajes_guias", "usuario_id"),
)


def _existe_tabla(conexion, esquema: str, tabla: str) -> bool:
    fila = conexion.execute(
        text(
            "SELECT 1 FROM information_schema.TABLES "
            "WHERE TABLE_SCHEMA = :esquema AND TABLE_NAME = :tabla"
        ),
        {"esquema": esquema, "tabla": tabla},
    ).first()
    return fila is not None


def _fks_hacia(conexion, esquema: str, tabla_ref: str, esquema_ref: str | None = None) -> list[tuple[str, str, str]]:
    destino = esquema_ref or esquema
    filas = conexion.execute(
        text(
            "SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME "
            "FROM information_schema.KEY_COLUMN_USAGE "
            "WHERE TABLE_SCHEMA = :esquema "
            "AND REFERENCED_TABLE_SCHEMA = :destino "
            "AND REFERENCED_TABLE_NAME = :tabla "
            "AND REFERENCED_COLUMN_NAME IS NOT NULL"
        ),
        {"esquema": esquema, "destino": destino, "tabla": tabla_ref},
    ).fetchall()
    return [(str(f[0]), str(f[1]), str(f[2])) for f in filas]


def _quitar_fk(conexion, esquema: str, tabla: str, constraint: str) -> None:
    conexion.execute(text(f"ALTER TABLE `{esquema}`.`{tabla}` DROP FOREIGN KEY `{constraint}`"))


def _crear_tabla_como(conexion, tabla: str) -> None:
    conexion.execute(text(f"DROP TABLE IF EXISTS `{nombre_bd_seguridad}`.`{tabla}`"))
    conexion.execute(
        text(
            f"CREATE TABLE `{nombre_bd_seguridad}`.`{tabla}` "
            f"LIKE `{nombre_bd}`.`{tabla}`"
        )
    )


def _copiar_tabla(conexion, tabla: str) -> int:
    columnas = conexion.execute(text(f"SHOW COLUMNS FROM `{nombre_bd_seguridad}`.`{tabla}`")).fetchall()
    nombres = [str(col[0]) for col in columnas]
    lista = ", ".join(f"`{nombre}`" for nombre in nombres)
    resultado = conexion.execute(
        text(
            f"INSERT INTO `{nombre_bd_seguridad}`.`{tabla}` ({lista}) "
            f"SELECT {lista} FROM `{nombre_bd}`.`{tabla}`"
        )
    )
    return resultado.rowcount or 0


def _poner_fks_internas(conexion) -> None:
    conexion.execute(
        text(
            f"ALTER TABLE `{nombre_bd_seguridad}`.`roles_permisos` "
            f"ADD CONSTRAINT `fk_rp_rol` FOREIGN KEY (`rol_id`) "
            f"REFERENCES `{nombre_bd_seguridad}`.`roles` (`id`), "
            f"ADD CONSTRAINT `fk_rp_permiso` FOREIGN KEY (`permiso_id`) "
            f"REFERENCES `{nombre_bd_seguridad}`.`permisos` (`id`)"
        )
    )
    conexion.execute(
        text(
            f"ALTER TABLE `{nombre_bd_seguridad}`.`usuarios` "
            f"ADD CONSTRAINT `fk_usuarios_rol` FOREIGN KEY (`rol_id`) "
            f"REFERENCES `{nombre_bd_seguridad}`.`roles` (`id`)"
        )
    )
    conexion.execute(
        text(
            f"ALTER TABLE `{nombre_bd_seguridad}`.`bitacora` "
            f"ADD CONSTRAINT `fk_bitacora_usuario` FOREIGN KEY (`usuario_id`) "
            f"REFERENCES `{nombre_bd_seguridad}`.`usuarios` (`id`)"
        )
    )


def _reapuntar_fks_negocio(conexion) -> None:
    for tabla, _columna, constraint in _fks_hacia(conexion, nombre_bd, "usuarios", nombre_bd):
        _quitar_fk(conexion, nombre_bd, tabla, constraint)
        print(f"  drop FK {tabla}.{constraint}")

    for tabla, columna in FKS_NEGOCIO_A_USUARIO:
        if not _existe_tabla(conexion, nombre_bd, tabla):
            continue
        nuevo = f"fk_{tabla}_{columna}_seg"
        try:
            conexion.execute(
                text(
                    f"ALTER TABLE `{nombre_bd}`.`{tabla}` "
                    f"ADD CONSTRAINT `{nuevo}` FOREIGN KEY (`{columna}`) "
                    f"REFERENCES `{nombre_bd_seguridad}`.`usuarios` (`id`)"
                )
            )
            print(f"  add FK {tabla}.{columna} → {nombre_bd_seguridad}.usuarios")
        except Exception as error:
            print(f"  aviso {tabla}.{columna}: {error}")


def migrar() -> None:
    asegurar_bases()
    motor = create_engine(url_mysql(), pool_pre_ping=True)
    with motor.connect() as conexion:
        conexion = conexion.execution_options(isolation_level="AUTOCOMMIT")
        conexion.execute(text("SET FOREIGN_KEY_CHECKS = 0"))

        origen_ok = _existe_tabla(conexion, nombre_bd, "usuarios")
        if not origen_ok:
            conexion.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
            if _existe_tabla(conexion, nombre_bd_seguridad, "usuarios"):
                print(f"Ya está separado: {nombre_bd_seguridad} tiene usuarios y {nombre_bd} no.")
                conexion.execute(text(f"DROP VIEW IF EXISTS `{nombre_bd}`.`v_bitacora_listado`"))
                return
            raise SystemExit(
                f"No encontré {nombre_bd}.usuarios. "
                "Usa sembrar_base_limpia.py --aplicar o importa instalacion/travel_bqto_limpia.sql."
            )

        print("Copiando estructura y datos hacia", nombre_bd_seguridad)
        for tabla in reversed(ORDEN_COPIA):
            if _existe_tabla(conexion, nombre_bd_seguridad, tabla):
                conexion.execute(text(f"DROP TABLE IF EXISTS `{nombre_bd_seguridad}`.`{tabla}`"))
        for tabla in ORDEN_COPIA:
            if not _existe_tabla(conexion, nombre_bd, tabla):
                print(f"  {tabla}: no está en {nombre_bd}, se omite")
                continue
            _crear_tabla_como(conexion, tabla)
            copiados = _copiar_tabla(conexion, tabla)
            print(f"  {tabla}: {copiados} filas copiadas")

        _poner_fks_internas(conexion)
        conexion.execute(text(f"DROP VIEW IF EXISTS `{nombre_bd}`.`v_bitacora_listado`"))
        conexion.execute(
            text(
                f"CREATE OR REPLACE VIEW `{nombre_bd_seguridad}`.`v_bitacora_listado` AS "
                "SELECT b.id, b.creado_en, b.modulo, b.accion, b.tabla_afectada, b.registro_id, "
                "b.resumen, b.ip_origen, b.usuario_id, "
                "CONCAT(u.nombre, ' ', u.apellido) AS usuario_nombre, u.correo AS usuario_correo "
                f"FROM `{nombre_bd_seguridad}`.`bitacora` b "
                f"LEFT JOIN `{nombre_bd_seguridad}`.`usuarios` u ON u.id = b.usuario_id"
            )
        )
        print("Reapuntando claves foráneas de negocio → seguridad")
        _reapuntar_fks_negocio(conexion)

        print("Eliminando tablas de seguridad en", nombre_bd)
        for tabla_ref in ("usuarios", "roles", "permisos"):
            for tabla, _columna, constraint in _fks_hacia(conexion, nombre_bd, tabla_ref, nombre_bd):
                if tabla in TABLAS_SEGURIDAD:
                    _quitar_fk(conexion, nombre_bd, tabla, constraint)

        for tabla in ORDEN_BORRADO:
            if _existe_tabla(conexion, nombre_bd, tabla):
                conexion.execute(text(f"DROP TABLE `{nombre_bd}`.`{tabla}`"))
                print(f"  drop {nombre_bd}.{tabla}")

        conexion.execute(text("SET FOREIGN_KEY_CHECKS = 1"))

    motor.dispose()
    print("Listo. Seguridad quedó en", nombre_bd_seguridad, "y el negocio en", nombre_bd)


if __name__ == "__main__":
    migrar()
