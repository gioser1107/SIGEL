"""Aplica columnas y el rol ATC sobre una base ya existente. Idempotente."""

from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy import text

from database import SessionLocal, engine, nombre_bd, nombre_bd_seguridad

logger = logging.getLogger("sigel")

ROL_ATC = "Atencion al Cliente"
CORREO_ATC = "atc@travelbqto.com"
CONTRASENA_ENTREGA = "TravelBqto2026"

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

PERMISOS_OPERACIONES = (
    "crear_planificacion", "leer_planificacion", "editar_planificacion", "borrar_planificacion",
    "crear_transporte_flota", "leer_transporte_flota", "editar_transporte_flota", "borrar_transporte_flota",
    "crear_destinos", "leer_destinos", "editar_destinos", "borrar_destinos",
    "crear_abordaje", "leer_abordaje", "editar_abordaje", "borrar_abordaje",
    "leer_reservas", "leer_clientes",
    "leer_puntos_recogida", "crear_puntos_recogida", "editar_puntos_recogida",
)

PERMISOS_GERENCIA = (
    "leer_clientes", "leer_reservas", "leer_cotizaciones", "leer_planificacion",
    "leer_destinos", "leer_transporte_flota", "leer_abordaje", "leer_puntos_recogida",
    "leer_resenas", "leer_reportes_pago", "leer_conciliacion", "leer_bitacora",
)

ROLES_HISTORIA = (
    {
        "nombre": ROL_ATC,
        "descripcion": "Atención al cliente: ventas, reservas, cotizaciones y pagos. Sin WhatsApp.",
        "correo": CORREO_ATC,
        "nombre_usuario": "Atencion",
        "apellido": "Cliente",
        "telefono": "04160000000",
        "permisos": PERMISOS_ATC,
    },
    {
        "nombre": "Operaciones",
        "descripcion": "Logística: planificación, flota, destinos y abordaje.",
        "correo": "operaciones@travelbqto.com",
        "nombre_usuario": "Operaciones",
        "apellido": "Travel",
        "telefono": "02510000001",
        "permisos": PERMISOS_OPERACIONES,
    },
    {
        "nombre": "Gerencia",
        "descripcion": "Consulta gerencial: reportes, bitácora y conciliación. Sin cambios operativos.",
        "correo": "gerencia@travelbqto.com",
        "nombre_usuario": "Gerencia",
        "apellido": "Travel",
        "telefono": "02510000002",
        "permisos": PERMISOS_GERENCIA,
    },
)

COLUMNAS = (
    (nombre_bd, "clientes", "contacto_emergencia_nombre", "VARCHAR(120) NULL"),
    (nombre_bd, "clientes", "contacto_emergencia_telefono", "VARCHAR(30) NULL"),
    (nombre_bd, "destinos", "extra_hospedaje_particular_eur", "DECIMAL(12,2) NOT NULL DEFAULT 0.00"),
    (nombre_bd, "reserva_clientes", "fecha_nacimiento", "DATE NULL"),
    (nombre_bd, "reserva_clientes", "partida_nacimiento_url", "VARCHAR(512) NULL"),
    (nombre_bd, "reservas", "modalidad", "VARCHAR(20) NOT NULL DEFAULT 'individual'"),
    (nombre_bd, "reservas", "tipo_hospedaje", "VARCHAR(20) NOT NULL DEFAULT 'compartido'"),
    (nombre_bd, "reservas", "plazo_correccion_hasta", "DATETIME NULL"),
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
    if not _tiene_tabla(conexion, nombre_bd, "boletos"):
        conexion.execute(
            text(
                f"""
                CREATE TABLE `{nombre_bd}`.`boletos` (
                  `id` BIGINT NOT NULL AUTO_INCREMENT,
                  `reserva_id` BIGINT NOT NULL,
                  `codigo` VARCHAR(40) NOT NULL,
                  `estado` VARCHAR(20) NOT NULL DEFAULT 'emitido',
                  `emitido_en` DATETIME NOT NULL,
                  `anulado_en` DATETIME NULL,
                  `creado_en` DATETIME NOT NULL,
                  `actualizado_en` DATETIME NOT NULL,
                  PRIMARY KEY (`id`),
                  UNIQUE KEY `uq_boleto_reserva` (`reserva_id`),
                  UNIQUE KEY `uq_boleto_codigo` (`codigo`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """
            )
        )
    if not _tiene_tabla(conexion, nombre_bd, "viaje_incidencias"):
        conexion.execute(
            text(
                f"""
                CREATE TABLE `{nombre_bd}`.`viaje_incidencias` (
                  `id` BIGINT NOT NULL AUTO_INCREMENT,
                  `viaje_id` BIGINT NOT NULL,
                  `tipo` VARCHAR(30) NOT NULL,
                  `descripcion` TEXT NOT NULL,
                  `ocurrio_en` DATETIME NOT NULL,
                  `registrado_por` BIGINT NULL,
                  `creado_en` DATETIME NOT NULL,
                  `actualizado_en` DATETIME NOT NULL,
                  `eliminado_en` DATETIME NULL,
                  PRIMARY KEY (`id`),
                  KEY `ix_viaje_incidencias_viaje` (`viaje_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """
            )
        )


def _sembrar_roles_historia() -> None:
    from modelos.permiso_modelo import Permiso
    from modelos.rol_modelo import Rol
    from modelos.rol_permiso_modelo import RolPermiso
    from modelos.usuario_modelo import Usuario, hashear_contrasena

    db = SessionLocal()
    try:
        ahora = datetime.now()
        hash_clave = hashear_contrasena(CONTRASENA_ENTREGA)
        mapa_permisos = {
            p.descripcion: p
            for p in db.query(Permiso).filter(Permiso.eliminado_en.is_(None)).all()
        }

        for spec in ROLES_HISTORIA:
            rol = (
                db.query(Rol)
                .filter(Rol.nombre == spec["nombre"], Rol.eliminado_en.is_(None))
                .first()
            )
            if rol is None:
                rol = Rol(
                    nombre=spec["nombre"],
                    descripcion=spec["descripcion"],
                    creado_en=ahora,
                    actualizado_en=ahora,
                )
                db.add(rol)
                db.flush()

            existentes = {
                rp.permiso_id
                for rp in db.query(RolPermiso).filter(
                    RolPermiso.rol_id == rol.id,
                    RolPermiso.eliminado_en.is_(None),
                ).all()
            }
            for codigo in spec["permisos"]:
                permiso = mapa_permisos.get(codigo)
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
                .filter(Usuario.correo == spec["correo"], Usuario.eliminado_en.is_(None))
                .first()
            )
            if usuario is None:
                db.add(
                    Usuario(
                        rol_id=rol.id,
                        correo=spec["correo"],
                        hash_contrasena=hash_clave,
                        nombre=spec["nombre_usuario"],
                        apellido=spec["apellido"],
                        telefono=spec["telefono"],
                        creado_en=ahora,
                        actualizado_en=ahora,
                    )
                )

        db.commit()
    except Exception:
        db.rollback()
        logger.exception("No se pudieron sembrar los roles de la historia hablada")
        raise
    finally:
        db.close()


def aplicar_historia_hablada() -> None:
    with engine.begin() as conexion:
        _agregar_columnas(conexion)
        _crear_tablas_credito(conexion)
    try:
        _sembrar_roles_historia()
    except Exception:
        logger.exception("Sembrado de roles de historia omitido")
