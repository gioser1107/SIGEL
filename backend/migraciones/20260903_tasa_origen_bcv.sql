-- Origen de la tasa: manual (formulario) o bcv (tasa oficial)
USE travel_bqto;

ALTER TABLE tasas
  ADD COLUMN origen VARCHAR(20) NOT NULL DEFAULT 'manual' AFTER moneda_id;
