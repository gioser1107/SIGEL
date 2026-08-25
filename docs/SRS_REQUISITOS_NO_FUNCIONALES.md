# Matriz Única de Especificación de Requisitos No Funcionales de Software (SRS)

**Proyecto:** Desarrollo de un sistema integral para la gestión logística turística con módulos de analítica predictiva y arquitectura MVC para la agencia Travel BQTO, parroquia Ana Soto, Barquisimeto.

**Sistema:** SIGEL — Travel BQTO  
**Versión API:** 1.3.0  
**Integrantes:** María Alvarado, Luis Herice, Sergio Jiménez, Gabriel Jiménez  
**Tutor:** Edecio Freitez  
**Fecha:** Julio 2026

---

## 1. Introducción

Este documento especifica los **requisitos no funcionales (RNF)** del sistema SIGEL. Complementa la matriz de Requisitos Funcionales (RF-01 a RF-20) y está alineado con los diagramas de casos de uso A, B y C.

---

## 2. Matriz de requisitos no funcionales

---

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
- En cada request se comprueba que el usuario exista, no esté eliminado, que el correo y `rol_id` del token coincidan con la BD y que el rol esté activo.
- Expiración configurable vía `JWT_EXPIRACION_MINUTOS` (default ≤ 480 min, máximo 1440 min).
- Credenciales inválidas devuelven HTTP 401 con mensaje genérico.
- Usuarios con `eliminado_en` distinto de NULL no pueden autenticarse.

**Criterio de éxito:** En prueba de acceso a ≥ 20 endpoints protegidos, el 100 % rechaza peticiones sin token válido (401) o con token expirado (401).

**Necesidad:** La operación actual carece de control de acceso centralizado; datos de pagos y pasajeros circulan sin autenticación.

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
- Lista de permisos incluida en respuesta de login.

**Criterio de éxito:** Usuario rol «Cliente» recibe HTTP 403 en el 100 % de intentos sobre endpoints administrativos.

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
| **RF relacionados** | Todos (RF-01 a RF-20) |
| **Diagramas** | A, B, C |

**Descripción:** El sistema organiza la lógica en módulos independientes acoplados por API REST.

**Especificación:**
- Backend con ≥ 20 routers: auth, catálogo, destinos, clientes, usuarios, roles, permisos, ubicaciones, viajes, cotizaciones, reservas, asientos, unidades, pagos, monedas, tasas, bancos, bitácora, puntos_recogida, puntos_venta, abordajes, reseñas.
- Prefijo común `/api`; documentación OpenAPI en `/docs`.
- Frontend React desacoplado que consume exclusivamente la API.

**Criterio de éxito:** Cada módulo expone endpoints documentados en OpenAPI; desactivar un router no impide arranque del resto.

**Necesidad:** Arquitectura que permita incorporar módulos futuros sin reescribir el núcleo.

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
- El resumen indica el módulo, la acción realizada (crear/editar/eliminar/login) y el registro afectado.
- Registro automático en login, reservas, clientes, viajes, pagos, destinos, cotizaciones, abordaje, puntos recogida.
- Consulta con filtros y paginación (límite 1–200); permiso `leer_bitacora`.

**Criterio de éxito:** Tras login + 3 operaciones de escritura existen ≥ 4 registros coherentes; consulta sin permiso retorna HTTP 403.

**Necesidad:** No existe trazabilidad de quién modificó qué registro y cuándo.

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
- Eliminación lógica mediante `eliminado_en` en usuarios, clientes, roles, permisos, etc.
- Cuentas desactivadas no autentican ni aparecen en listados operativos.
- Cambios de estado registrados en bitácora.

**Criterio de éxito:** Usuario desactivado recibe HTTP 401 al login; registros históricos permanecen consultables.

**Nota:** La funcionalidad CRUD de usuarios es RF-02, no RNF.

**Necesidad:** Gestión manual sin historial estructurado de bajas o cambios de acceso.

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
- Validación en servidor con esquemas Pydantic y `ValidadorEntrada` en endpoints POST/PUT.
- Nombres de persona: solo letras, espacios, guiones y apóstrofes (sin dígitos ni basura).
- Campos de texto no aceptan cadenas vacías ni solo espacios.
- URLs de imágenes: formato `http(s)://` o `/api/archivos/...` y verificación de existencia/accesibilidad.
- Reglas: montos ≥ 0, fechas coherentes, campos obligatorios, tipos de documento válidos, teléfonos numéricos.
- HTTP 422 (esquema) o HTTP 400 (negocio) con JSON estructurado.
- Validación complementaria en frontend React.

**Criterio de éxito:** 100 % de endpoints POST/PUT con payload inválido retornan 422/400 sin insertar registro.

