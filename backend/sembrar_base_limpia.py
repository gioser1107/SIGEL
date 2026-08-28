"""Genera e importa la base limpia de entrega: esquema + roles + usuarios + catálogos.

No incluye destinos, viajes, reservas, pagos ni bitácora de prueba.
Ejecutar desde backend/:  python sembrar_base_limpia.py
Opciones:
  --sql-solo     solo escribe instalacion/travel_bqto_limpia.sql
  --aplicar      crea/reemplaza la BD MySQL local (usa backend/.env)
"""

from __future__ import annotations

import argparse
import hashlib
import sys
from datetime import datetime
from pathlib import Path

from sqlalchemy.dialects import mysql
from sqlalchemy.schema import CreateTable

directorio_backend = Path(__file__).resolve().parent
sys.path.insert(0, str(directorio_backend))

from database import Base  # noqa: E402
from modelos.permiso_modelo import (  # noqa: E402
    PERMISO_BORRAR_ABORDAJE,
    PERMISO_BORRAR_BITACORA,
    PERMISO_BORRAR_CLIENTES,
    PERMISO_BORRAR_CONCILIACION,
    PERMISO_BORRAR_COTIZACIONES,
    PERMISO_BORRAR_DESTINOS,
    PERMISO_BORRAR_PERMISOS,
    PERMISO_BORRAR_PLANIFICACION,
    PERMISO_BORRAR_PUNTOS_RECOGIDA,
    PERMISO_BORRAR_REPORTES_PAGO,
    PERMISO_BORRAR_RESENAS,
    PERMISO_BORRAR_RESERVAS,
    PERMISO_BORRAR_ROLES,
    PERMISO_BORRAR_TRANSPORTE_FLOTA,
    PERMISO_BORRAR_USUARIOS,
    PERMISO_CREAR_ABORDAJE,
    PERMISO_CREAR_BITACORA,
    PERMISO_CREAR_CLIENTES,
    PERMISO_CREAR_CONCILIACION,
    PERMISO_CREAR_COTIZACIONES,
    PERMISO_CREAR_DESTINOS,
    PERMISO_CREAR_PERMISOS,
    PERMISO_CREAR_PLANIFICACION,
    PERMISO_CREAR_PUNTOS_RECOGIDA,
    PERMISO_CREAR_REPORTES_PAGO,
    PERMISO_CREAR_RESENAS,
    PERMISO_CREAR_RESERVAS,
    PERMISO_CREAR_ROLES,
    PERMISO_CREAR_TRANSPORTE_FLOTA,
    PERMISO_CREAR_USUARIOS,
    PERMISO_EDITAR_ABORDAJE,
    PERMISO_EDITAR_BITACORA,
    PERMISO_EDITAR_CLIENTES,
    PERMISO_EDITAR_CONCILIACION,
    PERMISO_EDITAR_COTIZACIONES,
    PERMISO_EDITAR_DESTINOS,
    PERMISO_EDITAR_PERMISOS,
    PERMISO_EDITAR_PLANIFICACION,
    PERMISO_EDITAR_PUNTOS_RECOGIDA,
    PERMISO_EDITAR_REPORTES_PAGO,
    PERMISO_EDITAR_RESENAS,
    PERMISO_EDITAR_RESERVAS,
    PERMISO_EDITAR_ROLES,
    PERMISO_EDITAR_TRANSPORTE_FLOTA,
    PERMISO_EDITAR_USUARIOS,
    PERMISO_LEER_ABORDAJE,
    PERMISO_LEER_BITACORA,
    PERMISO_LEER_CLIENTES,
    PERMISO_LEER_CONCILIACION,
    PERMISO_LEER_COTIZACIONES,
    PERMISO_LEER_DESTINOS,
    PERMISO_LEER_PERMISOS,
    PERMISO_LEER_PLANIFICACION,
    PERMISO_LEER_PUNTOS_RECOGIDA,
    PERMISO_LEER_REPORTES_PAGO,
    PERMISO_LEER_RESENAS,
    PERMISO_LEER_RESERVAS,
    PERMISO_LEER_ROLES,
    PERMISO_LEER_TRANSPORTE_FLOTA,
    PERMISO_LEER_USUARIOS,
)

