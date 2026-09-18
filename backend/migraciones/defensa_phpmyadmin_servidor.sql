-- Defensa oral en el phpMyAdmin del SERVIDOR (usuario kontrola).
-- Solo SHOW y SELECT. No crea ni borra nada.
-- Las funciones/SP no existen aquí: Fastcomet niega CREATE ROUTINE (#1370).
-- Esa misma lógica sí corre en Python (reportes) y en MySQL local de la laptop.

-- 1) Dos bases = seguridad + negocio (RF de usuarios vs operación)
SHOW DATABASES LIKE 'travel_bqto%';

-- 2) Tablas alineadas a requisitos
SHOW TABLES FROM travel_bqto_seguridad;
SHOW TABLES FROM travel_bqto;

-- 3) Diseño lógico: claves e índices (asiento no se duplica)
SHOW INDEX FROM travel_bqto.asientos_reservados;
SHOW INDEX FROM travel_bqto.reservas;
SHOW INDEX FROM travel_bqto_seguridad.usuarios;

-- 4) Vistas (diseño físico)
SHOW FULL TABLES FROM travel_bqto WHERE Table_type = 'VIEW';
SHOW FULL TABLES FROM travel_bqto_seguridad WHERE Table_type = 'VIEW';
SELECT * FROM travel_bqto.v_ocupacion_viaje LIMIT 10;
SELECT * FROM travel_bqto_seguridad.v_bitacora_listado ORDER BY id DESC LIMIT 10;

-- 5) Triggers (bitácora e integridad). Esto SÍ se espera ver en el servidor.
SHOW TRIGGERS FROM travel_bqto;
SHOW TRIGGERS FROM travel_bqto_seguridad;

-- 6) Consulta avanzada = cuerpo del procedimiento (sin CREATE PROCEDURE)
SELECT
  COUNT(*) AS pagos_aprobados,
  COALESCE(SUM(monto), 0) AS total_monto
FROM travel_bqto.pagos
WHERE eliminado_en IS NULL
  AND estado = 'aprobado'
  AND COALESCE(fecha_pago, DATE(creado_en)) BETWEEN '2026-01-01' AND CURDATE();

-- 7) Ocupación de un viaje (misma cuenta que fn_ocupacion_viaje)
-- Cambia el 1 por un viaje_id real de la tabla viajes.
SELECT
  v.id AS viaje_id,
  (SELECT COUNT(*) FROM travel_bqto.asientos_reservados ar
    WHERE ar.viaje_id = v.id AND ar.eliminado_en IS NULL) AS ocupados,
  (SELECT COUNT(*) FROM travel_bqto.asientos a
    WHERE a.unidad_id = v.unidad_id AND a.eliminado_en IS NULL) AS total,
  ROUND(
    100 * (SELECT COUNT(*) FROM travel_bqto.asientos_reservados ar
           WHERE ar.viaje_id = v.id AND ar.eliminado_en IS NULL)
    / NULLIF((SELECT COUNT(*) FROM travel_bqto.asientos a
              WHERE a.unidad_id = v.unidad_id AND a.eliminado_en IS NULL), 0)
  , 2) AS porcentaje
FROM travel_bqto.viajes v
WHERE v.eliminado_en IS NULL
ORDER BY v.fecha_salida DESC
LIMIT 8;

-- 8) Estas dos salen vacías en Fastcomet. En la laptop sí tienen filas.
SHOW FUNCTION STATUS WHERE Db = 'travel_bqto';
SHOW PROCEDURE STATUS WHERE Db = 'travel_bqto';
