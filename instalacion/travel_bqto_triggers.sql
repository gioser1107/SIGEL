-- SIGEL: vistas y triggers (seguridad + negocio)

SET NAMES utf8mb4;



CREATE OR REPLACE VIEW `travel_bqto_seguridad`.`v_bitacora_listado` AS
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
FROM `travel_bqto_seguridad`.`bitacora` b
LEFT JOIN `travel_bqto_seguridad`.`usuarios` u ON u.id = b.usuario_id;

CREATE OR REPLACE VIEW `travel_bqto`.`v_reserva_totales_eur` AS
SELECT
  r.id AS reserva_id,
  COALESCE(SUM(rc.precio_pasajero_eur + rc.recargo_eur), 0.00) AS total_eur
FROM `travel_bqto`.`reservas` r
LEFT JOIN `travel_bqto`.`reserva_clientes` rc
  ON rc.reserva_id = r.id AND rc.eliminado_en IS NULL
WHERE r.eliminado_en IS NULL
GROUP BY r.id;

CREATE OR REPLACE VIEW `travel_bqto`.`v_ocupacion_viaje` AS
SELECT
  v.id AS viaje_id,
  v.destino_id,
  v.unidad_id,
  COUNT(DISTINCT ar.id) AS asientos_ocupados
FROM `travel_bqto`.`viajes` v
LEFT JOIN `travel_bqto`.`asientos_reservados` ar
  ON ar.viaje_id = v.id AND ar.eliminado_en IS NULL
WHERE v.eliminado_en IS NULL
GROUP BY v.id, v.destino_id, v.unidad_id;



DELIMITER $$

DROP TRIGGER IF EXISTS `travel_bqto_seguridad`.`trg_sigel_usuarios_ai`$$

DROP TRIGGER IF EXISTS `travel_bqto_seguridad`.`trg_sigel_usuarios_au`$$

DROP TRIGGER IF EXISTS `travel_bqto_seguridad`.`trg_sigel_usuarios_ad`$$

DROP TRIGGER IF EXISTS `travel_bqto_seguridad`.`trg_sigel_roles_ai`$$

DROP TRIGGER IF EXISTS `travel_bqto_seguridad`.`trg_sigel_roles_au`$$

DROP TRIGGER IF EXISTS `travel_bqto_seguridad`.`trg_sigel_roles_ad`$$

DROP TRIGGER IF EXISTS `travel_bqto_seguridad`.`trg_sigel_permisos_ai`$$

DROP TRIGGER IF EXISTS `travel_bqto_seguridad`.`trg_sigel_permisos_au`$$

DROP TRIGGER IF EXISTS `travel_bqto_seguridad`.`trg_sigel_permisos_ad`$$

DROP TRIGGER IF EXISTS `travel_bqto_seguridad`.`trg_sigel_roles_permisos_ai`$$

DROP TRIGGER IF EXISTS `travel_bqto_seguridad`.`trg_sigel_roles_permisos_au`$$

DROP TRIGGER IF EXISTS `travel_bqto_seguridad`.`trg_sigel_roles_permisos_ad`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_clientes_ai`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_clientes_au`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_clientes_ad`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_destinos_ai`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_destinos_au`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_destinos_ad`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_viajes_ai`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_viajes_au`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_viajes_ad`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_unidades_transporte_ai`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_unidades_transporte_au`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_unidades_transporte_ad`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_reservas_ai`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_reservas_au`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_reservas_ad`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_reserva_clientes_ai`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_reserva_clientes_au`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_reserva_clientes_ad`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_asientos_reservados_ai`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_asientos_reservados_au`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_asientos_reservados_ad`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_pagos_ai`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_pagos_au`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_pagos_ad`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_cotizaciones_ai`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_cotizaciones_au`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_cotizaciones_ad`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_abordajes_viaje_ai`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_abordajes_viaje_au`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_abordajes_viaje_ad`$$

DROP TRIGGER IF EXISTS `travel_bqto_seguridad`.`trg_sigel_roles_bu`$$

