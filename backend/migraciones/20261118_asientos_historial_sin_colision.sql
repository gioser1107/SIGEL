-- Requiere la migración 20260823_3fn_concurrencia_reservas.sql.
-- No borra asignaciones. Mantiene la unicidad de asientos vigentes.
-- El índice antiguo impedía liberar dos asignaciones históricas del mismo
-- asiento/viaje en el mismo segundo (eliminado_en no tiene microsegundos).
SET @schema_sigel = DATABASE();
SET @sql_sigel = (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.STATISTICS
           WHERE TABLE_SCHEMA=@schema_sigel AND TABLE_NAME='asientos_reservados'
             AND INDEX_NAME='uq_asiento_viaje_vigente' AND NON_UNIQUE=0)
    AND EXISTS(SELECT 1 FROM information_schema.STATISTICS
           WHERE TABLE_SCHEMA=@schema_sigel AND TABLE_NAME='asientos_reservados'
             AND INDEX_NAME='uq_asiento_viaje_activo'),
    'ALTER TABLE asientos_reservados DROP INDEX uq_asiento_viaje_activo',
    'SELECT 1'
  )
);
PREPARE stmt_sigel FROM @sql_sigel;
EXECUTE stmt_sigel;
DEALLOCATE PREPARE stmt_sigel;
