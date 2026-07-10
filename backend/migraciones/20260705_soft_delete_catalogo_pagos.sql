-- Borrado lógico en catálogo de pagos (monedas, métodos, tasas)
USE travel_bqto;

ALTER TABLE monedas
  ADD COLUMN eliminado_en DATETIME(3) NULL AFTER simbolo;

ALTER TABLE metodos_pago
  ADD COLUMN eliminado_en DATETIME(3) NULL AFTER moneda_id;

ALTER TABLE tasas
  ADD COLUMN eliminado_en DATETIME(3) NULL AFTER moneda_id;
