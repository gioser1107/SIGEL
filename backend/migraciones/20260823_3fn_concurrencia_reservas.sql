-- 3FN + concurrencia en reservas (MySQL 8+ / MariaDB 10.11+)
-- Idempotente: se puede ejecutar más de una vez.
-- reserva_clientes no guarda nombre/apellido/cédula; esos datos viven en clientes.
-- Índices únicos sobre filas vigentes (eliminado_en IS NULL).

-- Quitar columnas personales si quedaron de un esquema viejo
SET @db = DATABASE();

SET @sql = (
  SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE reserva_clientes DROP COLUMN nombre',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'reserva_clientes' AND COLUMN_NAME = 'nombre'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE reserva_clientes DROP COLUMN apellido',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'reserva_clientes' AND COLUMN_NAME = 'apellido'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE reserva_clientes DROP COLUMN cedula',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'reserva_clientes' AND COLUMN_NAME = 'cedula'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE reserva_clientes DROP COLUMN numero_documento',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'reserva_clientes' AND COLUMN_NAME = 'numero_documento'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE reserva_clientes DROP COLUMN telefono',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'reserva_clientes' AND COLUMN_NAME = 'telefono'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Columna generada + índice único: un cliente no se duplica en la misma reserva vigente
SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE reserva_clientes ADD COLUMN cliente_activo_reserva BIGINT GENERATED ALWAYS AS (IF(eliminado_en IS NULL, cliente_id, NULL)) STORED',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'reserva_clientes' AND COLUMN_NAME = 'cliente_activo_reserva'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE UNIQUE INDEX uq_reserva_cliente_vigente ON reserva_clientes (reserva_id, cliente_activo_reserva)',
    'SELECT 1'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'reserva_clientes' AND INDEX_NAME = 'uq_reserva_cliente_vigente'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Columna generada + índice único: un asiento no se vende dos veces en el mismo viaje
SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE asientos_reservados ADD COLUMN asiento_activo_viaje BIGINT GENERATED ALWAYS AS (IF(eliminado_en IS NULL, asiento_id, NULL)) STORED',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'asientos_reservados' AND COLUMN_NAME = 'asiento_activo_viaje'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE UNIQUE INDEX uq_asiento_viaje_vigente ON asientos_reservados (viaje_id, asiento_activo_viaje)',
    'SELECT 1'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'asientos_reservados' AND INDEX_NAME = 'uq_asiento_viaje_vigente'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
