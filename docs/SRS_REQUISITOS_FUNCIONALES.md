# Matriz de Especificación de Requisitos Funcionales (SRS)

**Proyecto:** Desarrollo de un sistema integral para la gestión logística turística con módulos de analítica predictiva y arquitectura MVC para la agencia Travel BQTO, parroquia Ana Soto, Barquisimeto.

**Sistema:** SIGEL — Travel BQTO  
**Versión API:** 1.3.0  
**Integrantes:** María Alvarado, Luis Herice, Sergio Jiménez, Gabriel Jiménez  
**Tutor:** Edecio Freitez  
**Fecha:** Julio 2026

---

## 1. Introducción

Este documento especifica los **requisitos funcionales (RF)** del sistema SIGEL. Cada RF describe una capacidad observable del sistema que debe implementarse para satisfacer las necesidades de la agencia Travel BQTO.

Los RF están alineados con:
- Diagrama A — Administración, seguridad y catálogo
- Diagrama B — Comercial, finanzas y operación
- Diagrama C — Portal público y portal cliente
- Plantillas IBM de casos de uso (M1–M9)
- Requisitos no funcionales RNF-01 a RNF-16

---

## 2. Resumen de requisitos funcionales

| ID | Nombre | Prioridad | Actor principal | Diagrama | Casos de uso IBM |
|----|--------|-----------|-----------------|----------|------------------|
| RF-01 | Autenticación e identidad | Alta | Todos | A, B, C | — |
| RF-02 | Gestión de usuarios | Alta | Administrador | A | M6-U1 a M6-U4 |
| RF-03 | Gestión de roles | Alta | Administrador | A | M6-U5 a M6-U8 |
| RF-04 | Gestión de permisos | Alta | Administrador | A | M9-U1 a M9-U4 |
| RF-05 | Consulta de bitácora | Alta | Administrador | A | — |
| RF-06 | Gestión de destinos | Alta | Administrador | A | M1-U1 a M1-U4 |
| RF-07 | Gestión de flota y asientos | Alta | Administrador | A | — |
| RF-08 | Gestión de puntos de recogida | Alta | Administrador / Cliente | A, C | M8-U1 a M8-U4 |
| RF-09 | Planificación de viajes | Alta | Administrador | A | M3-O1 a M3-O6 |
| RF-10 | Dashboard administrativo | Media | Administrador | A | — |
| RF-11 | Gestión de clientes | Alta | Administrador | B | M7-U1 a M7-U4 |
| RF-12 | Gestión de cotizaciones | Alta | Administrador / ATC | B | M5-U1 a M5-U5 |
| RF-13 | Gestión de reservas y asientos | Alta | Administrador / Cliente | B, C | M1-U5 a M1-U10 |
| RF-14 | Registro de reportes de pago | Alta | Administrador / Cliente | B, C | M2-U1 |
| RF-15 | Conciliación de pagos | Alta | Administrador | B | M2-U2 |
| RF-16 | Configuración de catálogo financiero | Alta | Administrador | B | — |
| RF-17 | Control de abordaje | Alta | Administrador / Guía | B | M4-U1 a M4-U4 |
| RF-18 | Moderación de reseñas | Media | Administrador / Cliente | B, C | — |
| RF-19 | Portal público | Alta | Visitante | C | M1-U2 |
| RF-20 | Portal cliente | Alta | Cliente | C | M1-U6, M1-U7 |

---

## 3. Matriz detallada de requisitos funcionales

---

### RF-01 — Autenticación e identidad

| Campo | Contenido |
|-------|-----------|
| **ID** | RF-01 |
| **Nombre del Requisito** | Autenticación e identidad |
| **Tipo** | Funcional |
| **Prioridad** | Alta |
| **Actores** | Visitante, Cliente, Administrador, Guía |
| **Diagrama relacionado** | A, B, C |
| **RNF relacionados** | RNF-01, RNF-02, RNF-05, RNF-07 |

**Descripción:** El sistema debe permitir el registro de clientes, el inicio de sesión con credenciales y la obtención de un perfil autenticado con rol y permisos.

