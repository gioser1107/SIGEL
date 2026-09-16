"""Vistas y triggers de las dos bases (idempotente)."""

from __future__ import annotations

from sqlalchemy import create_engine, text

from database import nombre_bd, nombre_bd_seguridad, url_mysql

PREFIJO_TRIGGER = "trg_sigel_"

# tabla, esquema, módulo bitácora, columnas PK, tiene eliminado_en
TABLAS_AUDITORIA = (
    ("usuarios", nombre_bd_seguridad, "seguridad", ("id",), True),
    ("roles", nombre_bd_seguridad, "seguridad", ("id",), True),
    ("permisos", nombre_bd_seguridad, "seguridad", ("id",), True),
    ("roles_permisos", nombre_bd_seguridad, "seguridad", ("rol_id", "permiso_id"), True),
    ("clientes", nombre_bd, "catalogo", ("id",), True),
    ("destinos", nombre_bd, "catalogo", ("id",), True),
    ("viajes", nombre_bd, "viajes", ("id",), True),
    ("unidades_transporte", nombre_bd, "viajes", ("id",), True),
    ("reservas", nombre_bd, "reservas", ("id",), True),
    ("reserva_clientes", nombre_bd, "reservas", ("id",), True),
    ("asientos_reservados", nombre_bd, "reservas", ("id",), True),
    ("pagos", nombre_bd, "pagos", ("id",), True),
    ("cotizaciones", nombre_bd, "cotizaciones", ("id",), True),
    ("abordajes_viaje", nombre_bd, "abordaje", ("id",), True),
)


def _pk_sql(alias: str, columnas: tuple[str, ...]) -> str:
    if len(columnas) == 1:
        return f"CAST({alias}.{columnas[0]} AS CHAR)"
    partes = ", '-', ".join(f"{alias}.{col}" for col in columnas)
    return f"CONCAT({partes})"


def _sql_vistas() -> list[str]:
    return [
        f"""
CREATE OR REPLACE VIEW `{nombre_bd_seguridad}`.`v_bitacora_listado` AS
SELECT
  b.id,
  b.creado_en,
  b.modulo,
  b.accion,
  b.tabla_afectada,
  b.registro_id,
  b.resumen,
  b.ip_origen,
  b.usuario_id,
  CONCAT(u.nombre, ' ', u.apellido) AS usuario_nombre,
  u.correo AS usuario_correo
FROM `{nombre_bd_seguridad}`.`bitacora` b
LEFT JOIN `{nombre_bd_seguridad}`.`usuarios` u ON u.id = b.usuario_id
""".strip(),
        f"""
CREATE OR REPLACE VIEW `{nombre_bd}`.`v_reserva_totales_eur` AS
SELECT
  r.id AS reserva_id,
  COALESCE(SUM(rc.precio_pasajero_eur + rc.recargo_eur), 0.00) AS total_eur
FROM `{nombre_bd}`.`reservas` r
LEFT JOIN `{nombre_bd}`.`reserva_clientes` rc
  ON rc.reserva_id = r.id AND rc.eliminado_en IS NULL
WHERE r.eliminado_en IS NULL
GROUP BY r.id
""".strip(),
        f"""
CREATE OR REPLACE VIEW `{nombre_bd}`.`v_ocupacion_viaje` AS
SELECT
  v.id AS viaje_id,
  v.destino_id,
  v.unidad_id,
  COUNT(DISTINCT ar.id) AS asientos_ocupados
FROM `{nombre_bd}`.`viajes` v
LEFT JOIN `{nombre_bd}`.`asientos_reservados` ar
  ON ar.viaje_id = v.id AND ar.eliminado_en IS NULL
WHERE v.eliminado_en IS NULL
GROUP BY v.id, v.destino_id, v.unidad_id
""".strip(),
    ]


def _sql_auditoria_insert(tabla: str, esquema: str, modulo: str, pks: tuple[str, ...]) -> str:
    nombre = f"{PREFIJO_TRIGGER}{tabla}_ai"
    pk = _pk_sql("NEW", pks)
    return f"""
CREATE TRIGGER `{esquema}`.`{nombre}`
AFTER INSERT ON `{esquema}`.`{tabla}`
FOR EACH ROW
INSERT INTO `{nombre_bd_seguridad}`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  '{modulo}',
  'INSERT',
  '{tabla}',
  {pk},
  CONCAT('Alta en {tabla} #', {pk}),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)
""".strip()