# Registrar todas las tablas en Base.metadata
import modelos.abordaje_viaje_modelo  # noqa: E402,F401
import modelos.asiento_modelo  # noqa: E402,F401
import modelos.asiento_reservado_modelo  # noqa: E402,F401
import modelos.banco_modelo  # noqa: E402,F401
import modelos.bitacora_modelo  # noqa: E402,F401
import modelos.ciudad_modelo  # noqa: E402,F401
import modelos.cliente_modelo  # noqa: E402,F401
import modelos.costo_operativo_modelo  # noqa: E402,F401
import modelos.cotizacion_linea_modelo  # noqa: E402,F401
import modelos.cotizacion_modelo  # noqa: E402,F401
import modelos.destino_imagen_modelo  # noqa: E402,F401
import modelos.destino_modelo  # noqa: E402,F401
import modelos.estado_modelo  # noqa: E402,F401
import modelos.metodo_pago_modelo  # noqa: E402,F401
import modelos.moneda_modelo  # noqa: E402,F401
import modelos.pago_modelo  # noqa: E402,F401
import modelos.permiso_modelo  # noqa: E402,F401
import modelos.punto_recogida_modelo  # noqa: E402,F401
import modelos.punto_venta_modelo  # noqa: E402,F401
import modelos.resena_modelo  # noqa: E402,F401
import modelos.reserva_cliente_modelo  # noqa: E402,F401
import modelos.reservas_modelo  # noqa: E402,F401
import modelos.rol_modelo  # noqa: E402,F401
import modelos.rol_permiso_modelo  # noqa: E402,F401
import modelos.tasa_modelo  # noqa: E402,F401
import modelos.unidad_transporte_modelo  # noqa: E402,F401
import modelos.usuario_modelo  # noqa: E402,F401
import modelos.viaje_guia_modelo  # noqa: E402,F401
import modelos.viaje_modelo  # noqa: E402,F401
import modelos.viaje_ruta_recogida_modelo  # noqa: E402,F401

CONTRASENA_ENTREGA = "TravelBqto2026"
HASH_CONTRASENA = hashlib.sha256(CONTRASENA_ENTREGA.encode("utf-8")).hexdigest()
RUTA_SQL = directorio_backend.parent / "instalacion" / "travel_bqto_limpia.sql"
AHORA = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

