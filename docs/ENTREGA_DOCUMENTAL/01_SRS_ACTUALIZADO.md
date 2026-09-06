# SRS actualizado — SIGEL / Travel BQTO

**Catálogo oficial de IDs:** `docs/SRS_REQUISITOS_FUNCIONALES.md` (RF-01 a RF-21) y `docs/SRS_REQUISITOS_NO_FUNCIONALES.md` (RNF-01 a RNF-16). Este archivo es un resumen trazable al código; **no reenumera** requisitos.

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

## 3. Requisitos funcionales (IDs oficiales)

| ID | Requisito verificable | Actor | Evidencia principal |
|---|---|---|---|
| RF-01 | Autenticar, registrar clientes y consultar perfil. | Visitante, cliente, personal | `auth_controlador.py` |
| RF-02 | Mantener cuentas de usuario (CRUD, rol, contraseña). | Administrador | `usuario_controlador.py` |
| RF-03 | Crear y asignar roles. | Administrador | `rol_controlador.py` |
| RF-04 | Mantener el catálogo de permisos granulares. | Administrador | `permiso_controlador.py` |
| RF-05 | Consultar bitácora por módulo, acción, usuario y fechas. | Administrador | `bitacora_controlador.py` |
| RF-06 | Administrar destinos e imágenes. | Administrador | `destino_controlador.py` |
| RF-07 | Gestionar unidades de transporte y asientos. | Administrador | `unidad_transporte_controlador.py`, `asiento_controlador.py` |
| RF-08 | Gestionar puntos de recogida del cliente y consulta admin. | Cliente, administrador | `puntos_recogida_controlador.py` |
| RF-09 | Planificar viajes, guías, costos, rutas y reporte de viaje. | Administrador | `viaje_controlador.py` |
| RF-10 | Consultar dashboard / estadísticas de catálogo. | Administrador | `catalogo_controlador.py` (`/estadisticas`) |
| RF-11 | Gestionar clientes y ubicaciones auxiliares. | Administrador | `cliente_controlador.py`, `ubicacion_controlador.py` |
| RF-12 | Crear, consultar, modificar y anular cotizaciones con líneas. | Administrador / ATC | `cotizacion_controlador.py` |
| RF-13 | Registrar reservas, viajeros y asientos sin sobreventa. | Cliente, administrador | `reservas_controlador.py` |
| RF-14 | Registrar reportes de pago con comprobante. | Cliente, administrador | `pago_controlador.py` |
| RF-15 | Aprobar o rechazar pagos y actualizar saldo. | Administrador | `pago_controlador.py` |
| RF-16 | Administrar monedas, tasas (incl. BCV), bancos, métodos y puntos de venta. | Administrador | controladores de catálogo financiero |
| RF-17 | Consultar manifiesto y registrar abordaje individual o por lote. | Guía, administrador | `abordaje_controlador.py` |
| RF-18 | Crear, consultar y moderar reseñas. | Cliente, administrador | `resena_controlador.py` |
| RF-19 | Publicar catálogo, detalle de destinos y agenda. | Visitante | `catalogo_controlador.py` |
| RF-20 | Autoservicio: reservas, pagos, recogida y reseñas. | Cliente | APIs portal en reservas, pagos, clientes |
| RF-21 | Reportes estadísticos por rango de fechas reales. | Administrador | `reporte_estadistico_controlador.py` |

### Reglas funcionales críticas

1. Una reserva pertenece a un cliente y a un viaje; sus viajeros se modelan mediante `reserva_clientes`.
2. Un asiento no puede estar vigente dos veces para el mismo viaje. La migración crea el índice único `uq_asiento_viaje_vigente`.
3. Las eliminaciones son lógicas cuando la entidad posee `eliminado_en`.
4. El pago pasa por validación administrativa; los ingresos de reportes (RF-21) se basan en pagos aprobados.
5. Los reportes estadísticos rechazan fechas imposibles, rangos invertidos y rangos superiores a diez años.

## 4. Requisitos no funcionales (IDs oficiales)

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RNF-01 | Autenticación y sesión JWT. | Recurso protegido sin token válido → 401. |
| RNF-02 | Autorización RBAC en servidor. | Acción sin permiso → 403. |
| RNF-03 | Arquitectura modular REST (MVC + React). | Frontend consume `/api`; routers por dominio; OpenAPI en `/docs`. |
| RNF-04 | Bitácora de acciones críticas. | Usuario, módulo, acción, tabla/registro, detalle, IP y fecha. |
| RNF-05 | Eliminación lógica y cuentas inactivas. | Desactivado no autentica; historial se conserva. |
| RNF-06 | Validación de datos en cliente y servidor. | Payload inválido → 400/422 sin persistir. |
| RNF-07 | Seguridad de credenciales y archivos. | Hash unidireccional; `.env` fuera de git; uploads con whitelist. SHA-256 es prototipo (no bcrypt). |
| RNF-08 | Fiabilidad e integridad transaccional. | Conflicto de asiento/cupo → 409; caída de BD → 503 genérico, sin traceback. |
| RNF-09 | Disponibilidad (objetivo de servicio). | Health en `/api`; no se afirma 99 % sin medición en servidor. |
| RNF-10 | Tiempo de respuesta / carga. | 20 usuarios / 3 min: promedio < 2 s y 0 % HTTP 500 (CP-RNF-01). |
| RNF-11 | Escalabilidad concurrente. | JWT stateless; 5xx < 1 % con 50 VU en prueba documentada. |
| RNF-12 | Eficiencia de recursos. | Paginación; imágenes WebP; bundle acotado. |
| RNF-13 | Mantenibilidad MVC. | `controladores/`, `modelos/`, `utilidades/`. |
| RNF-14 | Portabilidad cliente. | Chrome/Edge; viewport 320 px. |
| RNF-15 | Usabilidad medible. | SUS ≥ 70; tareas críticas en español. |
| RNF-16 | Navegabilidad. | ≤ 4 clics a reserva, asientos o pagos. |

Para la guía de pruebas 2026 se usan **cinco** de estos (RNF-07, RNF-10, RNF-08, RNF-15, RNF-13) con diez casos CP-RNF-01 a CP-RNF-10, definidos en el documento maestro de RNF.

## 5. Exclusiones y límites conocidos

- El código muestra reportes **descriptivos** (RF-21); no hay componente de predicción.
- No se documenta análisis por género/edad: el modelo de clientes no almacena esos atributos.
- La regla de que **todo viajero es un cliente** está implementada en reservas; debe demostrarse en defensa con un caso familiar.