DROP TRIGGER IF EXISTS `travel_bqto_seguridad`.`trg_sigel_roles_bd`$$

DROP TRIGGER IF EXISTS `travel_bqto_seguridad`.`trg_sigel_usuarios_bu`$$

DROP TRIGGER IF EXISTS `travel_bqto_seguridad`.`trg_sigel_bitacora_bd`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_pagos_bi`$$

DROP TRIGGER IF EXISTS `travel_bqto`.`trg_sigel_pagos_bu`$$

CREATE TRIGGER `travel_bqto_seguridad`.`trg_sigel_usuarios_ai`
AFTER INSERT ON `travel_bqto_seguridad`.`usuarios`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'seguridad',
  'INSERT',
  'usuarios',
  CAST(NEW.id AS CHAR),
  CONCAT('Alta en usuarios #', CAST(NEW.id AS CHAR)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto_seguridad`.`trg_sigel_usuarios_au`
AFTER UPDATE ON `travel_bqto_seguridad`.`usuarios`
FOR EACH ROW
BEGIN
  DECLARE v_accion VARCHAR(16);
  IF NEW.eliminado_en IS NOT NULL AND OLD.eliminado_en IS NULL THEN
    SET v_accion = 'DELETE';
  ELSE
    SET v_accion = 'UPDATE';
  END IF;
  INSERT INTO `travel_bqto_seguridad`.`bitacora`
    (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
  VALUES (
    @sigel_usuario_id,
    'seguridad',
    v_accion,
    'usuarios',
    CAST(NEW.id AS CHAR),
    CONCAT(IF(v_accion = 'DELETE', 'Baja lógica', 'Cambio'), ' en usuarios #', CAST(NEW.id AS CHAR)),
    JSON_OBJECT('origen', 'trigger'),
    NULLIF(@sigel_ip, ''),
    UTC_TIMESTAMP()
  );
END$$

CREATE TRIGGER `travel_bqto_seguridad`.`trg_sigel_usuarios_ad`
AFTER DELETE ON `travel_bqto_seguridad`.`usuarios`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'seguridad',
  'DELETE',
  'usuarios',
  CAST(OLD.id AS CHAR),
  CONCAT('Borrado físico en usuarios #', CAST(OLD.id AS CHAR)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto_seguridad`.`trg_sigel_roles_ai`
AFTER INSERT ON `travel_bqto_seguridad`.`roles`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'seguridad',
  'INSERT',
  'roles',
  CAST(NEW.id AS CHAR),
  CONCAT('Alta en roles #', CAST(NEW.id AS CHAR)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto_seguridad`.`trg_sigel_roles_au`
AFTER UPDATE ON `travel_bqto_seguridad`.`roles`
FOR EACH ROW
BEGIN
  DECLARE v_accion VARCHAR(16);
  IF NEW.eliminado_en IS NOT NULL AND OLD.eliminado_en IS NULL THEN
    SET v_accion = 'DELETE';
  ELSE
    SET v_accion = 'UPDATE';
  END IF;
  INSERT INTO `travel_bqto_seguridad`.`bitacora`
    (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
  VALUES (
    @sigel_usuario_id,
    'seguridad',
    v_accion,
    'roles',
    CAST(NEW.id AS CHAR),
    CONCAT(IF(v_accion = 'DELETE', 'Baja lógica', 'Cambio'), ' en roles #', CAST(NEW.id AS CHAR)),
    JSON_OBJECT('origen', 'trigger'),
    NULLIF(@sigel_ip, ''),
    UTC_TIMESTAMP()
  );
END$$

CREATE TRIGGER `travel_bqto_seguridad`.`trg_sigel_roles_ad`
AFTER DELETE ON `travel_bqto_seguridad`.`roles`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'seguridad',
  'DELETE',
  'roles',
  CAST(OLD.id AS CHAR),
  CONCAT('Borrado físico en roles #', CAST(OLD.id AS CHAR)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto_seguridad`.`trg_sigel_permisos_ai`
AFTER INSERT ON `travel_bqto_seguridad`.`permisos`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'seguridad',
  'INSERT',
  'permisos',
  CAST(NEW.id AS CHAR),
  CONCAT('Alta en permisos #', CAST(NEW.id AS CHAR)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto_seguridad`.`trg_sigel_permisos_au`
AFTER UPDATE ON `travel_bqto_seguridad`.`permisos`
FOR EACH ROW
BEGIN
  DECLARE v_accion VARCHAR(16);
  IF NEW.eliminado_en IS NOT NULL AND OLD.eliminado_en IS NULL THEN
    SET v_accion = 'DELETE';
  ELSE
    SET v_accion = 'UPDATE';
  END IF;
  INSERT INTO `travel_bqto_seguridad`.`bitacora`
    (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
  VALUES (
    @sigel_usuario_id,
    'seguridad',
    v_accion,
    'permisos',
    CAST(NEW.id AS CHAR),
    CONCAT(IF(v_accion = 'DELETE', 'Baja lógica', 'Cambio'), ' en permisos #', CAST(NEW.id AS CHAR)),
    JSON_OBJECT('origen', 'trigger'),
    NULLIF(@sigel_ip, ''),
    UTC_TIMESTAMP()
  );
END$$

CREATE TRIGGER `travel_bqto_seguridad`.`trg_sigel_permisos_ad`
AFTER DELETE ON `travel_bqto_seguridad`.`permisos`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'seguridad',
  'DELETE',
  'permisos',
  CAST(OLD.id AS CHAR),
  CONCAT('Borrado físico en permisos #', CAST(OLD.id AS CHAR)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto_seguridad`.`trg_sigel_roles_permisos_ai`
AFTER INSERT ON `travel_bqto_seguridad`.`roles_permisos`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'seguridad',
  'INSERT',
  'roles_permisos',
  CONCAT(NEW.rol_id, '-', NEW.permiso_id),
  CONCAT('Alta en roles_permisos #', CONCAT(NEW.rol_id, '-', NEW.permiso_id)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto_seguridad`.`trg_sigel_roles_permisos_au`
AFTER UPDATE ON `travel_bqto_seguridad`.`roles_permisos`
FOR EACH ROW
BEGIN
  DECLARE v_accion VARCHAR(16);
  IF NEW.eliminado_en IS NOT NULL AND OLD.eliminado_en IS NULL THEN
    SET v_accion = 'DELETE';
  ELSE
    SET v_accion = 'UPDATE';
  END IF;
  INSERT INTO `travel_bqto_seguridad`.`bitacora`
    (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
  VALUES (
    @sigel_usuario_id,
    'seguridad',
    v_accion,
    'roles_permisos',
    CONCAT(NEW.rol_id, '-', NEW.permiso_id),
    CONCAT(IF(v_accion = 'DELETE', 'Baja lógica', 'Cambio'), ' en roles_permisos #', CONCAT(NEW.rol_id, '-', NEW.permiso_id)),
    JSON_OBJECT('origen', 'trigger'),
    NULLIF(@sigel_ip, ''),
    UTC_TIMESTAMP()
  );
END$$

CREATE TRIGGER `travel_bqto_seguridad`.`trg_sigel_roles_permisos_ad`
AFTER DELETE ON `travel_bqto_seguridad`.`roles_permisos`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'seguridad',
  'DELETE',
  'roles_permisos',
  CONCAT(OLD.rol_id, '-', OLD.permiso_id),
  CONCAT('Borrado físico en roles_permisos #', CONCAT(OLD.rol_id, '-', OLD.permiso_id)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_clientes_ai`
AFTER INSERT ON `travel_bqto`.`clientes`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'catalogo',
  'INSERT',
  'clientes',
  CAST(NEW.id AS CHAR),
  CONCAT('Alta en clientes #', CAST(NEW.id AS CHAR)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_clientes_au`
AFTER UPDATE ON `travel_bqto`.`clientes`
FOR EACH ROW
BEGIN
  DECLARE v_accion VARCHAR(16);
  IF NEW.eliminado_en IS NOT NULL AND OLD.eliminado_en IS NULL THEN
    SET v_accion = 'DELETE';
  ELSE
    SET v_accion = 'UPDATE';
  END IF;
  INSERT INTO `travel_bqto_seguridad`.`bitacora`
    (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
  VALUES (
    @sigel_usuario_id,
    'catalogo',
    v_accion,
    'clientes',
    CAST(NEW.id AS CHAR),
    CONCAT(IF(v_accion = 'DELETE', 'Baja lógica', 'Cambio'), ' en clientes #', CAST(NEW.id AS CHAR)),
    JSON_OBJECT('origen', 'trigger'),
    NULLIF(@sigel_ip, ''),
    UTC_TIMESTAMP()
  );
END$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_clientes_ad`
AFTER DELETE ON `travel_bqto`.`clientes`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'catalogo',
  'DELETE',
  'clientes',
  CAST(OLD.id AS CHAR),
  CONCAT('Borrado físico en clientes #', CAST(OLD.id AS CHAR)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_destinos_ai`
AFTER INSERT ON `travel_bqto`.`destinos`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'catalogo',
  'INSERT',
  'destinos',
  CAST(NEW.id AS CHAR),
  CONCAT('Alta en destinos #', CAST(NEW.id AS CHAR)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_destinos_au`
AFTER UPDATE ON `travel_bqto`.`destinos`
FOR EACH ROW
BEGIN
  DECLARE v_accion VARCHAR(16);
  IF NEW.eliminado_en IS NOT NULL AND OLD.eliminado_en IS NULL THEN
    SET v_accion = 'DELETE';
  ELSE
    SET v_accion = 'UPDATE';
  END IF;
  INSERT INTO `travel_bqto_seguridad`.`bitacora`
    (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
  VALUES (
    @sigel_usuario_id,
    'catalogo',
    v_accion,
    'destinos',
    CAST(NEW.id AS CHAR),
    CONCAT(IF(v_accion = 'DELETE', 'Baja lógica', 'Cambio'), ' en destinos #', CAST(NEW.id AS CHAR)),
    JSON_OBJECT('origen', 'trigger'),
    NULLIF(@sigel_ip, ''),
    UTC_TIMESTAMP()
  );
END$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_destinos_ad`
AFTER DELETE ON `travel_bqto`.`destinos`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'catalogo',
  'DELETE',
  'destinos',
  CAST(OLD.id AS CHAR),
  CONCAT('Borrado físico en destinos #', CAST(OLD.id AS CHAR)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_viajes_ai`
AFTER INSERT ON `travel_bqto`.`viajes`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'viajes',
  'INSERT',
  'viajes',
  CAST(NEW.id AS CHAR),
  CONCAT('Alta en viajes #', CAST(NEW.id AS CHAR)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_viajes_au`
AFTER UPDATE ON `travel_bqto`.`viajes`
FOR EACH ROW
BEGIN
  DECLARE v_accion VARCHAR(16);
  IF NEW.eliminado_en IS NOT NULL AND OLD.eliminado_en IS NULL THEN
    SET v_accion = 'DELETE';
  ELSE
    SET v_accion = 'UPDATE';
  END IF;
  INSERT INTO `travel_bqto_seguridad`.`bitacora`
    (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
  VALUES (
    @sigel_usuario_id,
    'viajes',
    v_accion,
    'viajes',
    CAST(NEW.id AS CHAR),
    CONCAT(IF(v_accion = 'DELETE', 'Baja lógica', 'Cambio'), ' en viajes #', CAST(NEW.id AS CHAR)),
    JSON_OBJECT('origen', 'trigger'),
    NULLIF(@sigel_ip, ''),
    UTC_TIMESTAMP()
  );
END$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_viajes_ad`
AFTER DELETE ON `travel_bqto`.`viajes`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'viajes',
  'DELETE',
  'viajes',
  CAST(OLD.id AS CHAR),
  CONCAT('Borrado físico en viajes #', CAST(OLD.id AS CHAR)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_unidades_transporte_ai`
AFTER INSERT ON `travel_bqto`.`unidades_transporte`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'viajes',
  'INSERT',
  'unidades_transporte',
  CAST(NEW.id AS CHAR),
  CONCAT('Alta en unidades_transporte #', CAST(NEW.id AS CHAR)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_unidades_transporte_au`
AFTER UPDATE ON `travel_bqto`.`unidades_transporte`
FOR EACH ROW
BEGIN
  DECLARE v_accion VARCHAR(16);
  IF NEW.eliminado_en IS NOT NULL AND OLD.eliminado_en IS NULL THEN
    SET v_accion = 'DELETE';
  ELSE
    SET v_accion = 'UPDATE';
  END IF;
  INSERT INTO `travel_bqto_seguridad`.`bitacora`
    (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
  VALUES (
    @sigel_usuario_id,
    'viajes',
    v_accion,
    'unidades_transporte',
    CAST(NEW.id AS CHAR),
    CONCAT(IF(v_accion = 'DELETE', 'Baja lógica', 'Cambio'), ' en unidades_transporte #', CAST(NEW.id AS CHAR)),
    JSON_OBJECT('origen', 'trigger'),
    NULLIF(@sigel_ip, ''),
    UTC_TIMESTAMP()
  );
END$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_unidades_transporte_ad`
AFTER DELETE ON `travel_bqto`.`unidades_transporte`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'viajes',
  'DELETE',
  'unidades_transporte',
  CAST(OLD.id AS CHAR),
  CONCAT('Borrado físico en unidades_transporte #', CAST(OLD.id AS CHAR)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_reservas_ai`
AFTER INSERT ON `travel_bqto`.`reservas`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'reservas',
  'INSERT',
  'reservas',
  CAST(NEW.id AS CHAR),
  CONCAT('Alta en reservas #', CAST(NEW.id AS CHAR)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_reservas_au`
AFTER UPDATE ON `travel_bqto`.`reservas`
FOR EACH ROW
BEGIN
  DECLARE v_accion VARCHAR(16);
  IF NEW.eliminado_en IS NOT NULL AND OLD.eliminado_en IS NULL THEN
    SET v_accion = 'DELETE';
  ELSE
    SET v_accion = 'UPDATE';
  END IF;
  INSERT INTO `travel_bqto_seguridad`.`bitacora`
    (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
  VALUES (
    @sigel_usuario_id,
    'reservas',
    v_accion,
    'reservas',
    CAST(NEW.id AS CHAR),
    CONCAT(IF(v_accion = 'DELETE', 'Baja lógica', 'Cambio'), ' en reservas #', CAST(NEW.id AS CHAR)),
    JSON_OBJECT('origen', 'trigger'),
    NULLIF(@sigel_ip, ''),
    UTC_TIMESTAMP()
  );
END$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_reservas_ad`
AFTER DELETE ON `travel_bqto`.`reservas`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'reservas',
  'DELETE',
  'reservas',
  CAST(OLD.id AS CHAR),
  CONCAT('Borrado físico en reservas #', CAST(OLD.id AS CHAR)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_reserva_clientes_ai`
AFTER INSERT ON `travel_bqto`.`reserva_clientes`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'reservas',
  'INSERT',
  'reserva_clientes',
  CAST(NEW.id AS CHAR),
  CONCAT('Alta en reserva_clientes #', CAST(NEW.id AS CHAR)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_reserva_clientes_au`
AFTER UPDATE ON `travel_bqto`.`reserva_clientes`
FOR EACH ROW
BEGIN
  DECLARE v_accion VARCHAR(16);
  IF NEW.eliminado_en IS NOT NULL AND OLD.eliminado_en IS NULL THEN
    SET v_accion = 'DELETE';
  ELSE
    SET v_accion = 'UPDATE';
  END IF;
  INSERT INTO `travel_bqto_seguridad`.`bitacora`
    (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
  VALUES (
    @sigel_usuario_id,
    'reservas',
    v_accion,
    'reserva_clientes',
    CAST(NEW.id AS CHAR),
    CONCAT(IF(v_accion = 'DELETE', 'Baja lógica', 'Cambio'), ' en reserva_clientes #', CAST(NEW.id AS CHAR)),
    JSON_OBJECT('origen', 'trigger'),
    NULLIF(@sigel_ip, ''),
    UTC_TIMESTAMP()
  );
END$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_reserva_clientes_ad`
AFTER DELETE ON `travel_bqto`.`reserva_clientes`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'reservas',
  'DELETE',
  'reserva_clientes',
  CAST(OLD.id AS CHAR),
  CONCAT('Borrado físico en reserva_clientes #', CAST(OLD.id AS CHAR)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_asientos_reservados_ai`
AFTER INSERT ON `travel_bqto`.`asientos_reservados`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'reservas',
  'INSERT',
  'asientos_reservados',
  CAST(NEW.id AS CHAR),
  CONCAT('Alta en asientos_reservados #', CAST(NEW.id AS CHAR)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_asientos_reservados_au`
AFTER UPDATE ON `travel_bqto`.`asientos_reservados`
FOR EACH ROW
BEGIN
  DECLARE v_accion VARCHAR(16);
  IF NEW.eliminado_en IS NOT NULL AND OLD.eliminado_en IS NULL THEN
    SET v_accion = 'DELETE';
  ELSE
    SET v_accion = 'UPDATE';
  END IF;
  INSERT INTO `travel_bqto_seguridad`.`bitacora`
    (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
  VALUES (
    @sigel_usuario_id,
    'reservas',
    v_accion,
    'asientos_reservados',
    CAST(NEW.id AS CHAR),
    CONCAT(IF(v_accion = 'DELETE', 'Baja lógica', 'Cambio'), ' en asientos_reservados #', CAST(NEW.id AS CHAR)),
    JSON_OBJECT('origen', 'trigger'),
    NULLIF(@sigel_ip, ''),
    UTC_TIMESTAMP()
  );
END$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_asientos_reservados_ad`
AFTER DELETE ON `travel_bqto`.`asientos_reservados`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'reservas',
  'DELETE',
  'asientos_reservados',
  CAST(OLD.id AS CHAR),
  CONCAT('Borrado físico en asientos_reservados #', CAST(OLD.id AS CHAR)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_pagos_ai`
AFTER INSERT ON `travel_bqto`.`pagos`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'pagos',
  'INSERT',
  'pagos',
  CAST(NEW.id AS CHAR),
  CONCAT('Alta en pagos #', CAST(NEW.id AS CHAR)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_pagos_au`
AFTER UPDATE ON `travel_bqto`.`pagos`
FOR EACH ROW
BEGIN
  DECLARE v_accion VARCHAR(16);
  IF NEW.eliminado_en IS NOT NULL AND OLD.eliminado_en IS NULL THEN
    SET v_accion = 'DELETE';
  ELSE
    SET v_accion = 'UPDATE';
  END IF;
  INSERT INTO `travel_bqto_seguridad`.`bitacora`
    (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
  VALUES (
    @sigel_usuario_id,
    'pagos',
    v_accion,
    'pagos',
    CAST(NEW.id AS CHAR),
    CONCAT(IF(v_accion = 'DELETE', 'Baja lógica', 'Cambio'), ' en pagos #', CAST(NEW.id AS CHAR)),
    JSON_OBJECT('origen', 'trigger'),
    NULLIF(@sigel_ip, ''),
    UTC_TIMESTAMP()
  );
END$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_pagos_ad`
AFTER DELETE ON `travel_bqto`.`pagos`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'pagos',
  'DELETE',
  'pagos',
  CAST(OLD.id AS CHAR),
  CONCAT('Borrado físico en pagos #', CAST(OLD.id AS CHAR)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_cotizaciones_ai`
AFTER INSERT ON `travel_bqto`.`cotizaciones`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'cotizaciones',
  'INSERT',
  'cotizaciones',
  CAST(NEW.id AS CHAR),
  CONCAT('Alta en cotizaciones #', CAST(NEW.id AS CHAR)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_cotizaciones_au`
AFTER UPDATE ON `travel_bqto`.`cotizaciones`
FOR EACH ROW
BEGIN
  DECLARE v_accion VARCHAR(16);
  IF NEW.eliminado_en IS NOT NULL AND OLD.eliminado_en IS NULL THEN
    SET v_accion = 'DELETE';
  ELSE
    SET v_accion = 'UPDATE';
  END IF;
  INSERT INTO `travel_bqto_seguridad`.`bitacora`
    (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
  VALUES (
    @sigel_usuario_id,
    'cotizaciones',
    v_accion,
    'cotizaciones',
    CAST(NEW.id AS CHAR),
    CONCAT(IF(v_accion = 'DELETE', 'Baja lógica', 'Cambio'), ' en cotizaciones #', CAST(NEW.id AS CHAR)),
    JSON_OBJECT('origen', 'trigger'),
    NULLIF(@sigel_ip, ''),
    UTC_TIMESTAMP()
  );
END$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_cotizaciones_ad`
AFTER DELETE ON `travel_bqto`.`cotizaciones`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'cotizaciones',
  'DELETE',
  'cotizaciones',
  CAST(OLD.id AS CHAR),
  CONCAT('Borrado físico en cotizaciones #', CAST(OLD.id AS CHAR)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_abordajes_viaje_ai`
AFTER INSERT ON `travel_bqto`.`abordajes_viaje`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'abordaje',
  'INSERT',
  'abordajes_viaje',
  CAST(NEW.id AS CHAR),
  CONCAT('Alta en abordajes_viaje #', CAST(NEW.id AS CHAR)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_abordajes_viaje_au`
AFTER UPDATE ON `travel_bqto`.`abordajes_viaje`
FOR EACH ROW
BEGIN
  DECLARE v_accion VARCHAR(16);
  IF NEW.eliminado_en IS NOT NULL AND OLD.eliminado_en IS NULL THEN
    SET v_accion = 'DELETE';
  ELSE
    SET v_accion = 'UPDATE';
  END IF;
  INSERT INTO `travel_bqto_seguridad`.`bitacora`
    (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
  VALUES (
    @sigel_usuario_id,
    'abordaje',
    v_accion,
    'abordajes_viaje',
    CAST(NEW.id AS CHAR),
    CONCAT(IF(v_accion = 'DELETE', 'Baja lógica', 'Cambio'), ' en abordajes_viaje #', CAST(NEW.id AS CHAR)),
    JSON_OBJECT('origen', 'trigger'),
    NULLIF(@sigel_ip, ''),
    UTC_TIMESTAMP()
  );
END$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_abordajes_viaje_ad`
AFTER DELETE ON `travel_bqto`.`abordajes_viaje`
FOR EACH ROW
INSERT INTO `travel_bqto_seguridad`.`bitacora`
  (usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle, ip_origen, creado_en)
VALUES (
  @sigel_usuario_id,
  'abordaje',
  'DELETE',
  'abordajes_viaje',
  CAST(OLD.id AS CHAR),
  CONCAT('Borrado físico en abordajes_viaje #', CAST(OLD.id AS CHAR)),
  JSON_OBJECT('origen', 'trigger'),
  NULLIF(@sigel_ip, ''),
  UTC_TIMESTAMP()
)$$

CREATE TRIGGER `travel_bqto_seguridad`.`trg_sigel_roles_bu`
BEFORE UPDATE ON `travel_bqto_seguridad`.`roles`
FOR EACH ROW
BEGIN
  IF LOWER(OLD.nombre) IN ('administrador', 'admin') THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'El rol Administrador es intocable: no se puede editar.';
  END IF;
END$$

CREATE TRIGGER `travel_bqto_seguridad`.`trg_sigel_roles_bd`
BEFORE DELETE ON `travel_bqto_seguridad`.`roles`
FOR EACH ROW
BEGIN
  IF LOWER(OLD.nombre) IN ('administrador', 'admin') THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'El rol Administrador es intocable: no se puede eliminar.';
  END IF;
END$$

CREATE TRIGGER `travel_bqto_seguridad`.`trg_sigel_usuarios_bu`
BEFORE UPDATE ON `travel_bqto_seguridad`.`usuarios`
FOR EACH ROW
BEGIN
  IF NEW.eliminado_en IS NOT NULL AND OLD.eliminado_en IS NULL
     AND EXISTS (
       SELECT 1 FROM `travel_bqto_seguridad`.`roles` r
       WHERE r.id = OLD.rol_id AND LOWER(r.nombre) IN ('administrador', 'admin')
     ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'El usuario Administrador es intocable: no se puede eliminar.';
  END IF;
END$$

CREATE TRIGGER `travel_bqto_seguridad`.`trg_sigel_bitacora_bd`
BEFORE DELETE ON `travel_bqto_seguridad`.`bitacora`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'La bitácora es de solo lectura: no se puede borrar.';
END$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_pagos_bi`
BEFORE INSERT ON `travel_bqto`.`pagos`
FOR EACH ROW
BEGIN
  IF NEW.monto <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'El monto del pago debe ser mayor a cero.';
  END IF;
END$$

CREATE TRIGGER `travel_bqto`.`trg_sigel_pagos_bu`
BEFORE UPDATE ON `travel_bqto`.`pagos`
FOR EACH ROW
BEGIN
  IF NEW.monto <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'El monto del pago debe ser mayor a cero.';
  END IF;
END$$

DROP FUNCTION IF EXISTS `travel_bqto`.`fn_ocupacion_viaje`$$

DROP FUNCTION IF EXISTS `travel_bqto`.`fn_ingresos_periodo`$$

DROP PROCEDURE IF EXISTS `travel_bqto`.`sp_ingresos_periodo`$$

CREATE FUNCTION `travel_bqto`.`fn_ocupacion_viaje`(p_viaje_id BIGINT)
RETURNS DECIMAL(6,2)
NOT DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_ocupados INT DEFAULT 0;
  DECLARE v_total INT DEFAULT 0;
  SELECT COUNT(*) INTO v_ocupados
  FROM `travel_bqto`.`asientos_reservados`
  WHERE viaje_id = p_viaje_id AND eliminado_en IS NULL;
  SELECT COUNT(*) INTO v_total
  FROM `travel_bqto`.`asientos` a
  INNER JOIN `travel_bqto`.`viajes` v ON v.unidad_id = a.unidad_id
  WHERE v.id = p_viaje_id AND v.eliminado_en IS NULL AND a.eliminado_en IS NULL;
  IF v_total IS NULL OR v_total = 0 THEN
    RETURN 0;
  END IF;
  RETURN ROUND((v_ocupados * 100) / v_total, 2);
END$$

CREATE FUNCTION `travel_bqto`.`fn_ingresos_periodo`(p_desde DATE, p_hasta DATE)
RETURNS DECIMAL(14,2)
NOT DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_total DECIMAL(14,2) DEFAULT 0;
  SELECT COALESCE(SUM(monto), 0) INTO v_total
  FROM `travel_bqto`.`pagos`
  WHERE eliminado_en IS NULL
    AND estado = 'aprobado'
    AND COALESCE(fecha_pago, DATE(creado_en)) BETWEEN p_desde AND p_hasta;
  RETURN v_total;
END$$

CREATE PROCEDURE `travel_bqto`.`sp_ingresos_periodo`(IN p_desde DATE, IN p_hasta DATE)
BEGIN
  SELECT
    COUNT(*) AS pagos_aprobados,
    `travel_bqto`.`fn_ingresos_periodo`(p_desde, p_hasta) AS total_monto,
    p_desde AS desde,
    p_hasta AS hasta
  FROM `travel_bqto`.`pagos`
  WHERE eliminado_en IS NULL
    AND estado = 'aprobado'
    AND COALESCE(fecha_pago, DATE(creado_en)) BETWEEN p_desde AND p_hasta;
END$$

DELIMITER ;