TODOS_LOS_PERMISOS = [
    PERMISO_CREAR_USUARIOS, PERMISO_LEER_USUARIOS, PERMISO_EDITAR_USUARIOS, PERMISO_BORRAR_USUARIOS,
    PERMISO_CREAR_PERMISOS, PERMISO_LEER_PERMISOS, PERMISO_EDITAR_PERMISOS, PERMISO_BORRAR_PERMISOS,
    PERMISO_CREAR_ROLES, PERMISO_LEER_ROLES, PERMISO_EDITAR_ROLES, PERMISO_BORRAR_ROLES,
    PERMISO_CREAR_REPORTES_PAGO, PERMISO_LEER_REPORTES_PAGO, PERMISO_EDITAR_REPORTES_PAGO, PERMISO_BORRAR_REPORTES_PAGO,
    PERMISO_CREAR_CONCILIACION, PERMISO_LEER_CONCILIACION, PERMISO_EDITAR_CONCILIACION, PERMISO_BORRAR_CONCILIACION,
    PERMISO_CREAR_COTIZACIONES, PERMISO_LEER_COTIZACIONES, PERMISO_EDITAR_COTIZACIONES, PERMISO_BORRAR_COTIZACIONES,
    PERMISO_CREAR_PLANIFICACION, PERMISO_LEER_PLANIFICACION, PERMISO_EDITAR_PLANIFICACION, PERMISO_BORRAR_PLANIFICACION,
    PERMISO_CREAR_TRANSPORTE_FLOTA, PERMISO_LEER_TRANSPORTE_FLOTA, PERMISO_EDITAR_TRANSPORTE_FLOTA, PERMISO_BORRAR_TRANSPORTE_FLOTA,
    PERMISO_CREAR_RESERVAS, PERMISO_LEER_RESERVAS, PERMISO_EDITAR_RESERVAS, PERMISO_BORRAR_RESERVAS,
    PERMISO_CREAR_DESTINOS, PERMISO_LEER_DESTINOS, PERMISO_EDITAR_DESTINOS, PERMISO_BORRAR_DESTINOS,
    PERMISO_CREAR_BITACORA, PERMISO_LEER_BITACORA, PERMISO_EDITAR_BITACORA, PERMISO_BORRAR_BITACORA,
    PERMISO_CREAR_ABORDAJE, PERMISO_LEER_ABORDAJE, PERMISO_EDITAR_ABORDAJE, PERMISO_BORRAR_ABORDAJE,
    PERMISO_CREAR_CLIENTES, PERMISO_LEER_CLIENTES, PERMISO_EDITAR_CLIENTES, PERMISO_BORRAR_CLIENTES,
    PERMISO_CREAR_PUNTOS_RECOGIDA, PERMISO_LEER_PUNTOS_RECOGIDA, PERMISO_EDITAR_PUNTOS_RECOGIDA, PERMISO_BORRAR_PUNTOS_RECOGIDA,
    PERMISO_CREAR_RESENAS, PERMISO_LEER_RESENAS, PERMISO_EDITAR_RESENAS, PERMISO_BORRAR_RESENAS,
]

PERMISOS_GUIA = [
    PERMISO_LEER_PLANIFICACION,
    PERMISO_LEER_RESERVAS,
    PERMISO_LEER_CLIENTES,
    PERMISO_LEER_ABORDAJE,
    PERMISO_CREAR_ABORDAJE,
    PERMISO_EDITAR_ABORDAJE,
    PERMISO_LEER_PUNTOS_RECOGIDA,
]

ESTADOS_CIUDADES = [
    ("Amazonas", ["Puerto Ayacucho"]),
    ("Anzoátegui", ["Barcelona", "Puerto La Cruz", "Lechería"]),
    ("Apure", ["San Fernando de Apure"]),
    ("Aragua", ["Maracay", "Turmero"]),
    ("Barinas", ["Barinas"]),
    ("Bolívar", ["Ciudad Bolívar", "Puerto Ordaz"]),
    ("Carabobo", ["Valencia", "Puerto Cabello"]),
    ("Cojedes", ["San Carlos"]),
    ("Delta Amacuro", ["Tucupita"]),
    ("Distrito Capital", ["Caracas"]),
    ("Falcón", ["Coro", "Punto Fijo"]),
    ("Guárico", ["San Juan de los Morros"]),
    ("Lara", ["Barquisimeto", "Cabudare", "Carora", "El Tocuyo", "Quíbor", "Duaca"]),
    ("La Guaira", ["La Guaira"]),
    ("Mérida", ["Mérida"]),
    ("Miranda", ["Los Teques", "Guarenas", "Guatire"]),
    ("Monagas", ["Maturín"]),
    ("Nueva Esparta", ["La Asunción", "Porlamar"]),
    ("Portuguesa", ["Guanare", "Acarigua"]),
    ("Sucre", ["Cumaná"]),
    ("Táchira", ["San Cristóbal"]),
    ("Trujillo", ["Trujillo", "Valera"]),
    ("Yaracuy", ["San Felipe"]),
    ("Zulia", ["Maracaibo", "Cabimas"]),
]


def _sql(valor) -> str:
    if valor is None:
        return "NULL"
    texto = str(valor).replace("\\", "\\\\").replace("'", "''")
    return f"'{texto}'"


def _tablas():
    return list(Base.metadata.sorted_tables)


