-- SIGEL / Travel BQTO — bases limpias de entrega
-- travel_bqto_seguridad: usuarios, roles, permisos, bitácora
-- travel_bqto: operación (catálogo, reservas, pagos, ...)
-- Sin destinos, viajes, reservas ni pagos de prueba.
-- Contraseña inicial de todos los usuarios: TravelBqto2026
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
DROP DATABASE IF EXISTS `travel_bqto`;
DROP DATABASE IF EXISTS `travel_bqto_seguridad`;
CREATE DATABASE `travel_bqto_seguridad` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE `travel_bqto` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Tablas de seguridad
CREATE TABLE travel_bqto_seguridad.permisos (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	descripcion TEXT, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE travel_bqto_seguridad.roles (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	nombre VARCHAR(50) NOT NULL, 
	descripcion TEXT, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (nombre)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE travel_bqto_seguridad.roles_permisos (
	rol_id BIGINT NOT NULL, 
	permiso_id BIGINT NOT NULL, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (rol_id, permiso_id), 
	FOREIGN KEY(rol_id) REFERENCES travel_bqto_seguridad.roles (id), 
	FOREIGN KEY(permiso_id) REFERENCES travel_bqto_seguridad.permisos (id)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE travel_bqto_seguridad.usuarios (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	rol_id BIGINT NOT NULL, 
	correo VARCHAR(320) NOT NULL, 
	hash_contrasena VARCHAR(255) NOT NULL, 
	nombre VARCHAR(80) NOT NULL, 
	apellido VARCHAR(80) NOT NULL, 
	telefono VARCHAR(30), 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(rol_id) REFERENCES travel_bqto_seguridad.roles (id)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE travel_bqto_seguridad.bitacora (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	usuario_id BIGINT, 
	modulo ENUM('seguridad','catalogo','viajes','reservas','pagos','conciliacion','cotizaciones','abordaje','sistema') NOT NULL, 
	accion ENUM('INSERT','UPDATE','DELETE','LOGIN','LOGOUT','VALIDAR','RECHAZAR','ANULAR','ERROR','OTRO') NOT NULL, 
	tabla_afectada VARCHAR(80), 
	registro_id VARCHAR(40), 
	resumen VARCHAR(500) NOT NULL, 
	detalle JSON, 
	ip_origen VARCHAR(45), 
	creado_en DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(usuario_id) REFERENCES travel_bqto_seguridad.usuarios (id)
)CHARSET=utf8mb4 ENGINE=InnoDB;

USE `travel_bqto`;

-- Tablas de negocio
CREATE TABLE bancos (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	codigo VARCHAR(10) NOT NULL, 
	nombre VARCHAR(120) NOT NULL, 
	activo BOOL NOT NULL, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (codigo)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE destinos (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	nombre VARCHAR(120) NOT NULL, 
	descripcion TEXT, 
	precio_base_eur NUMERIC(12, 2) NOT NULL, 
	recargo_menor_eur NUMERIC(12, 2) NOT NULL, 
	dificultad VARCHAR(20) NOT NULL, 
	activo BOOL NOT NULL, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (nombre)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE estados (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	nombre VARCHAR(100) NOT NULL, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE monedas (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	codigo VARCHAR(10) NOT NULL, 
	nombre VARCHAR(60) NOT NULL, 
	simbolo VARCHAR(10) NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (codigo)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE unidades_transporte (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	placa VARCHAR(16) NOT NULL, 
	modelo VARCHAR(80), 
	capacidad INTEGER NOT NULL, 
	croquis_filas INTEGER, 
	croquis_columnas INTEGER, 
	croquis_celdas JSON, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (placa)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE asientos (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	unidad_id BIGINT NOT NULL, 
	numero VARCHAR(10) NOT NULL, 
	posicion ENUM('ventana','pasillo','medio','otro') NOT NULL, 
	fila INTEGER, 
	columna INTEGER, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(unidad_id) REFERENCES unidades_transporte (id)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE ciudades (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	estado_id BIGINT NOT NULL, 
	nombre VARCHAR(120) NOT NULL, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(estado_id) REFERENCES estados (id)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE destino_imagenes (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	destino_id BIGINT NOT NULL, 
	url VARCHAR(512) NOT NULL, 
	orden SMALLINT NOT NULL, 
	es_portada BOOL NOT NULL, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(destino_id) REFERENCES destinos (id)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE metodos_pago (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	codigo VARCHAR(40) NOT NULL, 
	nombre VARCHAR(120) NOT NULL, 
	moneda_id BIGINT NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (codigo), 
	FOREIGN KEY(moneda_id) REFERENCES monedas (id)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE puntos_venta (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	banco_id BIGINT NOT NULL, 
	codigo VARCHAR(40) NOT NULL, 
	nombre VARCHAR(120) NOT NULL, 
	numero_terminal VARCHAR(60), 
	activo BOOL NOT NULL, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(banco_id) REFERENCES bancos (id), 
	UNIQUE (codigo)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE tasas (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	fecha DATE NOT NULL, 
	valor NUMERIC(14, 4) NOT NULL, 
	moneda_id BIGINT NOT NULL, 
	origen VARCHAR(20) NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(moneda_id) REFERENCES monedas (id)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE viajes (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	destino_id BIGINT NOT NULL, 
	unidad_id BIGINT NOT NULL, 
	fecha_salida DATETIME NOT NULL, 
	fecha_regreso DATETIME, 
	estado ENUM('planificado','en_curso','finalizado','cancelado') NOT NULL, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(destino_id) REFERENCES destinos (id), 
	FOREIGN KEY(unidad_id) REFERENCES unidades_transporte (id)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE clientes (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	usuario_id BIGINT, 
	tipo_cliente VARCHAR(20) NOT NULL, 
	tipo_documento VARCHAR(20) NOT NULL, 
	numero_documento VARCHAR(40) NOT NULL, 
	nombre VARCHAR(80) NOT NULL, 
	apellido VARCHAR(80) NOT NULL, 
	razon_social VARCHAR(160), 
	telefono VARCHAR(30), 
	telefono_secundario VARCHAR(30), 
	direccion VARCHAR(255), 
	ciudad_id BIGINT, 
	estado_id BIGINT, 
	notas TEXT, 
	creado_por BIGINT, 
	actualizado_por BIGINT, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(usuario_id) REFERENCES travel_bqto_seguridad.usuarios (id), 
	FOREIGN KEY(ciudad_id) REFERENCES ciudades (id), 
	FOREIGN KEY(estado_id) REFERENCES estados (id), 
	FOREIGN KEY(creado_por) REFERENCES travel_bqto_seguridad.usuarios (id), 
	FOREIGN KEY(actualizado_por) REFERENCES travel_bqto_seguridad.usuarios (id)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE costos_operativos (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	viaje_id BIGINT NOT NULL, 
	categoria ENUM('combustible','logistica','pago_guia','alimentacion','peajes','otro') NOT NULL, 
	monto_eur NUMERIC(12, 2) NOT NULL, 
	descripcion VARCHAR(255), 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(viaje_id) REFERENCES viajes (id)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE puntos_recogida (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	nombre VARCHAR(120) NOT NULL, 
	direccion VARCHAR(255), 
	ciudad VARCHAR(100), 
	estado VARCHAR(100), 
	notas_referencia VARCHAR(255), 
	tipo VARCHAR(20) NOT NULL, 
	activo BOOL NOT NULL, 
	creado_por BIGINT, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(creado_por) REFERENCES travel_bqto_seguridad.usuarios (id)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE viajes_guias (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	viaje_id BIGINT NOT NULL, 
	usuario_id BIGINT NOT NULL, 
	es_principal BOOL NOT NULL, 
	notas VARCHAR(255), 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(viaje_id) REFERENCES viajes (id), 
	FOREIGN KEY(usuario_id) REFERENCES travel_bqto_seguridad.usuarios (id)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE clientes_puntos_recogida (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	cliente_id BIGINT NOT NULL, 
	punto_recogida_id BIGINT NOT NULL, 
	es_predeterminado BOOL NOT NULL, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(cliente_id) REFERENCES clientes (id), 
	FOREIGN KEY(punto_recogida_id) REFERENCES puntos_recogida (id)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE cotizaciones (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	cliente_id BIGINT NOT NULL, 
	destino_id BIGINT NOT NULL, 
	requisitos TEXT, 
	precio_cotizado_eur NUMERIC(12, 2), 
	valida_hasta DATETIME, 
	estado ENUM('solicitada','pendiente','aceptada','vencida','cancelada') NOT NULL, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(cliente_id) REFERENCES clientes (id), 
	FOREIGN KEY(destino_id) REFERENCES destinos (id)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE reservas (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	cliente_id BIGINT NOT NULL, 
	viaje_id BIGINT NOT NULL, 
	fecha_reserva DATETIME NOT NULL, 
	estado ENUM('pendiente','confirmada','abonada','cancelada') NOT NULL, 
	creado_por BIGINT, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(cliente_id) REFERENCES clientes (id), 
	FOREIGN KEY(viaje_id) REFERENCES viajes (id), 
	FOREIGN KEY(creado_por) REFERENCES travel_bqto_seguridad.usuarios (id)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE cotizacion_lineas (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	cotizacion_id BIGINT NOT NULL, 
	concepto VARCHAR(255) NOT NULL, 
	cantidad NUMERIC(10, 2) NOT NULL DEFAULT '1.00', 
	unidad VARCHAR(20) NOT NULL DEFAULT 'personas', 
	precio_unitario_eur NUMERIC(12, 2) NOT NULL, 
	monto_eur NUMERIC(12, 2) NOT NULL, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(cotizacion_id) REFERENCES cotizaciones (id)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE pagos (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	reserva_id BIGINT NOT NULL, 
	metodo_pago_id BIGINT NOT NULL, 
	tasa_id BIGINT NOT NULL, 
	monto NUMERIC(14, 2) NOT NULL, 
	tipo VARCHAR(20) NOT NULL, 
	estado VARCHAR(20) NOT NULL, 
	fecha_pago DATE, 
	referencia VARCHAR(120), 
	banco_origen_id BIGINT, 
	banco_destino_id BIGINT, 
	punto_venta_id BIGINT, 
	telefono_origen VARCHAR(30), 
	correo_origen VARCHAR(160), 
	comprobante_url VARCHAR(500), 
	validado_por BIGINT, 
	validado_en DATETIME, 
	notas VARCHAR(255), 
	creado_por BIGINT, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(reserva_id) REFERENCES reservas (id), 
	FOREIGN KEY(metodo_pago_id) REFERENCES metodos_pago (id), 
	FOREIGN KEY(tasa_id) REFERENCES tasas (id), 
	FOREIGN KEY(banco_origen_id) REFERENCES bancos (id), 
	FOREIGN KEY(banco_destino_id) REFERENCES bancos (id), 
	FOREIGN KEY(punto_venta_id) REFERENCES puntos_venta (id), 
	FOREIGN KEY(validado_por) REFERENCES travel_bqto_seguridad.usuarios (id), 
	FOREIGN KEY(creado_por) REFERENCES travel_bqto_seguridad.usuarios (id)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE resenas (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	reserva_id BIGINT NOT NULL, 
	calificacion SMALLINT NOT NULL, 
	comentario TEXT, 
	publico BOOL NOT NULL, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(reserva_id) REFERENCES reservas (id)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE reserva_clientes (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	reserva_id BIGINT NOT NULL, 
	cliente_id BIGINT NOT NULL, 
	es_titular BOOL NOT NULL, 
	es_menor BOOL NOT NULL, 
	ocupa_asiento BOOL NOT NULL, 
	precio_pasajero_eur NUMERIC(12, 2) NOT NULL, 
	recargo_eur NUMERIC(12, 2) NOT NULL, 
	notas_tarifa VARCHAR(255), 
	punto_recogida_id BIGINT, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_reserva_cliente_activo UNIQUE (reserva_id, cliente_id, eliminado_en), 
	FOREIGN KEY(reserva_id) REFERENCES reservas (id), 
	FOREIGN KEY(cliente_id) REFERENCES clientes (id), 
	FOREIGN KEY(punto_recogida_id) REFERENCES puntos_recogida (id)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE abordajes_viaje (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	reserva_cliente_id BIGINT NOT NULL, 
	abordado_en DATETIME NOT NULL, 
	registrado_por BIGINT, 
	estado ENUM('abordado','no_presentado') NOT NULL, 
	notas VARCHAR(255), 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(reserva_cliente_id) REFERENCES reserva_clientes (id), 
	FOREIGN KEY(registrado_por) REFERENCES travel_bqto_seguridad.usuarios (id)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE asientos_reservados (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	reserva_cliente_id BIGINT NOT NULL, 
	viaje_id BIGINT NOT NULL, 
	asiento_id BIGINT NOT NULL, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_asiento_viaje_activo UNIQUE (viaje_id, asiento_id, eliminado_en), 
	FOREIGN KEY(reserva_cliente_id) REFERENCES reserva_clientes (id), 
	FOREIGN KEY(viaje_id) REFERENCES viajes (id), 
	FOREIGN KEY(asiento_id) REFERENCES asientos (id)
)CHARSET=utf8mb4 ENGINE=InnoDB;

CREATE TABLE viajes_ruta_recogida (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	viaje_id BIGINT NOT NULL, 
	reserva_cliente_id BIGINT NOT NULL, 
	orden INTEGER NOT NULL, 
	hora_programada DATETIME, 
	notas VARCHAR(255), 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(viaje_id) REFERENCES viajes (id), 
	FOREIGN KEY(reserva_cliente_id) REFERENCES reserva_clientes (id)
)CHARSET=utf8mb4 ENGINE=InnoDB;

ALTER TABLE reserva_clientes ADD COLUMN cliente_activo_reserva BIGINT GENERATED ALWAYS AS (IF(eliminado_en IS NULL, cliente_id, NULL)) STORED;
CREATE UNIQUE INDEX uq_reserva_cliente_vigente ON reserva_clientes (reserva_id, cliente_activo_reserva);
ALTER TABLE asientos_reservados ADD COLUMN asiento_activo_viaje BIGINT GENERATED ALWAYS AS (IF(eliminado_en IS NULL, asiento_id, NULL)) STORED;
CREATE UNIQUE INDEX uq_asiento_viaje_vigente ON asientos_reservados (viaje_id, asiento_activo_viaje);
ALTER TABLE travel_bqto_seguridad.usuarios ADD COLUMN correo_activo VARCHAR(320) GENERATED ALWAYS AS (IF(eliminado_en IS NULL, correo, NULL)) STORED;
CREATE UNIQUE INDEX uq_usuarios_correo_vigente ON travel_bqto_seguridad.usuarios (correo_activo);
ALTER TABLE clientes ADD COLUMN documento_activo VARCHAR(62) GENERATED ALWAYS AS (IF(eliminado_en IS NULL, CONCAT(tipo_documento, '-', numero_documento), NULL)) STORED;
CREATE UNIQUE INDEX uq_clientes_documento_vigente ON clientes (documento_activo);

USE `travel_bqto_seguridad`;

-- Roles
INSERT INTO roles (id, nombre, descripcion, creado_en, actualizado_en) VALUES
  (1, 'Administrador', 'Acceso completo al panel', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (2, 'Guia', 'Guía de viaje: planificación y abordaje', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (3, 'Cliente', 'Portal de pasajeros', '2026-09-15 22:48:08', '2026-09-15 22:48:08');

-- Permisos
INSERT INTO permisos (id, descripcion, creado_en, actualizado_en) VALUES
  (1, 'crear_usuarios', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (2, 'leer_usuarios', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (3, 'editar_usuarios', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (4, 'borrar_usuarios', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (5, 'crear_permisos', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (6, 'leer_permisos', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (7, 'editar_permisos', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (8, 'borrar_permisos', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (9, 'crear_roles', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (10, 'leer_roles', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (11, 'editar_roles', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (12, 'borrar_roles', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (13, 'crear_reportes_pago', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (14, 'leer_reportes_pago', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (15, 'editar_reportes_pago', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (16, 'borrar_reportes_pago', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (17, 'crear_conciliacion', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (18, 'leer_conciliacion', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (19, 'editar_conciliacion', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (20, 'borrar_conciliacion', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (21, 'crear_cotizaciones', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (22, 'leer_cotizaciones', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (23, 'editar_cotizaciones', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (24, 'borrar_cotizaciones', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (25, 'crear_planificacion', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (26, 'leer_planificacion', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (27, 'editar_planificacion', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (28, 'borrar_planificacion', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (29, 'crear_transporte_flota', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (30, 'leer_transporte_flota', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (31, 'editar_transporte_flota', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (32, 'borrar_transporte_flota', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (33, 'crear_reservas', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (34, 'leer_reservas', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (35, 'editar_reservas', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (36, 'borrar_reservas', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (37, 'crear_destinos', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (38, 'leer_destinos', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (39, 'editar_destinos', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (40, 'borrar_destinos', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (41, 'crear_bitacora', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (42, 'leer_bitacora', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (43, 'editar_bitacora', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (44, 'borrar_bitacora', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (45, 'crear_abordaje', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (46, 'leer_abordaje', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (47, 'editar_abordaje', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (48, 'borrar_abordaje', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (49, 'crear_clientes', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (50, 'leer_clientes', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (51, 'editar_clientes', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (52, 'borrar_clientes', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (53, 'crear_puntos_recogida', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (54, 'leer_puntos_recogida', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (55, 'editar_puntos_recogida', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (56, 'borrar_puntos_recogida', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (57, 'crear_resenas', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (58, 'leer_resenas', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (59, 'editar_resenas', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (60, 'borrar_resenas', '2026-09-15 22:48:08', '2026-09-15 22:48:08');

-- Permisos por rol (Administrador = todos, Guía = operación de viaje)
INSERT INTO roles_permisos (rol_id, permiso_id, creado_en, actualizado_en) VALUES
  (1, 1, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 2, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 3, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 4, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 5, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 6, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 7, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 8, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 9, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 10, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 11, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 12, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 13, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 14, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 15, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 16, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 17, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 18, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 19, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 20, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 21, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 22, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 23, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 24, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 25, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 26, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 27, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 28, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 29, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 30, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 31, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 32, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 33, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 34, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 35, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 36, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 37, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 38, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 39, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 40, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 41, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 42, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 43, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 44, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 45, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 46, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 47, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 48, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 49, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 50, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 51, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 52, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 53, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 54, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 55, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 56, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 57, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 58, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 59, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (1, 60, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (2, 26, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (2, 34, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (2, 50, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (2, 46, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (2, 45, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (2, 47, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (2, 54, '2026-09-15 22:48:08', '2026-09-15 22:48:08');

-- Usuarios de entrega (misma contraseña inicial)
INSERT INTO usuarios (id, rol_id, correo, hash_contrasena, nombre, apellido, telefono, creado_en, actualizado_en) VALUES
  (1, 1, 'admin@travelbqto.com', 'ff5caff913847cf5feacc22d0149dc45f2ea70d79581c11da183756274787675', 'Admin', 'Travel', '02510000000', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (2, 2, 'guia@travelbqto.com', 'ff5caff913847cf5feacc22d0149dc45f2ea70d79581c11da183756274787675', 'Guia', 'Operativo', '04120000000', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (3, 3, 'cliente@travelbqto.com', 'ff5caff913847cf5feacc22d0149dc45f2ea70d79581c11da183756274787675', 'Cliente', 'Demo', '04240000000', '2026-09-15 22:48:08', '2026-09-15 22:48:08');

USE `travel_bqto`;

-- Estados y ciudades de Venezuela
INSERT INTO estados (id, nombre, creado_en, actualizado_en) VALUES
  (1, 'Amazonas', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (2, 'Anzoátegui', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (3, 'Apure', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (4, 'Aragua', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (5, 'Barinas', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (6, 'Bolívar', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (7, 'Carabobo', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (8, 'Cojedes', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (9, 'Delta Amacuro', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (10, 'Distrito Capital', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (11, 'Falcón', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (12, 'Guárico', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (13, 'Lara', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (14, 'La Guaira', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (15, 'Mérida', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (16, 'Miranda', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (17, 'Monagas', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (18, 'Nueva Esparta', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (19, 'Portuguesa', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (20, 'Sucre', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (21, 'Táchira', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (22, 'Trujillo', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (23, 'Yaracuy', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (24, 'Zulia', '2026-09-15 22:48:08', '2026-09-15 22:48:08');

INSERT INTO ciudades (id, estado_id, nombre, creado_en, actualizado_en) VALUES
  (1, 1, 'Puerto Ayacucho', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (2, 2, 'Barcelona', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (3, 2, 'Puerto La Cruz', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (4, 2, 'Lechería', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (5, 3, 'San Fernando de Apure', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (6, 4, 'Maracay', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (7, 4, 'Turmero', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (8, 5, 'Barinas', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (9, 6, 'Ciudad Bolívar', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (10, 6, 'Puerto Ordaz', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (11, 7, 'Valencia', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (12, 7, 'Puerto Cabello', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (13, 8, 'San Carlos', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (14, 9, 'Tucupita', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (15, 10, 'Caracas', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (16, 11, 'Coro', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (17, 11, 'Punto Fijo', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (18, 12, 'San Juan de los Morros', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (19, 13, 'Barquisimeto', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (20, 13, 'Cabudare', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (21, 13, 'Carora', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (22, 13, 'El Tocuyo', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (23, 13, 'Quíbor', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (24, 13, 'Duaca', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (25, 14, 'La Guaira', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (26, 15, 'Mérida', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (27, 16, 'Los Teques', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (28, 16, 'Guarenas', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (29, 16, 'Guatire', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (30, 17, 'Maturín', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (31, 18, 'La Asunción', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (32, 18, 'Porlamar', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (33, 19, 'Guanare', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (34, 19, 'Acarigua', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (35, 20, 'Cumaná', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (36, 21, 'San Cristóbal', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (37, 22, 'Trujillo', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (38, 22, 'Valera', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (39, 23, 'San Felipe', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (40, 24, 'Maracaibo', '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (41, 24, 'Cabimas', '2026-09-15 22:48:08', '2026-09-15 22:48:08');

-- Cliente de demo vinculado al usuario portal
INSERT INTO clientes (id, usuario_id, tipo_cliente, tipo_documento, numero_documento, nombre, apellido, telefono, estado_id, ciudad_id, creado_por, actualizado_por, creado_en, actualizado_en) VALUES
  (1, 3, 'natural', 'V', '12345678', 'Cliente', 'Demo', '04240000000', 13, 19, 1, 1, '2026-09-15 22:48:08', '2026-09-15 22:48:08');

-- Monedas
INSERT INTO monedas (id, codigo, nombre, simbolo) VALUES
  (1, 'EUR', 'Euro', '€'),
  (2, 'USD', 'Dólar estadounidense', 'US$'),
  (3, 'VES', 'Bolívar', 'Bs');

-- Métodos de pago
INSERT INTO metodos_pago (id, codigo, nombre, moneda_id) VALUES
  (1, 'efectivo_bs', 'Efectivo en bolívares', 3),
  (2, 'efectivo_usd', 'Efectivo en dólares', 2),
  (3, 'pago_movil', 'Pago móvil', 3),
  (4, 'transferencia', 'Transferencia bancaria', 3),
  (5, 'zelle', 'Zelle', 2),
  (6, 'tpv', 'Punto de venta', 3);

-- Bancos y un punto de venta
INSERT INTO bancos (id, codigo, nombre, activo, creado_en, actualizado_en) VALUES
  (1, '0102', 'Banco de Venezuela', 1, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (2, '0134', 'Banesco', 1, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (3, '0105', 'Mercantil', 1, '2026-09-15 22:48:08', '2026-09-15 22:48:08'),
  (4, '0108', 'Provincial', 1, '2026-09-15 22:48:08', '2026-09-15 22:48:08');

INSERT INTO puntos_venta (id, banco_id, codigo, nombre, numero_terminal, activo, creado_en, actualizado_en) VALUES
  (1, 2, 'POS-OFI', 'Punto oficina Travel BQTO', '001', 1, '2026-09-15 22:48:08', '2026-09-15 22:48:08');

-- Tasa EUR del día de importación (actualizar en Pagos > Tasas)
INSERT INTO tasas (id, fecha, valor, moneda_id, origen) VALUES
  (1, CURDATE(), 160.0000, 1, 'manual');

-- Parada de recogida habitual
INSERT INTO puntos_recogida (id, nombre, direccion, ciudad, estado, tipo, activo, creado_por, creado_en, actualizado_en) VALUES
  (1, 'Obelisco', 'Av. Florencio Jiménez', 'Barquisimeto', 'Lara', 'parada', 1, 1, '2026-09-15 22:48:08', '2026-09-15 22:48:08');

SET FOREIGN_KEY_CHECKS = 1;

-- Vistas de consulta (los triggers se instalan con utilidades/objetos_mysql.py)
CREATE OR REPLACE VIEW `travel_bqto_seguridad`.`v_bitacora_listado` AS
SELECT
  b.id,
  b.creado_en,
  b.modulo,
  b.accion,
  b.tabla_afectada,
  b.registro_id,
  b.resumen,
  b.ip_origen,
  b.usuario_id,
  CONCAT(u.nombre, ' ', u.apellido) AS usuario_nombre,
  u.correo AS usuario_correo
FROM `travel_bqto_seguridad`.`bitacora` b
LEFT JOIN `travel_bqto_seguridad`.`usuarios` u ON u.id = b.usuario_id;
CREATE OR REPLACE VIEW `travel_bqto`.`v_reserva_totales_eur` AS
SELECT
  r.id AS reserva_id,
  COALESCE(SUM(rc.precio_pasajero_eur + rc.recargo_eur), 0.00) AS total_eur
FROM `travel_bqto`.`reservas` r
LEFT JOIN `travel_bqto`.`reserva_clientes` rc
  ON rc.reserva_id = r.id AND rc.eliminado_en IS NULL
WHERE r.eliminado_en IS NULL
GROUP BY r.id;
CREATE OR REPLACE VIEW `travel_bqto`.`v_ocupacion_viaje` AS
SELECT
  v.id AS viaje_id,
  v.destino_id,
  v.unidad_id,
  COUNT(DISTINCT ar.id) AS asientos_ocupados
FROM `travel_bqto`.`viajes` v
LEFT JOIN `travel_bqto`.`asientos_reservados` ar
  ON ar.viaje_id = v.id AND ar.eliminado_en IS NULL
WHERE v.eliminado_en IS NULL
GROUP BY v.id, v.destino_id, v.unidad_id;
