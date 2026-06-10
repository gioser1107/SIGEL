-- Datos mínimos para probar módulos 11 y 12 (ejecutar en phpMyAdmin o mysql CLI)
USE travel_bqto;

INSERT INTO destinos (nombre, descripcion, precio_base_eur, activo, creado_en, actualizado_en)
VALUES ('Morrocoy Full Day', 'Salida full day demo', 45.00, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE nombre = nombre;

INSERT INTO unidades_transporte (placa, modelo, capacidad, creado_en, actualizado_en)
VALUES ('AA0TRV01', 'Bus Ejecutivo', 40, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE placa = placa;

INSERT INTO puntos_recogida (nombre, direccion, ciudad, estado, activo, creado_en, actualizado_en)
VALUES ('Obelisco', 'Av. Florencio Jimenez', 'Barquisimeto', 'Lara', 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE nombre = nombre;

INSERT INTO usuarios (rol_id, correo, hash_contrasena, nombre, apellido, creado_en, actualizado_en)
SELECT 3, 'cliente@travelbqto.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Cliente', 'Demo', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE correo = 'cliente@travelbqto.com');

INSERT INTO clientes (
  usuario_id, tipo_cliente, tipo_documento, numero_documento, nombre, apellido,
  telefono, estado_id, ciudad_id, creado_por, creado_en, actualizado_en
)
SELECT u.id, 'natural', 'V', 'V12345678', 'Cliente', 'Demo', '+58-424-0000000', 13, 44, 1, NOW(3), NOW(3)
FROM usuarios u
WHERE u.correo = 'cliente@travelbqto.com'
  AND NOT EXISTS (SELECT 1 FROM clientes c WHERE c.usuario_id = u.id);