def _ddl_tablas() -> list[str]:
    dialecto = mysql.dialect()
    lineas = []
    for tabla in _tablas():
        tabla.kwargs.setdefault("mysql_engine", "InnoDB")
        tabla.kwargs.setdefault("mysql_charset", "utf8mb4")
        ddl = str(CreateTable(tabla).compile(dialect=dialecto)).strip().rstrip(";")
        ddl = ddl.replace(")ENGINE=", ") ENGINE=")
        lineas.append(ddl + ";")
        lineas.append("")
    return lineas


def _indices_3fn() -> list[str]:
    return [
        "ALTER TABLE reserva_clientes ADD COLUMN cliente_activo_reserva BIGINT GENERATED ALWAYS AS (IF(eliminado_en IS NULL, cliente_id, NULL)) STORED;",
        "CREATE UNIQUE INDEX uq_reserva_cliente_vigente ON reserva_clientes (reserva_id, cliente_activo_reserva);",
        "ALTER TABLE asientos_reservados ADD COLUMN asiento_activo_viaje BIGINT GENERATED ALWAYS AS (IF(eliminado_en IS NULL, asiento_id, NULL)) STORED;",
        "CREATE UNIQUE INDEX uq_asiento_viaje_vigente ON asientos_reservados (viaje_id, asiento_activo_viaje);",
    ]