**Necesidad:** Errores recurrentes en pagos y omisiones de datos en procesos manuales.

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
- HTTPS/TLS 1.2+ en producción.
- Contraseñas como hash unidireccional (SHA-256 en prototipo; objetivo bcrypt/Argon2).
- Secretos en `.env` excluido de git.
- CORS restringido a orígenes autorizados.
- Uploads: whitelist MIME (JPEG, PNG, WebP), máximo 10 MB.

**Criterio de éxito:** 0 contraseñas en texto plano en BD; path-traversal bloqueado en archivos.

**Necesidad:** Comprobantes y referencias bancarias circulan por canales no seguros.

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

**Descripción:** Operaciones críticas (reservas, asientos, pagos) son atómicas y consistentes.

**Especificación:**
- MySQL InnoDB con transacciones ACID.
- `SELECT … FOR UPDATE` sobre el viaje y el asiento al reservar (bloqueo pesimista).
- Verificación de cupo atómica: si dos clientes reservan el mismo paquete a la misma hora, uno obtiene HTTP 409 y no hay sobreventa.
- Commit/rollback explícito encapsulado en la capa de persistencia de los modelos (`_persistir`, `_confirmar_transaccion`); los INSERT/UPDATE no se invocan desde controladores.
- FK con ON DELETE RESTRICT.
- Handler IntegrityError → HTTP 409; SQLAlchemyError → HTTP 503.

**Criterio de éxito:** 50 reservas concurrentes sobre mismo asiento → 0 sobreventas (1 éxito, resto 409/400).

**Necesidad:** Conflictos de concurrencia y sobreventa por coordinación manual.

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

**Descripción:** Portal y API accesibles durante horario operativo extendido.

**Especificación:**
- Objetivo uptime ≥ 99 % mensual.
- Health check en `/api`.
- Uvicorn ASGI; backup diario MySQL retención 7 días.

**Criterio de éxito:** Uptime ≥ 99 %; restauración BD < 60 min.

**Necesidad:** Operación turística requiere acceso fuera de horario de oficina.

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

**Descripción:** Operaciones frecuentes responden dentro de umbrales de latencia bajo carga nominal.

**Especificación:**
- P95 lecturas ≤ 2 s; P95 escrituras ≤ 3 s; health check ≤ 500 ms.
- 25 usuarios concurrentes, 70 % lectura / 30 % escritura.

**Criterio de éxito:** P95 dentro de umbrales en prueba de carga con Locust/k6.

**Necesidad:** Experiencia fluida en portal cliente y panel admin.

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

**Descripción:** Soporte de múltiples usuarios concurrentes y escalamiento horizontal de API.

**Especificación:**
- JWT stateless; paginación server-side; índices en BD.
- Arquitectura compatible con ≥ 2 workers Uvicorn.

**Criterio de éxito:** 50 usuarios virtuales 10 min → error 5xx < 1 %; P95 ≤ 4 s.

**Necesidad:** Picos de reservas y abordaje simultáneo en temporada alta.

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
- Bundle frontend ≤ 500 KB gzip.
- Imágenes convertidas a WebP (calidad 82); thumbnail ≤ 600 px.
- Paginación server-side en listados extensos.
- RAM proceso API ≤ 512 MB bajo 25 usuarios.

**Criterio de éxito:** Bundle ≤ 500 KB; JPEG 8 MB → WebP ≤ 400 KB; RAM ≤ 512 MB.

**Necesidad:** Infraestructura limitada y conectividad variable en campo.

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

**Descripción:** Código y arquitectura facilitan correcciones e integración de módulos futuros.

**Especificación:**
- MVC: `controladores/`, `modelos/`, `utilidades/`.
- Separación frontend/backend; OpenAPI auto-generada.
- Cobertura pruebas ≥ 60 % en auth, reservas, pagos (académico).

**Criterio de éxito:** Endpoint CRUD nuevo en ≤ 4 h; cobertura ≥ 60 % módulos críticos.

**Necesidad:** Integrar analítica predictiva sin reescribir núcleo operativo.

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
- Interfaz responsive (CSS); ancho mínimo 320 px.
- Chrome y Edge (últimas 2 versiones).
- API en Linux/Windows: Python 3.10+, MySQL 8.x; config vía `.env`.

**Criterio de éxito:** Reserva completable en 320×568 px sin scroll horizontal; 0 errores bloqueantes en consola.

**Necesidad:** Guías en campo necesitan acceso móvil al manifiesto y check-in.

---

### RNF-15 — Usabilidad en tareas críticas

| Campo | Contenido |
|-------|-----------|
| **ID** | RNF-15 |
| **Nombre del Requisito** | Usabilidad en tareas críticas |
| **Tipo** | No Funcional |
| **Prioridad** | Media |
| **Categoría** | Usabilidad (medible) |
| **RF relacionados** | RF-13, RF-14, RF-17, RF-20 |
| **Diagramas** | B, C |