**Especificación:**
- `POST /api/auth/login` — inicio de sesión con correo y contraseña; respuesta con token JWT.
- `POST /api/auth/registro` — registro público de cliente con creación de usuario rol «Cliente».
- `GET /api/auth/perfil` — consulta del perfil de sesión activa.
- Usuarios con `eliminado_en` distinto de NULL no pueden autenticarse.
- El token incluye `sub`, `correo`, `rol_id`; permisos cargados en cada request.

**Criterios de aceptación:**
1. Credenciales válidas retornan HTTP 200 con token JWT.
2. Credenciales inválidas retornan HTTP 401 con mensaje genérico.
3. Registro exitoso crea usuario + cliente y retorna token.
4. Login registra evento en bitácora (módulo seguridad).

**Necesidad:** Sustituir acceso informal por identidad verificada en portal admin y cliente.

---

### RF-02 — Gestión de usuarios

| Campo | Contenido |
|-------|-----------|
| **ID** | RF-02 |
| **Nombre del Requisito** | Gestión de cuentas de usuario |
| **Tipo** | Funcional |
| **Prioridad** | Alta |
| **Actores** | Administrador |
| **Diagrama relacionado** | A |
| **Casos de uso IBM** | M6-U1 Crear, M6-U2 Consultar, M6-U3 Modificar, M6-U4 Eliminar |
| **RNF relacionados** | RNF-02, RNF-05, RNF-06 |

**Descripción:** El administrador gestiona cuentas internas del sistema: crear, consultar, modificar, desactivar, asignar rol y resetear contraseña.

**Especificación:**
- `GET /api/usuarios/` — listado paginado (permiso `leer_usuarios`).
- `GET /api/usuarios/{id}` — detalle (permiso `leer_usuarios` o propio usuario).
- `POST /api/usuarios/` — crear (permiso `crear_usuarios`).
- `PUT /api/usuarios/{id}` — modificar (permiso `editar_usuarios`).
- `DELETE /api/usuarios/{id}` — soft delete (permiso `borrar_usuarios`).
- `PUT /api/usuarios/{id}/rol` — asignar rol.
- `PUT /api/usuarios/{id}/contrasena` — resetear contraseña (admin).
- `PUT /api/usuarios/mi-perfil` — actualizar perfil propio.
- Validación de correo único; contraseña hasheada.

**Criterios de aceptación:**
1. CRUD completo operativo desde panel Seguridad → Usuarios.
2. No se puede eliminar el propio usuario en sesión.
3. Usuario desactivado no aparece en listados activos.
4. Asignación de rol actualiza permisos en siguiente login.

---

### RF-03 — Gestión de roles

| Campo | Contenido |
|-------|-----------|
| **ID** | RF-03 |
| **Nombre del Requisito** | Gestión de roles del sistema |
| **Tipo** | Funcional |
| **Prioridad** | Alta |
| **Actores** | Administrador |
| **Diagrama relacionado** | A |
| **Casos de uso IBM** | M6-U5 a M6-U8 |
| **RNF relacionados** | RNF-02 |

**Descripción:** El administrador crea, consulta, modifica y elimina roles; asigna y quita permisos mediante matriz de seguridad.

**Especificación:**
- Endpoints bajo `/api/roles` con permisos `crear_roles`, `leer_roles`, `editar_roles`, `borrar_roles`.
- `POST /api/roles/{id}/permisos` — asignar permiso.
- `DELETE /api/roles/{id}/permisos/{permiso_id}` — quitar permiso.
- Soft delete en tabla `roles`.

**Criterios de aceptación:**
1. Matriz de permisos por rol visible y editable en frontend.
2. Cambios de permisos se reflejan en autorización de endpoints.
3. Rol «Cliente» existe para registro público.

---

### RF-04 — Gestión de permisos

| Campo | Contenido |
|-------|-----------|
| **ID** | RF-04 |
| **Nombre del Requisito** | Configuración del catálogo de permisos |
| **Tipo** | Funcional |
| **Prioridad** | Alta |
| **Actores** | Administrador |
| **Diagrama relacionado** | A |
| **Casos de uso IBM** | M9-U1 a M9-U4 |
| **RNF relacionados** | RNF-02 |

