-- Origen de la tasa: manual (formulario) o bcv (tasa oficial).
-- Idempotente. En phpMyAdmin selecciona la base del hosting (ej. kontrola_travelbqto) y ejecuta.
-- No usa CREATE/DROP DATABASE (en shared no hay permiso).

SET @db = DATABASE();

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE tasas ADD COLUMN origen VARCHAR(20) NOT NULL DEFAULT ''manual'' AFTER moneda_id',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'tasas' AND COLUMN_NAME = 'origen'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
