"""Aplica columnas y el rol ATC sobre una base ya existente. Idempotente."""

from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy import text

from database import SessionLocal, engine, nombre_bd, nombre_bd_seguridad

logger = logging.getLogger("sigel")

ROL_ATC = "Atencion al Cliente"
CORREO_ATC = "atc@travelbqto.com"

PERMISOS_ATC = (
    "crear_clientes", "leer_clientes", "editar_clientes", "borrar_clientes",
    "crear_reservas", "leer_reservas", "editar_reservas", "borrar_reservas",
    "crear_cotizaciones", "leer_cotizaciones", "editar_cotizaciones", "borrar_cotizaciones",
    "crear_reportes_pago", "leer_reportes_pago", "editar_reportes_pago",
    "leer_conciliacion", "editar_conciliacion",
    "leer_destinos",
    "leer_planificacion",
    "leer_abordaje", "crear_abordaje", "editar_abordaje",
    "leer_resenas",
    "leer_puntos_recogida", "crear_puntos_recogida", "editar_puntos_recogida",
)

COLUMNAS = (
    (nombre_bd, "clientes", "contacto_emergencia_nombre", "VARCHAR(120) NULL"),
    (nombre_bd, "clientes", "contacto_emergencia_telefono", "VARCHAR(30) NULL"),
    (nombre_bd, "destinos", "extra_hospedaje_particular_eur", "DECIMAL(12,2) NOT NULL DEFAULT 0.00"),
    (nombre_bd, "reserva_clientes", "fecha_nacimiento", "DATE NULL"),
    (nombre_bd, "reserva_clientes", "partida_nacimiento_url", "VARCHAR(512) NULL"),
    (nombre_bd, "reservas", "modalidad", "VARCHAR(20) NOT NULL DEFAULT 'individual'"),
    (nombre_bd, "reservas", "tipo_hospedaje", "VARCHAR(20) NOT NULL DEFAULT 'compartido'"),
    (nombre_bd, "resenas", "calificacion_guia", "SMALLINT NULL"),
    (nombre_bd, "cotizaciones", "modalidad", "VARCHAR(20) NOT NULL DEFAULT 'propio'"),
)


def _tiene_columna(conexion, esquema: str, tabla: str, columna: str) -> bool:
    return bool(
        conexion.execute(
            text(
                "SELECT COUNT(*) FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA = :e AND TABLE_NAME = :t AND COLUMN_NAME = :c"
            ),
            {"e": esquema, "t": tabla, "c": columna},
        ).scalar()
    )


def _tiene_tabla(conexion, esquema: str, tabla: str) -> bool:
    return bool(
        conexion.execute(
            text(
                "SELECT COUNT(*) FROM information_schema.TABLES "
                "WHERE TABLE_SCHEMA = :e AND TABLE_NAME = :t"
            ),
            {"e": esquema, "t": tabla},
        ).scalar()
    )


def _agregar_columnas(conexion) -> None:
    for esquema, tabla, columna, ddl in COLUMNAS:
        if not _tiene_tabla(conexion, esquema, tabla):
            continue
        if _tiene_columna(conexion, esquema, tabla, columna):
            continue
        conexion.execute(text(f"ALTER TABLE `{esquema}`.`{tabla}` ADD COLUMN `{columna}` {ddl}"))
        logger.info("Columna agregada: %s.%s.%s", esquema, tabla, columna)