**Descripción:** El administrador mantiene el catálogo de permisos granulares del sistema (convención `crear_*`, `leer_*`, `editar_*`, `borrar_*`).

**Especificación:** CRUD en `/api/permisos` con permisos meta `crear_permisos`, `leer_permisos`, `editar_permisos`, `borrar_permisos`.

**Criterios de aceptación:**
1. Listado paginado de permisos activos.
2. Descripción del permiso usable como identificador (ej. `leer_clientes`).
3. Eliminación lógica sin borrado físico.

---

### RF-05 — Consulta de bitácora

| Campo | Contenido |
|-------|-----------|
| **ID** | RF-05 |
| **Nombre del Requisito** | Consulta de eventos de auditoría |
| **Tipo** | Funcional |
| **Prioridad** | Alta |
| **Actores** | Administrador |
| **Diagrama relacionado** | A |
| **RNF relacionados** | RNF-04 |

**Descripción:** El administrador consulta la bitácora de acciones críticas con filtros por módulo, acción, usuario y fechas.

**Especificación:**
- `GET /api/bitacora` con filtros y paginación.
- Permiso `leer_bitacora`.
- Campos: usuario_id, módulo, acción, resumen, detalle JSON, ip_origen, creado_en.

**Criterios de aceptación:**
1. Filtros por módulo (seguridad, pagos, abordaje, conciliacion, etc.).
2. Detalle de evento consultable.
3. Acceso sin permiso retorna HTTP 403.

---

### RF-06 — Gestión de destinos

| Campo | Contenido |
|-------|-----------|
| **ID** | RF-06 |
| **Nombre del Requisito** | Gestión del catálogo de destinos turísticos |
| **Tipo** | Funcional |
| **Prioridad** | Alta |
| **Actores** | Administrador, Visitante (consulta) |
| **Diagrama relacionado** | A, C |
| **Casos de uso IBM** | M1-U1 a M1-U4 |
| **RNF relacionados** | RNF-06, RNF-12 |

**Descripción:** CRUD de destinos con precio base, descripción y galería de imágenes; consulta pública en portal.

**Especificación:**
- `/api/destinos` — CRUD admin.
- `/api/catalogo/destinos` — consulta pública.
- Galería con upload de imágenes convertidas a WebP.
- Anulación lógica si hay viajes/reservas asociados (regla de negocio).

**Criterios de aceptación:**
1. Destino creado visible en catálogo admin y portal público.
2. Galería admite múltiples imágenes por destino.
3. Anulación bloqueada si existen dependencias activas.

---

### RF-07 — Gestión de flota y asientos

| Campo | Contenido |
|-------|-----------|
| **ID** | RF-07 |
| **Nombre del Requisito** | Administración de transporte y mapa de asientos |
| **Tipo** | Funcional |
| **Prioridad** | Alta |
| **Actores** | Administrador |
| **Diagrama relacionado** | A |
| **RNF relacionados** | RNF-06, RNF-08 |

**Descripción:** Registro de unidades de transporte y configuración del mapa topológico de asientos por unidad.

**Especificación:**
- `/api/unidades` — CRUD de unidades (placa, modelo, capacidad).
- `/api/asientos` — CRUD de asientos por unidad.
- Validación de placa única y capacidad coherente.

**Criterios de aceptación:**
1. Unidad registrada disponible para asignación a viajes.
2. Mapa de asientos configurable (filas, columnas, tipo).
3. Baja lógica de unidad no elimina historial de viajes.

---

### RF-08 — Gestión de puntos de recogida

| Campo | Contenido |
|-------|-----------|
| **ID** | RF-08 |
| **Nombre del Requisito** | Gestión de domicilios de recogida |
| **Tipo** | Funcional |
| **Prioridad** | Alta |
| **Actores** | Administrador, Cliente |
| **Diagrama relacionado** | A, C |
| **Casos de uso IBM** | M8-U1 a M8-U4 |
| **RNF relacionados** | RNF-06 |

