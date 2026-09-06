-- Borrado lógico en catálogo de pagos (monedas, métodos, tasas).
-- Idempotente. Ejecutar con la base ya seleccionada (sin CREATE DATABASE).

SET @db = DATABASE();

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE monedas ADD COLUMN eliminado_en DATETIME(3) NULL AFTER simbolo',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'monedas' AND COLUMN_NAME = 'eliminado_en'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE metodos_pago ADD COLUMN eliminado_en DATETIME(3) NULL AFTER moneda_id',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'metodos_pago' AND COLUMN_NAME = 'eliminado_en'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE tasas ADD COLUMN eliminado_en DATETIME(3) NULL AFTER moneda_id',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'tasas' AND COLUMN_NAME = 'eliminado_en'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