def _crear_tablas_credito(conexion) -> None:
    if not _tiene_tabla(conexion, nombre_bd, "creditos_cliente"):
        conexion.execute(
            text(
                f"""
                CREATE TABLE `{nombre_bd}`.`creditos_cliente` (
                  `id` BIGINT NOT NULL AUTO_INCREMENT,
                  `cliente_id` BIGINT NOT NULL,
                  `reserva_origen_id` BIGINT NULL,
                  `monto_eur` DECIMAL(12,2) NOT NULL,
                  `saldo_restante_eur` DECIMAL(12,2) NOT NULL,
                  `motivo` VARCHAR(80) NOT NULL DEFAULT 'cancelacion_sin_reembolso',
                  `notas` VARCHAR(255) NULL,
                  `creado_por` BIGINT NULL,
                  `creado_en` DATETIME NOT NULL,
                  `actualizado_en` DATETIME NOT NULL,
                  `eliminado_en` DATETIME NULL,
                  PRIMARY KEY (`id`),
                  KEY `ix_creditos_cliente_cliente` (`cliente_id`),
                  KEY `ix_creditos_cliente_origen` (`reserva_origen_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """
            )
        )
    if not _tiene_tabla(conexion, nombre_bd, "creditos_aplicados"):
        conexion.execute(
            text(
                f"""
                CREATE TABLE `{nombre_bd}`.`creditos_aplicados` (
                  `id` BIGINT NOT NULL AUTO_INCREMENT,
                  `credito_id` BIGINT NOT NULL,
                  `reserva_destino_id` BIGINT NOT NULL,
                  `monto_eur` DECIMAL(12,2) NOT NULL,
                  `creado_por` BIGINT NULL,
                  `creado_en` DATETIME NOT NULL,
                  PRIMARY KEY (`id`),
                  KEY `ix_creditos_aplicados_credito` (`credito_id`),
                  KEY `ix_creditos_aplicados_reserva` (`reserva_destino_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """
            )
        )


def _sembrar_atc() -> None:
    from modelos.permiso_modelo import Permiso
    from modelos.rol_modelo import Rol
    from modelos.rol_permiso_modelo import RolPermiso
    from modelos.usuario_modelo import Usuario, hashear_contrasena

    contrasena_entrega = "TravelBqto2026"

    db = SessionLocal()
    try:
        ahora = datetime.now()
        rol = (
            db.query(Rol)
            .filter(Rol.nombre == ROL_ATC, Rol.eliminado_en.is_(None))
            .first()
        )
        if rol is None:
            rol = Rol(
                nombre=ROL_ATC,
                descripcion="Atención al cliente: ventas, reservas, cotizaciones y pagos. Sin WhatsApp.",
                creado_en=ahora,
                actualizado_en=ahora,
            )
            db.add(rol)
            db.flush()

        permisos = {
            p.descripcion: p
            for p in db.query(Permiso).filter(Permiso.eliminado_en.is_(None)).all()
        }
        existentes = {
            rp.permiso_id
            for rp in db.query(RolPermiso).filter(
                RolPermiso.rol_id == rol.id,
                RolPermiso.eliminado_en.is_(None),
            ).all()
        }
        for codigo in PERMISOS_ATC:
            permiso = permisos.get(codigo)
            if permiso is None or permiso.id in existentes:
                continue
            db.add(
                RolPermiso(
                    rol_id=rol.id,
                    permiso_id=permiso.id,
                    creado_en=ahora,
                    actualizado_en=ahora,
                )
            )
            existentes.add(permiso.id)

        usuario = (
            db.query(Usuario)
            .filter(Usuario.correo == CORREO_ATC, Usuario.eliminado_en.is_(None))
            .first()
        )
        if usuario is None:
            db.add(
                Usuario(
                    rol_id=rol.id,
                    correo=CORREO_ATC,
                    hash_contrasena=hashear_contrasena(contrasena_entrega),
                    nombre="Atencion",
                    apellido="Cliente",
                    telefono="04160000000",
                    creado_en=ahora,
                    actualizado_en=ahora,
                )
            )
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("No se pudo sembrar el rol ATC")
    finally:
        db.close()


def aplicar_historia_hablada() -> None:
    with engine.begin() as conexion:
        _agregar_columnas(conexion)
        _crear_tablas_credito(conexion)
    try:
        _sembrar_atc()
    except Exception:
        logger.exception("Sembrado ATC omitido")