**Descripción:** Registro y consulta de domicilios de recogida vinculados a clientes; admin consulta global; cliente gestiona los propios.

**Especificación:**
- Admin consulta: `GET /api/puntos-recogida` (permiso `leer_puntos_recogida`).
- Admin CRUD: `/api/clientes/{id}/puntos-recogida` (permiso `editar_clientes`).
- Cliente CRUD: `/api/clientes/mi-perfil/puntos-recogida`.
- Campos obligatorios: nombre, dirección, ciudad, estado, referencia.

**Criterios de aceptación:**
1. Domicilio vinculado correctamente en `clientes_puntos_recogida`.
2. Cliente puede marcar domicilio predeterminado.
3. Validación rechaza domicilios incompletos (HTTP 422).

---

### RF-09 — Planificación de viajes

| Campo | Contenido |
|-------|-----------|
| **ID** | RF-09 |
| **Nombre del Requisito** | Planificación logística de viajes |
| **Tipo** | Funcional |
| **Prioridad** | Alta |
| **Actores** | Administrador |
| **Diagrama relacionado** | A |
| **Casos de uso IBM** | M3-O1 a M3-O6 |
| **RNF relacionados** | RNF-06, RNF-08 |

**Descripción:** Creación y gestión de viajes programados con destino, fechas, unidad, guías, ruta de recogida, costos operativos y reporte.

**Especificación:**
- `/api/viajes` — CRUD de viajes.
- Asignación de guías, ruta de recogida, costos operativos.
- `GET /api/viajes/{id}/reporte` — reporte de viaje.
- Estados: planificado, en_curso, finalizado, cancelado.
- Anulación bloqueada si hay reservas activas.

**Criterios de aceptación:**
1. Viaje creado en estado borrador/planificado.
2. Ruta de recogida con paradas ordenadas y horarios.
3. Costos operativos calculan total y precio de venta.
4. Reporte de viaje exportable/imprimible.

---

### RF-10 — Dashboard administrativo

| Campo | Contenido |
|-------|-----------|
| **ID** | RF-10 |
| **Nombre del Requisito** | Panel de control administrativo |
| **Tipo** | Funcional |
| **Prioridad** | Media |
| **Actores** | Administrador |
| **Diagrama relacionado** | A |
| **RNF relacionados** | RNF-10 |

**Descripción:** Vista resumen con estadísticas generales y alertas operativas (reservas pendientes, etc.).

**Especificación:**
- `GET /api/catalogo/estadisticas`.
- Frontend: `/admin/dashboard`.

**Criterios de aceptación:**
1. Dashboard carga indicadores sin error para usuario autenticado.
2. Reservas pendientes de confirmación visibles.

---

### RF-11 — Gestión de clientes

| Campo | Contenido |
|-------|-----------|
| **ID** | RF-11 |
| **Nombre del Requisito** | Registro y gestión de clientes |
| **Tipo** | Funcional |
| **Prioridad** | Alta |
| **Actores** | Administrador |
| **Diagrama relacionado** | B |
| **Casos de uso IBM** | M7-U1 a M7-U4 |
| **RNF relacionados** | RNF-05, RNF-06 |

**Descripción:** CRUD de clientes con documento, contacto, ubicación y domicilios de recogida.

**Especificación:**
- `/api/clientes` — CRUD con permisos `crear_clientes`, `leer_clientes`, `editar_clientes`, `borrar_clientes`.
- Búsqueda por nombre, documento, teléfono.
- `GET /api/clientes/buscar-por-documento`.

**Criterios de aceptación:**
1. Cliente creado con tipo y número de documento únicos.
2. Desactivación lógica (soft delete).
3. Integración con puntos de recogida (RF-08).

---

### RF-12 — Gestión de cotizaciones

| Campo | Contenido |
|-------|-----------|
| **ID** | RF-12 |
| **Nombre del Requisito** | Generación y gestión de cotizaciones comerciales |
| **Tipo** | Funcional |
| **Prioridad** | Alta |
| **Actores** | Administrador / ATC |
| **Diagrama relacionado** | B |
| **Casos de uso IBM** | M5-U1 a M5-U5 |
| **RNF relacionados** | RNF-06 |

