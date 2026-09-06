-- Nivel de esfuerzo del destino (Fácil / Moderado / Difícil), elegido por la agencia.
-- Idempotente. En phpMyAdmin selecciona la base del hosting y ejecuta.
-- No usa CREATE/DROP DATABASE (en shared no hay permiso).

SET @db = DATABASE();

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE destinos ADD COLUMN dificultad VARCHAR(20) NOT NULL DEFAULT ''Moderado'' AFTER recargo_menor_eur',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'destinos' AND COLUMN_NAME = 'dificultad'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
