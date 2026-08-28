# Diccionario de datos resumido

Este diccionario describe el modelo **actual** para apoyar su explicación y la revisión de normalización. Los tipos y restricciones detallados están en `backend/modelos`.

| Tabla | Propósito | Clave y relaciones |
|---|---|---|
| `usuarios` | Credenciales y datos del usuario del sistema. | `rol_id → roles`. |
| `roles`, `permisos`, `roles_permisos` | Control RBAC de acceso. | Pivot rol-permiso. |
| `clientes` | Persona o entidad atendida; posible viajero. | `usuario_id`, `estado_id`, `ciudad_id`. |
| `destinos`, `destino_imagenes` | Paquetes/destinos ofertados y galería. | Imagen pertenece a destino. |
| `unidades_transporte`, `asientos` | Flota y distribución de puestos. | Asiento pertenece a unidad. |
| `viajes`, `viajes_guias`, `costos_operativos` | Operación de una salida. | Viaje usa destino/unidad; guías y costos asociados. |
| `cotizaciones`, `cotizacion_lineas` | Oferta personalizada y conceptos de cobro. | Línea pertenece a cotización. |
| `reservas` | Cabecera de la reserva de un titular para un viaje. | `cliente_id`, `viaje_id`. |
| `reserva_clientes` | Vínculo entre reserva y cada cliente que viaja. | `reserva_id`, `cliente_id`, punto de recogida. |
| `asientos_reservados` | Puesto asignado a un viajero en un viaje. | `reserva_cliente_id`, `viaje_id`, `asiento_id`. |
| `pagos` | Reporte y validación de cobros. | Reserva, método, tasa, bancos/punto de venta. |
| `monedas`, `tasas`, `metodos_pago`, `bancos`, `puntos_venta` | Catálogo financiero. | Método usa moneda; tasa usa moneda; punto usa banco. |
| `puntos_recogida`, `clientes_puntos_recogida`, `viajes_ruta_recogida` | Ubicaciones del cliente y orden operativo. | Pivots cliente-punto y viaje-viajero. |
| `abordajes_viaje` | Control de subida del pasajero. | `reserva_cliente_id`, usuario registrador. |
| `resenas` | Opinión de una reserva. | `reserva_id` único. |
| `bitacora` | Trazabilidad de operaciones. | Usuario, módulo, acción, tabla y registro afectados. |

## Campos de trazabilidad comunes

Las entidades transaccionales contienen, según su dominio, `creado_en`, `actualizado_en` y `eliminado_en`. En entidades sensibles también se conserva `creado_por`, `actualizado_por`, `validado_por` o `registrado_por`.

## Validación de integridad que debe demostrarse

1. `reserva_clientes` no almacena nombre/apellido duplicados; referencia a `clientes`.
2. No se duplica cliente vigente dentro de una misma reserva por `uq_reserva_cliente_vigente`.
3. No se duplica asiento vigente dentro de un viaje por `uq_asiento_viaje_vigente`.
4. Toda entidad eliminada lógicamente deja su historial para auditoría.