**Descripción:** Creación de cotizaciones con líneas de desglose, modificación, cancelación y conversión a reserva.

**Especificación:**
- `/api/cotizaciones` — CRUD.
- Líneas de desglose: `/api/cotizaciones/{id}/lineas`.
- Estados: solicitada, pendiente, aceptada, rechazada, cancelada.
- Validación de precios, vigencia y reglas de negocio.

**Criterios de aceptación:**
1. Cotización con desglose financiero calculado.
2. Modificación recalcula totales en tiempo real.
3. Cancelación lógica si no tiene reservas activas.

---

### RF-13 — Gestión de reservas y asientos

| Campo | Contenido |
|-------|-----------|
| **ID** | RF-13 |
| **Nombre del Requisito** | Gestión de reservas y asignación de asientos |
| **Tipo** | Funcional |
| **Prioridad** | Alta |
| **Actores** | Administrador, Cliente |
| **Diagrama relacionado** | B, C |
| **Casos de uso IBM** | M1-U5 a M1-U10 |
| **RNF relacionados** | RNF-08, RNF-15 |

**Descripción:** Creación de reservas con pasajeros, validación de cupos, mapa interactivo de asientos y gestión de estados.

**Especificación:**
- `/api/reservas` — CRUD admin.
- `/api/reservas/cliente` — reserva desde portal.
- Mapa de asientos: `/api/viajes/{id}/asientos-disponibles`.
- Portal: `/api/reservas/portal/mis-reservas`.
- Estados: pendiente, confirmada, abonada, cancelada.
- Bloqueo transaccional de asientos (sin sobreventa).

**Criterios de aceptación:**
1. Asiento ocupado no puede asignarse a dos pasajeros (HTTP 409).
2. Reserva refleja cupo debitado del viaje.
3. Cliente consulta sus reservas en portal.
4. Anulación libera asientos.

---

### RF-14 — Registro de reportes de pago

| Campo | Contenido |
|-------|-----------|
| **ID** | RF-14 |
| **Nombre del Requisito** | Registro de reportes de pago |
| **Tipo** | Funcional |
| **Prioridad** | Alta |
| **Actores** | Administrador, Cliente |
| **Diagrama relacionado** | B, C |
| **Casos de uso IBM** | M2-U1, M2-U5 |
| **RNF relacionados** | RNF-04, RNF-06, RNF-08 |

**Descripción:** Registro de pagos fraccionados o totales con método, tasa, referencia y comprobante; estado inicial `en_validacion`.

**Especificación:**
- Admin: `POST /api/reservas/{id}/pagos`.
- Cliente: `POST /api/reservas/{id}/pagos/portal/reportar`.
- Upload comprobante: `/api/pagos/portal/comprobante/upload`.
- Cálculo de equivalencia según tasa del día.
- Validación de monto ≤ saldo pendiente.

**Criterios de aceptación:**
1. Pago registrado en estado `en_validacion` (excepto efectivo admin).
2. Comprobante adjunto accesible para conciliación.
3. Resumen de saldo actualizado tras aprobación.

---

### RF-15 — Conciliación de pagos

| Campo | Contenido |
|-------|-----------|
| **ID** | RF-15 |
| **Nombre del Requisito** | Procesamiento de conciliación de pagos |
| **Tipo** | Funcional |
| **Prioridad** | Alta |
| **Actores** | Administrador |
| **Diagrama relacionado** | B |
| **Casos de uso IBM** | M2-U2, M2-U3, M2-U4 |
| **RNF relacionados** | RNF-04, RNF-08 |

**Descripción:** Revisión de pagos pendientes, aprobación o rechazo bancario, actualización de saldo de reserva.

**Especificación:**
- Bandeja: `GET /api/pagos?estado=en_validacion`.
- `POST /api/reservas/{id}/pagos/{pid}/aprobar`.
- `POST /api/reservas/{id}/pagos/{pid}/rechazar`.
- Modificar/anular reportes antes o después de conciliación según reglas.