def _sql_auditoria_update(
    tabla: str, esquema: str, modulo: str, pks: tuple[str, ...], tiene_eliminado: bool
) -> str:
    nombre = f"{PREFIJO_TRIGGER}{tabla}_au"
    pk = _pk_sql("NEW", pks)
    if tiene_eliminado:
        cuerpo = f"""BEGIN
  DECLARE v_accion VARCHAR(16);
  IF NEW.eliminado_en IS NOT NULL AND OLD.eliminado_en IS NULL THEN
    SET v_accion = 'DELETE';
  ELSE
    SET v_accion = 'UPDATE';
  END IF;
  INSERT INTO `{nombre_bd_seguridad}`.`bitacora`
    (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
  VALUES (
    @sigel_usuario_id,
    '{modulo}',
    v_accion,
    '{tabla}',
    {pk},
    CONCAT(IF(v_accion = 'DELETE', 'Baja lógica', 'Cambio'), ' en {tabla} #', {pk}),
    JSON_OBJECT('origen', 'trigger'),
    NULLIF(@sigel_ip, ''),
    UTC_TIMESTAMP()
  );
END"""
    else:
        cuerpo = f"""INSERT INTO `{nombre_bd_seguridad}`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  '{modulo}',
  'UPDATE',
  '{tabla}',
  {pk},
  CONCAT('Cambio en {tabla} #', {pk}),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)"""
    return f"""
CREATE TRIGGER `{esquema}`.`{nombre}`
AFTER UPDATE ON `{esquema}`.`{tabla}`
FOR EACH ROW
{cuerpo}
""".strip()


def _sql_auditoria_delete(tabla: str, esquema: str, modulo: str, pks: tuple[str, ...]) -> str:
    nombre = f"{PREFIJO_TRIGGER}{tabla}_ad"
    pk = _pk_sql("OLD", pks)
    return f"""
CREATE TRIGGER `{esquema}`.`{nombre}`
AFTER DELETE ON `{esquema}`.`{tabla}`
FOR EACH ROW
INSERT INTO `{nombre_bd_seguridad}`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  '{modulo}',
  'DELETE',
  '{tabla}',
  {pk},
  CONCAT('Borrado físico en {tabla} #', {pk}),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)
""".strip()


def _sql_integridad() -> list[tuple[str, str]]:
    return [
        (nombre_bd_seguridad, f"""
CREATE TRIGGER `{nombre_bd_seguridad}`.`{PREFIJO_TRIGGER}roles_bu`
BEFORE UPDATE ON `{nombre_bd_seguridad}`.`roles`
FOR EACH ROW
BEGIN
  IF LOWER(OLD.nombre) IN ('administrador', 'admin') THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'El rol Administrador es intocable: no se puede editar.';
  END IF;
END
""".strip()),
        (nombre_bd_seguridad, f"""
CREATE TRIGGER `{nombre_bd_seguridad}`.`{PREFIJO_TRIGGER}roles_bd`
BEFORE DELETE ON `{nombre_bd_seguridad}`.`roles`
FOR EACH ROW
BEGIN
  IF LOWER(OLD.nombre) IN ('administrador', 'admin') THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'El rol Administrador es intocable: no se puede eliminar.';
  END IF;
END
""".strip()),
        (nombre_bd_seguridad, f"""
CREATE TRIGGER `{nombre_bd_seguridad}`.`{PREFIJO_TRIGGER}usuarios_bu`
BEFORE UPDATE ON `{nombre_bd_seguridad}`.`usuarios`
FOR EACH ROW
BEGIN
  IF NEW.eliminado_en IS NOT NULL AND OLD.eliminado_en IS NULL
     AND EXISTS (
       SELECT 1 FROM `{nombre_bd_seguridad}`.`roles` r
       WHERE r.id = OLD.rol_id AND LOWER(r.nombre) IN ('administrador', 'admin')
     ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'El usuario Administrador es intocable: no se puede eliminar.';
  END IF;
END
""".strip()),
        (nombre_bd_seguridad, f"""
CREATE TRIGGER `{nombre_bd_seguridad}`.`{PREFIJO_TRIGGER}bitacora_bd`
BEFORE DELETE ON `{nombre_bd_seguridad}`.`bitacora`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'La bitácora es de solo lectura: no se puede borrar.';
END
""".strip()),
        (nombre_bd, f"""
CREATE TRIGGER `{nombre_bd}`.`{PREFIJO_TRIGGER}pagos_bi`
BEFORE INSERT ON `{nombre_bd}`.`pagos`
FOR EACH ROW
BEGIN
  IF NEW.monto <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'El monto del pago debe ser mayor a cero.';
  END IF;
END
""".strip()),
        (nombre_bd, f"""
CREATE TRIGGER `{nombre_bd}`.`{PREFIJO_TRIGGER}pagos_bu`
BEFORE UPDATE ON `{nombre_bd}`.`pagos`
FOR EACH ROW
BEGIN
  IF NEW.monto <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'El monto del pago debe ser mayor a cero.';
  END IF;
END
""".strip()),
    ]


