### RNF-01 — Autenticación y control de sesión

| Campo | Contenido |
|-------|-----------|
| **ID** | RNF-01 |
| **Nombre del Requisito** | Autenticación y control de sesión |
| **Tipo** | No Funcional |
| **Prioridad** | Alta |
| **Categoría** | Seguridad / Acceso |
| **RF relacionados** | RF-01, RF-20 |
| **Diagramas** | A, B, C |

**Descripción:** Toda operación administrativa, operativa o de portal cliente exige identidad verificada antes de ejecutarse.

**Especificación:**
- Autenticación stateless mediante token JWT (esquema Bearer, algoritmo HS256).
- El token exige claims `sub`, `exp`, `iat`; se verifica firma, expiración, formato (3 segmentos) y tipo `access`.
- En cada solicitud se comprueba que el usuario exista, no esté eliminado, que el correo y `rol_id` del token coincidan con la base de datos y que el rol esté activo.
- Expiración configurable vía `JWT_EXPIRACION_MINUTOS` (valor por defecto menor o igual a 480 minutos, máximo 1440 minutos).
- Credenciales inválidas devuelven HTTP 401 con mensaje genérico.
- Usuarios con `eliminado_en` distinto de NULL no pueden autenticarse.

**Criterio de éxito:** En prueba de acceso a al menos 20 endpoints protegidos, el 100 % rechaza peticiones sin token válido (401) o con token expirado (401).

**Necesidad:** La operación actual carece de control de acceso centralizado; datos de pagos y pasajeros no deben circular sin autenticación.

---

### RNF-02 — Autorización basada en roles y permisos (RBAC)

| Campo | Contenido |
|-------|-----------|
| **ID** | RNF-02 |
| **Nombre del Requisito** | Autorización basada en roles y permisos |
| **Tipo** | No Funcional |
| **Prioridad** | Alta |
| **Categoría** | Seguridad / Control de acceso |
| **RF relacionados** | RF-02, RF-03, RF-04 |
| **Diagramas** | A |

**Descripción:** Cada usuario ejecuta únicamente las acciones acordes a su rol y permisos asignados.

**Especificación:**
- Modelo RBAC: tablas `roles`, `permisos`, `roles_permisos`.
- Permisos granulares por módulo: convención `crear_*`, `leer_*`, `editar_*`, `borrar_*`.
- Validación en servidor: `requiere_permiso()` y `requiere_alguno_de_permisos()`.
- HTTP 403 cuando el permiso no está asignado.
- Lista de permisos incluida en la respuesta de login.

**Criterio de éxito:** Usuario con rol «Cliente» recibe HTTP 403 en el 100 % de intentos sobre endpoints administrativos.

**Necesidad:** Personal segmentado (gerencia, administración, guías, clientes) requiere separación de responsabilidades.

---

### RNF-03 — Modularización funcional del sistema

| Campo | Contenido |
|-------|-----------|
| **ID** | RNF-03 |
| **Nombre del Requisito** | Modularización funcional del sistema |
| **Tipo** | No Funcional |
| **Prioridad** | Media |
| **Categoría** | Arquitectura / Modularidad |
| **RF relacionados** | RF-01 a RF-21 |
| **Diagramas** | A, B, C |

**Descripción:** El sistema organiza la lógica en módulos independientes acoplados por API REST.

**Especificación:**
- Backend con routers por dominio bajo `/api`: autenticación, catálogo, destinos, clientes, usuarios, roles, permisos, ubicaciones, viajes, cotizaciones, reservas, asientos, unidades, pagos, monedas, tasas, bancos, bitácora, puntos de recogida, puntos de venta, abordajes, reseñas, reportes y métodos de pago.
- Documentación OpenAPI en `/docs`.
- Frontend desacoplado que consume exclusivamente la API.

**Criterio de éxito:** Cada módulo expone endpoints documentados en OpenAPI; desactivar un router no impide el arranque del resto.

**Necesidad:** Incorporar módulos futuros sin reescribir el núcleo.

---

### RNF-04 — Bitácora y trazabilidad de auditoría

| Campo | Contenido |
|-------|-----------|
| **ID** | RNF-04 |
| **Nombre del Requisito** | Bitácora y trazabilidad de auditoría |
| **Tipo** | No Funcional |
| **Prioridad** | Alta |
| **Categoría** | Operabilidad / Seguridad / Cumplimiento |
| **RF relacionados** | RF-05, RF-14, RF-15, RF-17 |
| **Diagramas** | A, B |

**Descripción:** Las acciones críticas quedan registradas para auditoría y responsabilidad.

