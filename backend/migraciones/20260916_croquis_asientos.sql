-- Geometría del croquis por unidad: coordenadas de asiento y celdas especiales.
-- Idempotente. En phpMyAdmin selecciona la base del hosting y ejecuta.

SET @db = DATABASE();

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE asientos ADD COLUMN fila INTEGER NULL AFTER posicion',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'asientos' AND COLUMN_NAME = 'fila'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE asientos ADD COLUMN columna INTEGER NULL AFTER fila',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'asientos' AND COLUMN_NAME = 'columna'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE unidades_transporte ADD COLUMN croquis_filas INTEGER NULL AFTER capacidad',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'unidades_transporte' AND COLUMN_NAME = 'croquis_filas'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE unidades_transporte ADD COLUMN croquis_columnas INTEGER NULL AFTER croquis_filas',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'unidades_transporte' AND COLUMN_NAME = 'croquis_columnas'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE unidades_transporte ADD COLUMN croquis_celdas JSON NULL AFTER croquis_columnas',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'unidades_transporte' AND COLUMN_NAME = 'croquis_celdas'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