def _sql_triggers() -> list[tuple[str, str]]:
    sentencias = []
    for tabla, esquema, modulo, pks, tiene_eliminado in TABLAS_AUDITORIA:
        sentencias.append((esquema, _sql_auditoria_insert(tabla, esquema, modulo, pks)))
        sentencias.append((esquema, _sql_auditoria_update(tabla, esquema, modulo, pks, tiene_eliminado)))
        sentencias.append((esquema, _sql_auditoria_delete(tabla, esquema, modulo, pks)))
    sentencias.extend(_sql_integridad())
    return sentencias


def _nombres_triggers() -> list[tuple[str, str]]:
    nombres = []
    for tabla, esquema, _modulo, _pks, _elim in TABLAS_AUDITORIA:
        for sufijo in ("ai", "au", "ad"):
            nombres.append((esquema, f"{PREFIJO_TRIGGER}{tabla}_{sufijo}"))
    for esquema, extra in (
        (nombre_bd_seguridad, f"{PREFIJO_TRIGGER}roles_bu"),
        (nombre_bd_seguridad, f"{PREFIJO_TRIGGER}roles_bd"),
        (nombre_bd_seguridad, f"{PREFIJO_TRIGGER}usuarios_bu"),
        (nombre_bd_seguridad, f"{PREFIJO_TRIGGER}bitacora_bd"),
        (nombre_bd, f"{PREFIJO_TRIGGER}pagos_bi"),
        (nombre_bd, f"{PREFIJO_TRIGGER}pagos_bu"),
    ):
        nombres.append((esquema, extra))
    return nombres


def aplicar_objetos_mysql() -> dict:
    """Crea/recrea vistas y triggers. Seguro de ejecutar varias veces."""
    motor = create_engine(url_mysql(nombre_bd), pool_pre_ping=True)
    creados = 0
    with motor.connect() as conexion:
        conexion = conexion.execution_options(isolation_level="AUTOCOMMIT")
        for vista_sql in _sql_vistas():
            conexion.execute(text(vista_sql))
        for esquema, nombre in _nombres_triggers():
            conexion.execute(text(f"DROP TRIGGER IF EXISTS `{esquema}`.`{nombre}`"))
        for _esquema, trigger_sql in _sql_triggers():
            conexion.execute(text(trigger_sql))
            creados += 1
    motor.dispose()
    return {
        "vistas": 3,
        "triggers": creados,
        "bases": {"seguridad": nombre_bd_seguridad, "negocio": nombre_bd},
    }


def sql_para_archivo() -> str:
    """SQL con DELIMITER para importar con el cliente mysql."""
    partes = [
        "-- SIGEL: vistas y triggers (seguridad + negocio)",
        "SET NAMES utf8mb4;",
        "",
    ]
    partes.extend(sql + ";" for sql in _sql_vistas())
    partes.append("")
    partes.append("DELIMITER $$")
    for esquema, nombre in _nombres_triggers():
        partes.append(f"DROP TRIGGER IF EXISTS `{esquema}`.`{nombre}`$$")
    for esquema, trigger_sql in _sql_triggers():
        partes.append(trigger_sql + "$$")
    partes.append("DELIMITER ;")
    partes.append("")
    return "\n\n".join(partes)


if __name__ == "__main__":
    resultado = aplicar_objetos_mysql()
    print("Vistas:", resultado["vistas"], "Triggers:", resultado["triggers"])