**Criterios de aceptación:**
1. Aprobación cambia estado a `aprobado` y reduce saldo.
2. Rechazo cambia estado a `rechazado` sin afectar saldo aprobado.
3. Reserva pasa a pagada si saldo llega a cero.
4. Acciones registradas en bitácora.

---

### RF-16 — Configuración de catálogo financiero

| Campo | Contenido |
|-------|-----------|
| **ID** | RF-16 |
| **Nombre del Requisito** | Configuración del catálogo de pagos |
| **Tipo** | Funcional |
| **Prioridad** | Alta |
| **Actores** | Administrador |
| **Diagrama relacionado** | B |
| **RNF relacionados** | RNF-06 |

**Descripción:** Mantenimiento de monedas, tasas de cambio, métodos de pago, bancos y puntos de venta.

**Especificación:**
- `/api/monedas`, `/api/tasas`, `/api/metodos-pago`, `/api/bancos`, `/api/puntos-venta`.
- Tasa del día obligatoria para pagos en VES/EUR.
- Frontend: módulo Pagos → subsecciones de catálogo.

**Criterios de aceptación:**
1. Sin tasa del día, registro de pago en divisas retorna error.
2. Métodos de pago activos visibles en formulario de pago.
3. CRUD operativo para cada catálogo.

---

### RF-17 — Control de abordaje

| Campo | Contenido |
|-------|-----------|
| **ID** | RF-17 |
| **Nombre del Requisito** | Control de abordaje y manifiesto de viaje |
| **Tipo** | Funcional |
| **Prioridad** | Alta |
| **Actores** | Administrador, Guía |
| **Diagrama relacionado** | B |
| **Casos de uso IBM** | M4-U1 a M4-U4 |
| **RNF relacionados** | RNF-04, RNF-14 |

**Descripción:** Consulta de manifiesto, registro de abordaje (abordado / no presentado), corrección y anulación.

**Especificación:**
- `/api/abordajes/viajes` — selector de viajes.
- `/api/abordajes/viajes/{id}/manifiesto` — manifiesto completo.
- `PUT .../pasajeros/{id}` — registrar abordaje individual.
- `POST .../registrar-lote` — abordaje en lote.
- Permisos: `crear_abordaje`, `leer_abordaje`, `editar_abordaje`, `borrar_abordaje`.

**Criterios de aceptación:**
1. Manifiesto lista pasajeros con estado pendiente/abordado/no_presentado.
2. Resumen de totales actualizado en tiempo real.
3. Anulación de abordaje devuelve pasajero a pendiente.
4. Eventos en bitácora (módulo abordaje).

---

### RF-18 — Moderación de reseñas

| Campo | Contenido |
|-------|-----------|
| **ID** | RF-18 |
| **Nombre del Requisito** | Publicación y moderación de reseñas |
| **Tipo** | Funcional |
| **Prioridad** | Media |
| **Actores** | Cliente, Administrador |
| **Diagrama relacionado** | B, C |
| **RNF relacionados** | RNF-06 |

**Descripción:** Cliente publica reseña de viaje elegible; administrador consulta, modera visibilidad o elimina.

**Especificación:**
- Cliente: `POST /api/resenas`, reservas elegibles en portal.
- Admin: `GET /api/resenas`, `DELETE /api/resenas/{id}`.
- Público: `GET /api/resenas/publicas`.

**Criterios de aceptación:**
1. Solo reservas completadas/elegibles permiten reseña.
2. Calificación 1–5 con comentario opcional.
3. Admin puede eliminar reseñas inapropiadas.

---

### RF-19 — Portal público

| Campo | Contenido |
|-------|-----------|
| **ID** | RF-19 |
| **Nombre del Requisito** | Portal público de consulta |
| **Tipo** | Funcional |
| **Prioridad** | Alta |
| **Actores** | Visitante |
| **Diagrama relacionado** | C |
| **Casos de uso IBM** | M1-U2 Consultar destinos |
| **RNF relacionados** | RNF-14, RNF-16 |

