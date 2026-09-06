-- SIGEL / Travel BQTO — base limpia de entrega
-- Esquema + roles + usuarios + catálogos. Sin destinos, viajes, reservas ni pagos.
-- Contraseña inicial de todos los usuarios: TravelBqto2026
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;


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
) ENGINE=InnoDB CHARSET=utf8mb4;

CREATE TABLE destinos (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	nombre VARCHAR(120) NOT NULL, 
	descripcion TEXT, 
	precio_base_eur NUMERIC(12, 2) NOT NULL, 
	recargo_menor_eur NUMERIC(12, 2) NOT NULL, 
	dificultad VARCHAR(20) NOT NULL DEFAULT 'Moderado', 
	activo BOOL NOT NULL, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (nombre)
) ENGINE=InnoDB CHARSET=utf8mb4;

CREATE TABLE estados (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	nombre VARCHAR(100) NOT NULL, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id)
) ENGINE=InnoDB CHARSET=utf8mb4;

CREATE TABLE monedas (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	codigo VARCHAR(10) NOT NULL, 
	nombre VARCHAR(60) NOT NULL, 
	simbolo VARCHAR(10) NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (codigo)
) ENGINE=InnoDB CHARSET=utf8mb4;

CREATE TABLE permisos (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	descripcion TEXT, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id)
) ENGINE=InnoDB CHARSET=utf8mb4;

CREATE TABLE roles (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	nombre VARCHAR(50) NOT NULL, 
	descripcion TEXT, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (nombre)
) ENGINE=InnoDB CHARSET=utf8mb4;

CREATE TABLE unidades_transporte (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	placa VARCHAR(16) NOT NULL, 
	modelo VARCHAR(80), 
	capacidad INTEGER NOT NULL, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (placa)
) ENGINE=InnoDB CHARSET=utf8mb4;

CREATE TABLE asientos (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	unidad_id BIGINT NOT NULL, 
	numero VARCHAR(10) NOT NULL, 
	posicion ENUM('ventana','pasillo','medio','otro') NOT NULL, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(unidad_id) REFERENCES unidades_transporte (id)
) ENGINE=InnoDB CHARSET=utf8mb4;

CREATE TABLE ciudades (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	estado_id BIGINT NOT NULL, 
	nombre VARCHAR(120) NOT NULL, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(estado_id) REFERENCES estados (id)
) ENGINE=InnoDB CHARSET=utf8mb4;

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
) ENGINE=InnoDB CHARSET=utf8mb4;

CREATE TABLE metodos_pago (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	codigo VARCHAR(40) NOT NULL, 
	nombre VARCHAR(120) NOT NULL, 
	moneda_id BIGINT NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (codigo), 
	FOREIGN KEY(moneda_id) REFERENCES monedas (id)
) ENGINE=InnoDB CHARSET=utf8mb4;

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
) ENGINE=InnoDB CHARSET=utf8mb4;

CREATE TABLE roles_permisos (
	rol_id BIGINT NOT NULL, 
	permiso_id BIGINT NOT NULL, 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (rol_id, permiso_id), 
	FOREIGN KEY(rol_id) REFERENCES roles (id), 
	FOREIGN KEY(permiso_id) REFERENCES permisos (id)
) ENGINE=InnoDB CHARSET=utf8mb4;

CREATE TABLE tasas (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	fecha DATE NOT NULL, 
	valor NUMERIC(14, 4) NOT NULL, 
	moneda_id BIGINT NOT NULL, 
	origen VARCHAR(20) NOT NULL DEFAULT 'manual',
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(moneda_id) REFERENCES monedas (id)
) ENGINE=InnoDB CHARSET=utf8mb4;

CREATE TABLE usuarios (
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
	FOREIGN KEY(rol_id) REFERENCES roles (id)
) ENGINE=InnoDB CHARSET=utf8mb4;

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
) ENGINE=InnoDB CHARSET=utf8mb4;