**Descripción:** Reducir tasa de error en tareas de mayor frecuencia y criticidad.

**Especificación:**
- 5 usuarios (2 ATC, 1 guía, 2 clientes).
- Tareas: seleccionar asiento, registrar abono, consultar pagos pendientes.
- Error ≤ 10 %; reserva ≤ 10 min; mensajes en español.

**Criterio de éxito:** SUS ≥ 70; error ≤ 10 % en ≥ 4/5 participantes.

**Necesidad:** Sobreventa y errores de cobro por procesos manuales.

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

**Descripción:** Jerarquía de pantallas predecible según rol autenticado.

**Especificación:**
- ≤ 4 clics desde home del rol hasta: catálogo, reserva, mapa asientos, pagos pendientes.
- Menú persistente con sección activa; breadcrumbs en detalle.

**Criterio de éxito:** 100 % rutas críticas en ≤ 4 clics; 0 dead ends en flujo reserva/pago.

**Necesidad:** Sustituir flujo WhatsApp por portal guiado 24/7.

---

## 3. Tabla de cobertura UPTAEB

| Categoría obligatoria | RNF |
|----------------------|-----|
| Login / inicio de sesión | RNF-01 |
| Gestión de usuarios (ciclo de vida) | RNF-05 |
| Navegabilidad | RNF-16 |
| Portabilidad | RNF-14 |
| Usabilidad | RNF-15 |
| Mantenibilidad | RNF-13 |
| Eficiencia | RNF-12 |
| Fiabilidad | RNF-08 |
| Seguridad | RNF-01, RNF-02, RNF-07 |
| Validación de datos | RNF-06 |
| Permisos | RNF-02 |
| Roles | RNF-02 |
| Módulos | RNF-03 |
| Bitácora | RNF-04 |
| Rendimiento | RNF-10 |
| Tiempo de respuesta | RNF-10 |
| Escalabilidad | RNF-11 |
| Disponibilidad | RNF-09 |
| Uso eficiente de recursos | RNF-12 |

---

## 4. Trazabilidad RNF ↔ RF ↔ Diagramas

| RNF | RF principales | Diagramas |
|-----|----------------|-----------|
| RNF-01 | RF-01, RF-20 | A, B, C |
| RNF-02 | RF-02, RF-03, RF-04 | A |
| RNF-03 | RF-01 a RF-20 | A, B, C |
| RNF-04 | RF-05, RF-14, RF-15, RF-17 | A, B |
| RNF-05 | RF-02, RF-11 | A, B |
| RNF-06 | RF-06 a RF-18 | A, B, C |
| RNF-07 | RF-01, RF-14 | A, B, C |
| RNF-08 | RF-13, RF-14, RF-15 | B, C |
| RNF-09 | Transversal | A, B, C |
| RNF-10 | RF-10, RF-19, RF-20 | A, B, C |
| RNF-11 | RF-13, RF-17 | B |
| RNF-12 | RF-06, RF-19 | A, C |
| RNF-13 | Transversal | A, B, C |
| RNF-14 | RF-17, RF-19, RF-20 | B, C |
| RNF-15 | RF-13, RF-14, RF-17, RF-20 | B, C |
| RNF-16 | RF-19, RF-20 | A, B, C |

---

## 5. Referencia cruzada RF (no son RNF)

| ID | Nombre | RNF complementarios |
|----|--------|---------------------|
| RF-01 | Autenticación e identidad | RNF-01, RNF-02, RNF-07 |
| RF-02 | Gestión de usuarios | RNF-02, RNF-05, RNF-06 |
| RF-03 | Gestión de roles | RNF-02 |
| RF-04 | Gestión de permisos | RNF-02 |
| RF-05 | Consulta de bitácora | RNF-04 |
| RF-06 | Gestión de destinos | RNF-06, RNF-12 |
| RF-07 | Flota y asientos | RNF-06, RNF-08 |
| RF-08 | Puntos de recogida | RNF-06 |
| RF-09 | Planificación de viajes | RNF-06, RNF-08 |
| RF-10 | Dashboard | RNF-10 |
| RF-11 | Clientes | RNF-05, RNF-06 |
| RF-12 | Cotizaciones | RNF-06 |
| RF-13 | Reservas y asientos | RNF-08, RNF-15 |
| RF-14 | Reportes de pago | RNF-04, RNF-08 |
| RF-15 | Conciliación | RNF-04, RNF-08 |
| RF-16 | Catálogo financiero | RNF-06 |
| RF-17 | Abordaje | RNF-04, RNF-14 |
| RF-18 | Reseñas | RNF-06 |
| RF-19 | Portal público | RNF-14, RNF-16 |
| RF-20 | Portal cliente | RNF-01, RNF-15 |

---

*Documento generado conforme a la Guía Estándar SRS — UPTAEB, PNF Informática, Trayecto III.*