def _inserts() -> list[str]:
    lineas = [
        "-- Roles",
        "INSERT INTO roles (id, nombre, descripcion, creado_en, actualizado_en) VALUES",
        f"  (1, 'Administrador', 'Acceso completo al panel', {_sql(AHORA)}, {_sql(AHORA)}),",
        f"  (2, 'Guia', 'Guía de viaje: planificación y abordaje', {_sql(AHORA)}, {_sql(AHORA)}),",
        f"  (3, 'Cliente', 'Portal de pasajeros', {_sql(AHORA)}, {_sql(AHORA)});",
        "",
        "-- Permisos",
        "INSERT INTO permisos (id, descripcion, creado_en, actualizado_en) VALUES",
    ]
    filas_permiso = []
    for i, codigo in enumerate(TODOS_LOS_PERMISOS, start=1):
        filas_permiso.append(f"  ({i}, {_sql(codigo)}, {_sql(AHORA)}, {_sql(AHORA)})")
    lineas.append(",\n".join(filas_permiso) + ";")
    lineas.append("")

    mapa_permiso = {codigo: i for i, codigo in enumerate(TODOS_LOS_PERMISOS, start=1)}
    asignaciones = [(1, mapa_permiso[c]) for c in TODOS_LOS_PERMISOS]
    asignaciones += [(2, mapa_permiso[c]) for c in PERMISOS_GUIA]

    lineas.append("-- Permisos por rol (Administrador = todos, Guía = operación de viaje)")
    lineas.append("INSERT INTO roles_permisos (rol_id, permiso_id, creado_en, actualizado_en) VALUES")
    filas_rp = [f"  ({rol}, {perm}, {_sql(AHORA)}, {_sql(AHORA)})" for rol, perm in asignaciones]
    lineas.append(",\n".join(filas_rp) + ";")
    lineas.append("")

    lineas.append("-- Usuarios de entrega (misma contraseña inicial)")
    lineas.append(
        "INSERT INTO usuarios (id, rol_id, correo, hash_contrasena, nombre, apellido, telefono, creado_en, actualizado_en) VALUES\n"
        f"  (1, 1, 'admin@travelbqto.com', {_sql(HASH_CONTRASENA)}, 'Admin', 'Travel', '02510000000', {_sql(AHORA)}, {_sql(AHORA)}),\n"
        f"  (2, 2, 'guia@travelbqto.com', {_sql(HASH_CONTRASENA)}, 'Guia', 'Operativo', '04120000000', {_sql(AHORA)}, {_sql(AHORA)}),\n"
        f"  (3, 3, 'cliente@travelbqto.com', {_sql(HASH_CONTRASENA)}, 'Cliente', 'Demo', '04240000000', {_sql(AHORA)}, {_sql(AHORA)});"
    )
    lineas.append("")

    lineas.append("-- Estados y ciudades de Venezuela")
    filas_estado = []
    filas_ciudad = []
    ciudad_id = 1
    lara_id = None
    barquisimeto_id = None
    for estado_id, (estado, ciudades) in enumerate(ESTADOS_CIUDADES, start=1):
        filas_estado.append(f"  ({estado_id}, {_sql(estado)}, {_sql(AHORA)}, {_sql(AHORA)})")
        if estado == "Lara":
            lara_id = estado_id
        for ciudad in ciudades:
            filas_ciudad.append(
                f"  ({ciudad_id}, {estado_id}, {_sql(ciudad)}, {_sql(AHORA)}, {_sql(AHORA)})"
            )
            if estado == "Lara" and ciudad == "Barquisimeto":
                barquisimeto_id = ciudad_id
            ciudad_id += 1
    lineas.append("INSERT INTO estados (id, nombre, creado_en, actualizado_en) VALUES")
    lineas.append(",\n".join(filas_estado) + ";")
    lineas.append("")
    lineas.append("INSERT INTO ciudades (id, estado_id, nombre, creado_en, actualizado_en) VALUES")
    lineas.append(",\n".join(filas_ciudad) + ";")
    lineas.append("")

    lineas.append("-- Cliente de demo vinculado al usuario portal")
    lineas.append(
        "INSERT INTO clientes (id, usuario_id, tipo_cliente, tipo_documento, numero_documento, "
        "nombre, apellido, telefono, estado_id, ciudad_id, creado_por, actualizado_por, creado_en, actualizado_en) VALUES\n"
        f"  (1, 3, 'natural', 'V', '12345678', 'Cliente', 'Demo', '04240000000', "
        f"{lara_id}, {barquisimeto_id}, 1, 1, {_sql(AHORA)}, {_sql(AHORA)});"
    )
    lineas.append("")

    lineas.append("-- Monedas")
    lineas.append(
        "INSERT INTO monedas (id, codigo, nombre, simbolo) VALUES\n"
        "  (1, 'EUR', 'Euro', '€'),\n"
        "  (2, 'USD', 'Dólar estadounidense', 'US$'),\n"
        "  (3, 'VES', 'Bolívar', 'Bs');"
    )
    lineas.append("")

    lineas.append("-- Métodos de pago")
    lineas.append(
        "INSERT INTO metodos_pago (id, codigo, nombre, moneda_id) VALUES\n"
        "  (1, 'efectivo_bs', 'Efectivo en bolívares', 3),\n"
        "  (2, 'efectivo_usd', 'Efectivo en dólares', 2),\n"
        "  (3, 'pago_movil', 'Pago móvil', 3),\n"
        "  (4, 'transferencia', 'Transferencia bancaria', 3),\n"
        "  (5, 'zelle', 'Zelle', 2),\n"
        "  (6, 'tpv', 'Punto de venta', 3);"
    )
    lineas.append("")

    lineas.append("-- Bancos y un punto de venta")
    lineas.append(
        "INSERT INTO bancos (id, codigo, nombre, activo, creado_en, actualizado_en) VALUES\n"
        f"  (1, '0102', 'Banco de Venezuela', 1, {_sql(AHORA)}, {_sql(AHORA)}),\n"
        f"  (2, '0134', 'Banesco', 1, {_sql(AHORA)}, {_sql(AHORA)}),\n"
        f"  (3, '0105', 'Mercantil', 1, {_sql(AHORA)}, {_sql(AHORA)}),\n"
        f"  (4, '0108', 'Provincial', 1, {_sql(AHORA)}, {_sql(AHORA)});"
    )
    lineas.append("")
    lineas.append(
        "INSERT INTO puntos_venta (id, banco_id, codigo, nombre, numero_terminal, activo, creado_en, actualizado_en) VALUES\n"
        f"  (1, 2, 'POS-OFI', 'Punto oficina Travel BQTO', '001', 1, {_sql(AHORA)}, {_sql(AHORA)});"
    )
    lineas.append("")

    lineas.append("-- Tasa EUR del día de importación (actualizar en Pagos > Tasas)")
    lineas.append(
        "INSERT INTO tasas (id, fecha, valor, moneda_id) VALUES\n"
        "  (1, CURDATE(), 160.0000, 1);"
    )
    lineas.append("")

    lineas.append("-- Parada de recogida habitual")
    lineas.append(
        "INSERT INTO puntos_recogida (id, nombre, direccion, ciudad, estado, tipo, activo, creado_por, creado_en, actualizado_en) VALUES\n"
        f"  (1, 'Obelisco', 'Av. Florencio Jiménez', 'Barquisimeto', 'Lara', 'parada', 1, 1, {_sql(AHORA)}, {_sql(AHORA)});"
    )
    lineas.append("")
    return lineas


