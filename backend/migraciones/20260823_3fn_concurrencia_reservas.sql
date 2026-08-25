-- 3FN + concurrencia en reservas (MySQL 8+)
-- reserva_clientes no almacena datos personales; solo el vínculo con clientes.
-- Índices únicos sobre filas vigentes (eliminado_en IS NULL) vía columna generada.

ALTER TABLE reserva_clientes
  ADD COLUMN cliente_activo_reserva BIGINT
    GENERATED ALWAYS AS (IF(eliminado_en IS NULL, cliente_id, NULL)) STORED;

CREATE UNIQUE INDEX uq_reserva_cliente_vigente
  ON reserva_clientes (reserva_id, cliente_activo_reserva);

ALTER TABLE asientos_reservados
  ADD COLUMN asiento_activo_viaje BIGINT
    GENERATED ALWAYS AS (IF(eliminado_en IS NULL, asiento_id, NULL)) STORED;

CREATE UNIQUE INDEX uq_asiento_viaje_vigente
  ON asientos_reservados (viaje_id, asiento_activo_viaje);