**Especificación:**
- Tabla `bitacora`: usuario_id, modulo, accion, tabla_afectada, registro_id, resumen, detalle JSON, ip_origen, creado_en.
- El resumen indica el módulo, la acción realizada (crear, editar, eliminar, login) y el registro afectado.
- Registro automático en login, reservas, clientes, viajes, pagos, destinos, cotizaciones, abordaje y puntos de recogida.
- Consulta con filtros y paginación (límite 1–200); permiso `leer_bitacora`.

**Criterio de éxito:** Tras login y 3 operaciones de escritura existen al menos 4 registros coherentes; consulta sin permiso retorna HTTP 403.

**Necesidad:** Trazabilidad de quién modificó qué registro y cuándo.

---

### RNF-05 — Ciclo de vida de cuentas y trazabilidad legal

| Campo | Contenido |
|-------|-----------|
| **ID** | RNF-05 |
| **Nombre del Requisito** | Ciclo de vida de cuentas y trazabilidad legal |
| **Tipo** | No Funcional |
| **Prioridad** | Alta |
| **Categoría** | Operación / Cumplimiento / Seguridad |
| **RF relacionados** | RF-02, RF-11 |
| **Diagramas** | A, B |

**Descripción:** Las cuentas desactivadas dejan de operar sin eliminar el historial legal asociado.

**Especificación:**
- Eliminación lógica mediante `eliminado_en` en usuarios, clientes, roles, permisos y entidades equivalentes.
- Cuentas desactivadas no autentican ni aparecen en listados operativos.
- Cambios de estado registrados en bitácora.

**Criterio de éxito:** Usuario desactivado recibe HTTP 401 al login; los registros históricos permanecen consultables.

**Necesidad:** Conservar historial de bajas y cambios de acceso.

---

### RNF-06 — Validación de datos de entrada

| Campo | Contenido |
|-------|-----------|
| **ID** | RNF-06 |
| **Nombre del Requisito** | Validación de datos de entrada |
| **Tipo** | No Funcional |
| **Prioridad** | Alta |
| **Categoría** | Calidad de datos / Robustez |
| **RF relacionados** | RF-06 a RF-18 |
| **Diagramas** | A, B, C |

**Descripción:** Toda entrada inválida se rechaza antes de persistirse en base de datos.

**Especificación:**
- Validación en servidor con esquemas Pydantic y validador de entrada en endpoints POST y PUT.
- Nombres de persona: solo letras, espacios, guiones y apóstrofes.
- Campos de texto no aceptan cadenas vacías ni solo espacios.
- URLs de imágenes: formato `http(s)://` o `/api/archivos/...`.
- Montos mayores o iguales a 0, fechas coherentes, campos obligatorios, tipos de documento válidos, teléfonos numéricos.
- HTTP 422 (esquema) o HTTP 400 (negocio) con JSON estructurado.
- Validación complementaria en el frontend.

**Criterio de éxito:** El 100 % de endpoints POST/PUT con payload inválido retornan 422 o 400 sin insertar registro.

**Necesidad:** Reducir errores en pagos y omisiones de datos.

---

### RNF-07 — Seguridad de datos y comunicaciones

| Campo | Contenido |
|-------|-----------|
| **ID** | RNF-07 |
| **Nombre del Requisito** | Seguridad de datos y comunicaciones |
| **Tipo** | No Funcional |
| **Prioridad** | Alta |
| **Categoría** | Seguridad / Confidencialidad |
| **RF relacionados** | RF-01, RF-14 |
| **Diagramas** | A, B, C |

**Descripción:** Protección de credenciales y datos sensibles en tránsito y en reposo.

**Especificación:**
- HTTPS/TLS 1.2 o superior como objetivo de producción.
- Contraseñas almacenadas como hash unidireccional (SHA-256 en prototipo; objetivo bcrypt o Argon2).
- Secretos en archivo de entorno excluido del control de versiones.
- CORS restringido a orígenes autorizados.
- Cargas: tipos MIME permitidos JPEG, PNG y WebP; máximo 10 MB.

**Criterio de éxito:** Cero contraseñas en texto plano en base de datos; recorrido de rutas de archivos (path traversal) bloqueado.

**Necesidad:** Proteger comprobantes, referencias bancarias y credenciales.

---

### RNF-08 — Fiabilidad e integridad transaccional