def generar_sql() -> str:
    partes = [
        "-- SIGEL / Travel BQTO — base limpia de entrega",
        "-- Esquema + roles + usuarios + catálogos. Sin destinos, viajes, reservas ni pagos.",
        f"-- Contraseña inicial de todos los usuarios: {CONTRASENA_ENTREGA}",
        "SET NAMES utf8mb4;",
        "SET FOREIGN_KEY_CHECKS = 0;",
        "DROP DATABASE IF EXISTS travel_bqto;",
        "CREATE DATABASE travel_bqto CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
        "USE travel_bqto;",
        "",
        *_ddl_tablas(),
        *_indices_3fn(),
        "",
        *_inserts(),
        "SET FOREIGN_KEY_CHECKS = 1;",
        "",
    ]
    return "\n".join(partes)


def escribir_sql() -> Path:
    RUTA_SQL.parent.mkdir(parents=True, exist_ok=True)
    RUTA_SQL.write_text(generar_sql(), encoding="utf-8")
    return RUTA_SQL


def aplicar_mysql() -> None:
    from sqlalchemy import create_engine as crear
    from sqlalchemy import text

    from database import contrasena_bd, host_bd, puerto_bd, usuario_bd

    sql = generar_sql()
    sentencias = [
        s.strip()
        for s in sql.split(";")
        if s.strip() and not s.strip().startswith("--")
    ]
    url_sin_bd = f"mysql+pymysql://{usuario_bd}:{contrasena_bd}@{host_bd}:{puerto_bd}/"
    motor_raiz = crear(url_sin_bd, pool_pre_ping=True)
    with motor_raiz.connect() as conexion:
        conexion = conexion.execution_options(isolation_level="AUTOCOMMIT")
        for sentencia in sentencias:
            if sentencia.upper().startswith("SET NAMES"):
                continue
            conexion.execute(text(sentencia))
    print("Base travel_bqto creada e importada en MySQL local.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Base limpia SIGEL")
    parser.add_argument("--sql-solo", action="store_true")
    parser.add_argument(
        "--aplicar",
        action="store_true",
        help="BORRA travel_bqto local y carga la base limpia. No uses esto en tu PC de trabajo.",
    )
    args = parser.parse_args()
    ruta = escribir_sql()
    print(f"SQL escrito en {ruta}")
    print("Usuarios:")
    print(f"  admin@travelbqto.com   / {CONTRASENA_ENTREGA}  (Administrador)")
    print(f"  guia@travelbqto.com    / {CONTRASENA_ENTREGA}  (Guía)")
    print(f"  cliente@travelbqto.com / {CONTRASENA_ENTREGA}  (Portal cliente)")
    if args.aplicar:
        print("ADVERTENCIA: esto borra la base travel_bqto de este MySQL.")
        aplicar_mysql()
    elif not args.sql_solo:
        print("Para regenerar el SQL: python sembrar_base_limpia.py --sql-solo")


if __name__ == "__main__":
    main()
