-- Aditivo. No borra tablas ni filas. Correr en phpMyAdmin / Workbench sobre travel_bqto.
SET NAMES utf8mb4;

DROP FUNCTION IF EXISTS travel_bqto.fn_ocupacion_viaje;
DROP FUNCTION IF EXISTS travel_bqto.fn_ingresos_periodo;
DROP PROCEDURE IF EXISTS travel_bqto.sp_ingresos_periodo;

DELIMITER $$

CREATE FUNCTION travel_bqto.fn_ocupacion_viaje(p_viaje_id BIGINT)
RETURNS DECIMAL(6,2)
NOT DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_ocupados INT DEFAULT 0;
  DECLARE v_total INT DEFAULT 0;
  SELECT COUNT(*) INTO v_ocupados
  FROM travel_bqto.asientos_reservados
  WHERE viaje_id = p_viaje_id AND eliminado_en IS NULL;
  SELECT COUNT(*) INTO v_total
  FROM travel_bqto.asientos a
  INNER JOIN travel_bqto.viajes v ON v.unidad_id = a.unidad_id
  WHERE v.id = p_viaje_id AND v.eliminado_en IS NULL AND a.eliminado_en IS NULL;
  IF v_total IS NULL OR v_total = 0 THEN
    RETURN 0;
  END IF;
  RETURN ROUND((v_ocupados * 100) / v_total, 2);
END$$

CREATE FUNCTION travel_bqto.fn_ingresos_periodo(p_desde DATE, p_hasta DATE)
RETURNS DECIMAL(14,2)
NOT DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_total DECIMAL(14,2) DEFAULT 0;
  SELECT COALESCE(SUM(monto), 0) INTO v_total
  FROM travel_bqto.pagos
  WHERE eliminado_en IS NULL
    AND estado = 'aprobado'
    AND COALESCE(fecha_pago, DATE(creado_en)) BETWEEN p_desde AND p_hasta;
  RETURN v_total;
END$$

CREATE PROCEDURE travel_bqto.sp_ingresos_periodo(IN p_desde DATE, IN p_hasta DATE)
BEGIN
  SELECT
    COUNT(*) AS pagos_aprobados,
    travel_bqto.fn_ingresos_periodo(p_desde, p_hasta) AS total_monto,
    p_desde AS desde,
    p_hasta AS hasta
  FROM travel_bqto.pagos
  WHERE eliminado_en IS NULL
    AND estado = 'aprobado'
    AND COALESCE(fecha_pago, DATE(creado_en)) BETWEEN p_desde AND p_hasta;
END$$

DELIMITER ;

-- Comprobación oral:
-- SHOW FUNCTION STATUS WHERE Db = 'travel_bqto';
-- SHOW PROCEDURE STATUS WHERE Db = 'travel_bqto';
-- SELECT fn_ocupacion_viaje(1);
-- CALL sp_ingresos_periodo('2026-01-01', CURDATE());