| Campo | Contenido |
|-------|-----------|
| **ID** | RNF-08 |
| **Nombre del Requisito** | Fiabilidad e integridad transaccional |
| **Tipo** | No Funcional |
| **Prioridad** | Alta |
| **Categoría** | Fiabilidad / Integridad |
| **RF relacionados** | RF-13, RF-14, RF-15 |
| **Diagramas** | B, C |

**Descripción:** Las operaciones críticas (reservas, asientos, pagos) son atómicas y consistentes.

**Especificación:**
- MySQL InnoDB con transacciones ACID.
- Bloqueo pesimista sobre viaje y asiento al reservar.
- Si dos clientes reservan el mismo cupo o asiento a la vez, uno obtiene HTTP 409 y no hay sobreventa.
- Persistencia encapsulada en la capa de modelos; los controladores no ejecutan INSERT ni UPDATE directos.
- Claves foráneas con restricción al eliminar.
- Conflicto de integridad → HTTP 409; fallo de base de datos → HTTP 503 con mensaje genérico; error interno → HTTP 500 genérico, sin traza al usuario.

**Criterio de éxito:** 50 reservas concurrentes sobre el mismo asiento producen cero sobreventas (una exitosa, el resto 409 o 400).

**Necesidad:** Evitar conflictos de concurrencia y sobreventa.

---

### RNF-09 — Disponibilidad del servicio

| Campo | Contenido |
|-------|-----------|
| **ID** | RNF-09 |
| **Nombre del Requisito** | Disponibilidad del servicio |
| **Tipo** | No Funcional |
| **Prioridad** | Media |
| **Categoría** | Disponibilidad |
| **RF relacionados** | Transversal |
| **Diagramas** | A, B, C |

**Descripción:** Portal y API accesibles durante el horario operativo extendido.

**Especificación:**
- Objetivo de disponibilidad mensual mayor o igual a 99 %.
- Verificación de salud en `/api`.
- Respaldo diario de MySQL con retención de 7 días.

**Criterio de éxito:** Disponibilidad mayor o igual a 99 %; restauración de base de datos en menos de 60 minutos.

**Necesidad:** Operación turística fuera del horario de oficina.

---

### RNF-10 — Tiempo de respuesta de la API

| Campo | Contenido |
|-------|-----------|
| **ID** | RNF-10 |
| **Nombre del Requisito** | Tiempo de respuesta de la API |
| **Tipo** | No Funcional |
| **Prioridad** | Media |
| **Categoría** | Rendimiento |
| **RF relacionados** | RF-10, RF-19, RF-20 |
| **Diagramas** | A, B, C |

**Descripción:** Las operaciones frecuentes responden dentro de umbrales de latencia bajo carga nominal.

**Especificación:**
- Percentil 95 de lecturas menor o igual a 2 segundos; de escrituras menor o igual a 3 segundos; salud menor o igual a 500 ms.
- 25 usuarios concurrentes, 70 % lectura y 30 % escritura.
- Prueba de carga: 20 usuarios virtuales, 3 minutos, promedio menor a 2 segundos y 0 % de errores HTTP 500.

**Criterio de éxito:** Percentil 95 dentro de umbrales en prueba de carga con Apache JMeter o Locust.

**Necesidad:** Experiencia fluida en portal cliente y panel administrativo.

---

### RNF-11 — Escalabilidad y carga concurrente

| Campo | Contenido |
|-------|-----------|
| **ID** | RNF-11 |
| **Nombre del Requisito** | Escalabilidad y carga concurrente |
| **Tipo** | No Funcional |
| **Prioridad** | Media |
| **Categoría** | Escalabilidad |
| **RF relacionados** | RF-13, RF-17 |
| **Diagramas** | B |

**Descripción:** Soporte de múltiples usuarios concurrentes y escalamiento horizontal de la API.

**Especificación:**
- JWT sin estado en servidor; paginación en el servidor; índices en base de datos.
- Arquitectura compatible con al menos 2 procesos de aplicación.

**Criterio de éxito:** 50 usuarios virtuales durante 10 minutos → errores 5xx menores al 1 %; percentil 95 menor o igual a 4 segundos.

**Necesidad:** Atender picos de reservas y abordaje en temporada alta.

---

### RNF-12 — Eficiencia y uso de recursos

| Campo | Contenido |
|-------|-----------|
| **ID** | RNF-12 |
| **Nombre del Requisito** | Eficiencia y uso de recursos |
| **Tipo** | No Funcional |
| **Prioridad** | Media |
| **Categoría** | Eficiencia |
| **RF relacionados** | RF-06, RF-19 |
| **Diagramas** | A, C |

**Descripción:** Uso eficiente de CPU, memoria, ancho de banda y almacenamiento.