CREATE TABLE bitacora (
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
	FOREIGN KEY(usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB CHARSET=utf8mb4;

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
	FOREIGN KEY(usuario_id) REFERENCES usuarios (id), 
	FOREIGN KEY(ciudad_id) REFERENCES ciudades (id), 
	FOREIGN KEY(estado_id) REFERENCES estados (id), 
	FOREIGN KEY(creado_por) REFERENCES usuarios (id), 
	FOREIGN KEY(actualizado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB CHARSET=utf8mb4;

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
) ENGINE=InnoDB CHARSET=utf8mb4;

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
	FOREIGN KEY(creado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB CHARSET=utf8mb4;

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
	FOREIGN KEY(usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB CHARSET=utf8mb4;

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
) ENGINE=InnoDB CHARSET=utf8mb4;

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
) ENGINE=InnoDB CHARSET=utf8mb4;

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
	FOREIGN KEY(creado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB CHARSET=utf8mb4;

CREATE TABLE cotizacion_lineas (
	id BIGINT NOT NULL AUTO_INCREMENT, 
	cotizacion_id BIGINT NOT NULL, 
	categoria ENUM('combustible','logistica','pago_guia','alimentacion','peajes','otro') NOT NULL, 
	monto_eur NUMERIC(12, 2) NOT NULL, 
	descripcion VARCHAR(255), 
	creado_en DATETIME NOT NULL, 
	actualizado_en DATETIME NOT NULL, 
	eliminado_en DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(cotizacion_id) REFERENCES cotizaciones (id)
) ENGINE=InnoDB CHARSET=utf8mb4;

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
	FOREIGN KEY(validado_por) REFERENCES usuarios (id), 
	FOREIGN KEY(creado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB CHARSET=utf8mb4;

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
) ENGINE=InnoDB CHARSET=utf8mb4;

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
) ENGINE=InnoDB CHARSET=utf8mb4;

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
	FOREIGN KEY(registrado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB CHARSET=utf8mb4;

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
) ENGINE=InnoDB CHARSET=utf8mb4;

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
) ENGINE=InnoDB CHARSET=utf8mb4;

ALTER TABLE reserva_clientes ADD COLUMN cliente_activo_reserva BIGINT GENERATED ALWAYS AS (IF(eliminado_en IS NULL, cliente_id, NULL)) STORED;
CREATE UNIQUE INDEX uq_reserva_cliente_vigente ON reserva_clientes (reserva_id, cliente_activo_reserva);
ALTER TABLE asientos_reservados ADD COLUMN asiento_activo_viaje BIGINT GENERATED ALWAYS AS (IF(eliminado_en IS NULL, asiento_id, NULL)) STORED;
CREATE UNIQUE INDEX uq_asiento_viaje_vigente ON asientos_reservados (viaje_id, asiento_activo_viaje);

-- Roles
INSERT INTO roles (id, nombre, descripcion, creado_en, actualizado_en) VALUES
  (1, 'Administrador', 'Acceso completo al panel', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (2, 'Guia', 'Guía de viaje: planificación y abordaje', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (3, 'Cliente', 'Portal de pasajeros', '2026-08-28 08:01:15', '2026-08-28 08:01:15');

-- Permisos
INSERT INTO permisos (id, descripcion, creado_en, actualizado_en) VALUES
  (1, 'crear_usuarios', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (2, 'leer_usuarios', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (3, 'editar_usuarios', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (4, 'borrar_usuarios', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (5, 'crear_permisos', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (6, 'leer_permisos', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (7, 'editar_permisos', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (8, 'borrar_permisos', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (9, 'crear_roles', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (10, 'leer_roles', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (11, 'editar_roles', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (12, 'borrar_roles', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (13, 'crear_reportes_pago', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (14, 'leer_reportes_pago', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (15, 'editar_reportes_pago', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (16, 'borrar_reportes_pago', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (17, 'crear_conciliacion', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (18, 'leer_conciliacion', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (19, 'editar_conciliacion', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (20, 'borrar_conciliacion', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (21, 'crear_cotizaciones', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (22, 'leer_cotizaciones', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (23, 'editar_cotizaciones', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (24, 'borrar_cotizaciones', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (25, 'crear_planificacion', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (26, 'leer_planificacion', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (27, 'editar_planificacion', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (28, 'borrar_planificacion', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (29, 'crear_transporte_flota', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (30, 'leer_transporte_flota', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (31, 'editar_transporte_flota', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (32, 'borrar_transporte_flota', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (33, 'crear_reservas', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (34, 'leer_reservas', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (35, 'editar_reservas', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (36, 'borrar_reservas', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (37, 'crear_destinos', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (38, 'leer_destinos', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (39, 'editar_destinos', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (40, 'borrar_destinos', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (41, 'crear_bitacora', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (42, 'leer_bitacora', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (43, 'editar_bitacora', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (44, 'borrar_bitacora', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (45, 'crear_abordaje', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (46, 'leer_abordaje', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (47, 'editar_abordaje', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (48, 'borrar_abordaje', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (49, 'crear_clientes', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (50, 'leer_clientes', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (51, 'editar_clientes', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (52, 'borrar_clientes', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (53, 'crear_puntos_recogida', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (54, 'leer_puntos_recogida', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (55, 'editar_puntos_recogida', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (56, 'borrar_puntos_recogida', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (57, 'crear_resenas', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (58, 'leer_resenas', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (59, 'editar_resenas', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (60, 'borrar_resenas', '2026-08-28 08:01:15', '2026-08-28 08:01:15');

-- Permisos por rol (Administrador = todos, Guía = operación de viaje)
INSERT INTO roles_permisos (rol_id, permiso_id, creado_en, actualizado_en) VALUES
  (1, 1, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 2, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 3, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 4, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 5, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 6, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 7, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 8, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 9, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 10, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 11, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 12, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 13, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 14, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 15, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 16, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 17, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 18, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 19, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 20, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 21, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 22, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 23, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 24, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 25, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 26, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 27, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 28, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 29, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 30, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 31, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 32, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 33, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 34, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 35, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 36, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 37, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 38, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 39, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 40, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 41, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 42, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 43, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 44, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 45, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 46, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 47, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 48, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 49, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 50, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 51, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 52, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 53, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 54, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 55, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 56, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 57, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 58, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 59, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (1, 60, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (2, 26, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (2, 34, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (2, 50, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (2, 46, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (2, 45, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (2, 47, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (2, 54, '2026-08-28 08:01:15', '2026-08-28 08:01:15');

-- Usuarios de entrega (misma contraseña inicial)
INSERT INTO usuarios (id, rol_id, correo, hash_contrasena, nombre, apellido, telefono, creado_en, actualizado_en) VALUES
  (1, 1, 'admin@travelbqto.com', 'ff5caff913847cf5feacc22d0149dc45f2ea70d79581c11da183756274787675', 'Admin', 'Travel', '02510000000', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (2, 2, 'guia@travelbqto.com', 'ff5caff913847cf5feacc22d0149dc45f2ea70d79581c11da183756274787675', 'Guia', 'Operativo', '04120000000', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (3, 3, 'cliente@travelbqto.com', 'ff5caff913847cf5feacc22d0149dc45f2ea70d79581c11da183756274787675', 'Cliente', 'Demo', '04240000000', '2026-08-28 08:01:15', '2026-08-28 08:01:15');

-- Estados y ciudades de Venezuela
INSERT INTO estados (id, nombre, creado_en, actualizado_en) VALUES
  (1, 'Amazonas', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (2, 'Anzoátegui', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (3, 'Apure', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (4, 'Aragua', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (5, 'Barinas', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (6, 'Bolívar', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (7, 'Carabobo', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (8, 'Cojedes', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (9, 'Delta Amacuro', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (10, 'Distrito Capital', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (11, 'Falcón', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (12, 'Guárico', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (13, 'Lara', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (14, 'La Guaira', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (15, 'Mérida', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (16, 'Miranda', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (17, 'Monagas', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (18, 'Nueva Esparta', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (19, 'Portuguesa', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (20, 'Sucre', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (21, 'Táchira', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (22, 'Trujillo', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (23, 'Yaracuy', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (24, 'Zulia', '2026-08-28 08:01:15', '2026-08-28 08:01:15');

INSERT INTO ciudades (id, estado_id, nombre, creado_en, actualizado_en) VALUES
  (1, 1, 'Puerto Ayacucho', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (2, 2, 'Barcelona', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (3, 2, 'Puerto La Cruz', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (4, 2, 'Lechería', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (5, 3, 'San Fernando de Apure', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (6, 4, 'Maracay', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (7, 4, 'Turmero', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (8, 5, 'Barinas', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (9, 6, 'Ciudad Bolívar', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (10, 6, 'Puerto Ordaz', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (11, 7, 'Valencia', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (12, 7, 'Puerto Cabello', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (13, 8, 'San Carlos', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (14, 9, 'Tucupita', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (15, 10, 'Caracas', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (16, 11, 'Coro', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (17, 11, 'Punto Fijo', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (18, 12, 'San Juan de los Morros', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (19, 13, 'Barquisimeto', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (20, 13, 'Cabudare', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (21, 13, 'Carora', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (22, 13, 'El Tocuyo', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (23, 13, 'Quíbor', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (24, 13, 'Duaca', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (25, 14, 'La Guaira', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (26, 15, 'Mérida', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (27, 16, 'Los Teques', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (28, 16, 'Guarenas', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (29, 16, 'Guatire', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (30, 17, 'Maturín', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (31, 18, 'La Asunción', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (32, 18, 'Porlamar', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (33, 19, 'Guanare', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (34, 19, 'Acarigua', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (35, 20, 'Cumaná', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (36, 21, 'San Cristóbal', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (37, 22, 'Trujillo', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (38, 22, 'Valera', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (39, 23, 'San Felipe', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (40, 24, 'Maracaibo', '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (41, 24, 'Cabimas', '2026-08-28 08:01:15', '2026-08-28 08:01:15');

-- Cliente de demo vinculado al usuario portal
INSERT INTO clientes (id, usuario_id, tipo_cliente, tipo_documento, numero_documento, nombre, apellido, telefono, estado_id, ciudad_id, creado_por, actualizado_por, creado_en, actualizado_en) VALUES
  (1, 3, 'natural', 'V', '12345678', 'Cliente', 'Demo', '04240000000', 13, 19, 1, 1, '2026-08-28 08:01:15', '2026-08-28 08:01:15');

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
  (1, '0102', 'Banco de Venezuela', 1, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (2, '0134', 'Banesco', 1, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (3, '0105', 'Mercantil', 1, '2026-08-28 08:01:15', '2026-08-28 08:01:15'),
  (4, '0108', 'Provincial', 1, '2026-08-28 08:01:15', '2026-08-28 08:01:15');

INSERT INTO puntos_venta (id, banco_id, codigo, nombre, numero_terminal, activo, creado_en, actualizado_en) VALUES
  (1, 2, 'POS-OFI', 'Punto oficina Travel BQTO', '001', 1, '2026-08-28 08:01:15', '2026-08-28 08:01:15');

-- Tasa EUR del día de importación (actualizar en Pagos > Tasas)
INSERT INTO tasas (id, fecha, valor, moneda_id) VALUES
  (1, CURDATE(), 160.0000, 1);

-- Parada de recogida habitual
INSERT INTO puntos_recogida (id, nombre, direccion, ciudad, estado, tipo, activo, creado_por, creado_en, actualizado_en) VALUES
  (1, 'Obelisco', 'Av. Florencio Jiménez', 'Barquisimeto', 'Lara', 'parada', 1, 1, '2026-08-28 08:01:15', '2026-08-28 08:01:15');

SET FOREIGN_KEY_CHECKS = 1;