**Descripción:** Acceso sin autenticación a landing, catálogo de destinos, detalle y agenda de viajes.

**Especificación:**
- Rutas: `/`, `/destino/:id`, `/agenda`.
- API catálogo público: `/api/catalogo/destinos`, `/api/catalogo/viajes`.
- Reseñas públicas visibles en destinos.

**Criterios de aceptación:**
1. Visitante consulta destinos sin login.
2. Agenda muestra viajes publicados/planificados.
3. Enlaces a registro e inicio de sesión disponibles.

---

### RF-20 — Portal cliente

| Campo | Contenido |
|-------|-----------|
| **ID** | RF-20 |
| **Nombre del Requisito** | Portal de autoservicio del cliente |
| **Tipo** | Funcional |
| **Prioridad** | Alta |
| **Actores** | Cliente |
| **Diagrama relacionado** | C |
| **Casos de uso IBM** | M1-U6, M1-U7 |
| **RNF relacionados** | RNF-01, RNF-14, RNF-15 |

**Descripción:** Autoservicio autenticado: mis viajes, abonar reserva, reportar pagos, puntos de recogida, solicitudes y reseñas.

**Especificación:**
- Rutas: `/client/dashboard`, `/client/registrar-pago`, `/client/puntos-recogida`, `/client/resenas`, `/client/solicitudes`.
- APIs portal en reservas, pagos, clientes, reseñas.
- Rol «Cliente» requerido; redirección desde panel admin.

**Criterios de aceptación:**
1. Cliente autenticado ve solo sus reservas y pagos.
2. Flujo de abono/reserva completable desde portal.
3. Reporte de pago genera registro `en_validacion`.
4. Gestión de domicilios de recogida propios.

---

## 4. Trazabilidad RF ↔ Diagramas ↔ IBM

| RF | Diagrama | Casos de uso IBM |
|----|----------|------------------|
| RF-01 | A, B, C | Transversal |
| RF-02 | A | M6-U1 a U4 |
| RF-03 | A | M6-U5 a U8 |
| RF-04 | A | M9-U1 a U4 |
| RF-05 | A | — |
| RF-06 | A, C | M1-U1 a U4 |
| RF-07 | A | — |
| RF-08 | A, C | M8-U1 a U4 |
| RF-09 | A | M3-O1 a O6 |
| RF-10 | A | — |
| RF-11 | B | M7-U1 a U4 |
| RF-12 | B | M5-U1 a U5 |
| RF-13 | B, C | M1-U5 a U10 |
| RF-14 | B, C | M2-U1, M2-U5 |
| RF-15 | B | M2-U2 a U4 |
| RF-16 | B | — |
| RF-17 | B | M4-U1 a U4 |
| RF-18 | B, C | — |
| RF-19 | C | M1-U2 |
| RF-20 | C | M1-U6, M1-U7 |

---

## 5. Trazabilidad RF ↔ RNF

| RF | RNF complementarios |
|----|---------------------|
| RF-01 | RNF-01, RNF-02, RNF-07 |
| RF-02 | RNF-02, RNF-05, RNF-06 |
| RF-03, RF-04 | RNF-02 |
| RF-05 | RNF-04 |
| RF-06 | RNF-06, RNF-12 |
| RF-07 | RNF-06, RNF-08 |
| RF-08 | RNF-06 |
| RF-09 | RNF-06, RNF-08 |
| RF-10 | RNF-10 |
| RF-11 | RNF-05, RNF-06 |
| RF-12 | RNF-06 |
| RF-13 | RNF-08, RNF-15 |
| RF-14 | RNF-04, RNF-08 |
| RF-15 | RNF-04, RNF-08 |
| RF-16 | RNF-06 |
| RF-17 | RNF-04, RNF-14 |
| RF-18 | RNF-06 |
| RF-19 | RNF-14, RNF-16 |
| RF-20 | RNF-01, RNF-15 |

---

*Documento generado conforme a la Guía Estándar SRS — UPTAEB, PNF Informática, Trayecto III.*