**Especificación:**
- Paquete del frontend menor o igual a 500 KB comprimido.
- Imágenes convertidas a WebP (calidad 82); miniatura menor o igual a 600 px.
- Paginación en el servidor en listados extensos.
- Memoria del proceso de API menor o igual a 512 MB con 25 usuarios.

**Criterio de éxito:** Paquete menor o igual a 500 KB; imagen JPEG de 8 MB convertida a WebP menor o igual a 400 KB; RAM menor o igual a 512 MB.

**Necesidad:** Infraestructura limitada y conectividad variable.

---

### RNF-13 — Mantenibilidad del software

| Campo | Contenido |
|-------|-----------|
| **ID** | RNF-13 |
| **Nombre del Requisito** | Mantenibilidad del software |
| **Tipo** | No Funcional |
| **Prioridad** | Media |
| **Categoría** | Mantenibilidad |
| **RF relacionados** | Transversal |
| **Diagramas** | A, B, C |

**Descripción:** El código y la arquitectura facilitan correcciones e integración de módulos futuros.

**Especificación:**
- Arquitectura MVC: controladores, modelos y utilidades.
- Separación frontend y backend; OpenAPI generada.
- Objetivo académico de cobertura de pruebas mayor o igual a 60 % en autenticación, reservas y pagos.

**Criterio de éxito:** Un endpoint CRUD nuevo en 4 horas o menos; cobertura mayor o igual a 60 % en módulos críticos al ejecutar la batería de pruebas.

**Necesidad:** Extender el sistema sin reescribir el núcleo operativo.

---

### RNF-14 — Portabilidad y compatibilidad cliente

| Campo | Contenido |
|-------|-----------|
| **ID** | RNF-14 |
| **Nombre del Requisito** | Portabilidad y compatibilidad cliente |
| **Tipo** | No Funcional |
| **Prioridad** | Alta |
| **Categoría** | Portabilidad / Compatibilidad |
| **RF relacionados** | RF-17, RF-19, RF-20 |
| **Diagramas** | B, C |

**Descripción:** Acceso funcional desde escritorio y móviles (guías y clientes).

**Especificación:**
- Interfaz adaptable; ancho mínimo 320 px.
- Chrome y Edge (últimas 2 versiones).
- API en Linux o Windows: Python 3.10 o superior, MySQL 8.x; configuración por variables de entorno.

**Criterio de éxito:** Reserva completable en 320×568 px sin desplazamiento horizontal bloqueante; cero errores de consola que impidan el uso.

**Necesidad:** Guías en campo y clientes en teléfono.

---

### RNF-15 — Usabilidad en tareas críticas

| Campo | Contenido |
|-------|-----------|
| **ID** | RNF-15 |
| **Nombre del Requisito** | Usabilidad en tareas críticas |
| **Tipo** | No Funcional |
| **Prioridad** | Media |
| **Categoría** | Usabilidad |
| **RF relacionados** | RF-13, RF-14, RF-17, RF-20 |
| **Diagramas** | B, C |

**Descripción:** Reducir la tasa de error en las tareas de mayor frecuencia y criticidad.

**Especificación:**
- 5 usuarios (2 atención al cliente, 1 guía, 2 clientes).
- Tareas: seleccionar asiento, registrar abono, consultar pagos pendientes.
- Error menor o igual a 10 %; reserva en 10 minutos o menos; mensajes en español.

**Criterio de éxito:** Escala SUS mayor o igual a 70; error menor o igual a 10 % en al menos 4 de 5 participantes.

**Necesidad:** Reducir sobreventa y errores de cobro por procesos manuales.

---

### RNF-16 — Navegabilidad estructurada

| Campo | Contenido |
|-------|-----------|
| **ID** | RNF-16 |
| **Nombre del Requisito** | Navegabilidad estructurada |
| **Tipo** | No Funcional |
| **Prioridad** | Media |
| **Categoría** | Usabilidad / Navegación |
| **RF relacionados** | RF-19, RF-20 |
| **Diagramas** | A, B, C |

**Descripción:** Jerarquía de pantallas predecible según el rol autenticado.

**Especificación:**
- Máximo 4 clics desde el inicio del rol hasta: catálogo, reserva, mapa de asientos, pagos pendientes.
- Menú persistente con sección activa; ruta de navegación en pantallas de detalle.

**Criterio de éxito:** El 100 % de las rutas críticas en 4 clics o menos; cero callejones sin salida en el flujo reserva/pago.

**Necesidad:** Sustituir el flujo informal por un portal guiado.
