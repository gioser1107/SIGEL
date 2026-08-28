# SRS actualizado — SIGEL / Travel BQTO

## 1. Alcance

SIGEL apoya a Travel BQTO en la publicación y administración de destinos turísticos, gestión de clientes, cotizaciones, viajes, reservas con viajeros y asientos, pagos, abordaje, seguridad, auditoría y reportes de negocio. Consta de portal público, portal del cliente y área administrativa.

## 2. Actores

| Actor | Responsabilidad |
|---|---|
| Visitante | Consulta destinos y agenda; puede registrarse. |
| Cliente | Gestiona sus reservas, viajeros, puntos de recogida, pagos y reseñas. |
| Administrador | Administra catálogos, clientes, viajes, reservas, pagos, seguridad y reportes. |
| Guía | Consulta operación del viaje y registra abordaje según permisos. |
| API/BD | Valida, persiste, protege la concurrencia y registra auditoría. |

## 3. Requisitos funcionales

| ID | Requisito verificable | Actor | Evidencia principal |
|---|---|---|---|
| RF-01 | Autenticar usuarios, registrar clientes y consultar perfil. | Visitante, cliente, personal | `auth_controlador.py` |
| RF-02 | Mantener usuarios, roles y permisos granulares. | Administrador | `usuario`, `rol`, `permiso` controladores |
| RF-03 | Consultar la bitácora por usuario, módulo, acción y fechas. | Administrador | `bitacora_controlador.py`, `bitacora_modelo.py` |
| RF-04 | Administrar el catálogo de destinos y sus imágenes. | Administrador | `destino_controlador.py` |
| RF-05 | Publicar catálogo, detalle de destinos y agenda de viajes. | Visitante | `catalogo_controlador.py` |
| RF-06 | Gestionar clientes y sus datos de contacto. | Administrador | `cliente_controlador.py` |
| RF-07 | Gestionar puntos de recogida del cliente y la ruta del viaje. | Cliente, administrador | `puntos_recogida`, `viaje_ruta_recogida` |
| RF-08 | Gestionar unidades de transporte y asientos. | Administrador | `unidad`, `asiento` controladores |
| RF-09 | Planificar viajes, guías, costos y rutas de recogida. | Administrador | `viaje_controlador.py` |
| RF-10 | Crear, consultar, modificar y anular cotizaciones con líneas. | Administrador / atención al cliente | `cotizacion_controlador.py` |
| RF-11 | Registrar reservas para un viaje y asociar viajeros. | Cliente, administrador | `reservas_controlador.py` |
| RF-12 | Asignar, consultar y liberar asientos de viajeros. | Cliente, administrador | `asientos_reservados`, migración de concurrencia |
| RF-13 | Registrar reportes de pago con comprobante y consultar su estado. | Cliente, administrador | `pago_controlador.py` |
| RF-14 | Aprobar o rechazar pagos y conservar validación. | Administrador | `pago_controlador.py` |
| RF-15 | Administrar monedas, tasas, bancos, métodos y puntos de venta. | Administrador | controladores de catálogo financiero |
| RF-16 | Consultar manifiesto y registrar abordaje individual o por lote. | Guía, administrador | `abordaje_controlador.py` |
| RF-17 | Crear, consultar y moderar reseñas de viajes elegibles. | Cliente, administrador | `resena_controlador.py` |
| RF-18 | Consultar reportes estadísticos por rango de fechas reales. | Administrador | `reporte_estadistico_modelo.py` |
| RF-19 | Emitir reporte operativo del viaje e imprimirlo. | Administrador | `viaje_controlador.py`, `ReporteViaje.tsx` |

### Reglas funcionales críticas

1. Una reserva pertenece a un cliente y a un viaje; sus viajeros se modelan mediante `reserva_clientes`.
2. Un asiento no puede estar vigente dos veces para el mismo viaje. La migración crea el índice único `uq_asiento_viaje_vigente`.
3. Las eliminaciones son lógicas cuando la entidad posee `eliminado_en`.
4. El pago pasa por validación administrativa; los ingresos de reportes se basan en pagos aprobados.
5. Los reportes estadísticos rechazan fechas imposibles, rangos invertidos y rangos superiores a diez años.

## 4. Requisitos no funcionales

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RNF-01 | Autenticación y sesión JWT. | Rechazar solicitud protegida sin token válido con 401. |
| RNF-02 | Autorización RBAC en servidor. | Rechazar acción sin permiso con 403. |
| RNF-03 | Validación de datos en cliente y servidor. | No persistir payload inválido; responder 400/422. |
| RNF-04 | Integridad de reservas y asientos. | Evitar doble asignación vigente por restricciones e índices. |
| RNF-05 | Auditoría de acciones críticas. | Registrar usuario, módulo, acción, tabla/registro, detalle, IP y fecha. |
| RNF-06 | Eliminación lógica e historial. | Ocultar registro operativo sin destruir historial. |
| RNF-07 | Arquitectura modular REST. | Frontend React consume API FastAPI bajo `/api`; routers por dominio. |
| RNF-08 | Manejo de errores de integridad y base de datos. | Responder 409 a conflicto y 503 a fallo de BD. |
| RNF-09 | Usabilidad administrativa y cliente. | Rutas protegidas, filtros, paginación y mensajes comprensibles. |
| RNF-10 | Trazabilidad documental. | Todo caso de uso y diagrama referencia módulo real del repositorio. |

## 5. Exclusiones y límites conocidos

- El código muestra reportes descriptivos; no se identificó componente de predicción.
- No se debe documentar el análisis por género/edad como disponible: el modelo de clientes no almacena esos atributos.
- La regla académica discutida de que **todo viajero debe ser un cliente** requiere verificación final del equipo y una prueba de datos antes de la defensa.
