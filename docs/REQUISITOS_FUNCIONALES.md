### RF-01 — Autenticación e identidad

| Campo | Contenido |
|-------|-----------|
| **ID** | RF-01 |
| **Nombre del Requisito** | Autenticación e identidad |
| **Tipo** | Funcional |
| **Prioridad** | Alta |
| **Actores** | Visitante, Cliente, Administrador, Guía |
| **Diagrama relacionado** | A, B, C |
| **RNF relacionados** | RNF-01, RNF-02, RNF-07 |

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

**Necesidad:** Controlar las cuentas del personal de la agencia sin gestionar accesos de forma informal.

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

**Necesidad:** Separar perfiles de administrador, guía y cliente.

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

**Necesidad:** Autorizar acciones por módulo y no solo por cargo genérico.

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

**Necesidad:** Saber quién modificó qué registro y cuándo.

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
- `/api/destinos` — CRUD administrativo.
- `/api/catalogo/destinos` — consulta pública.
- Galería con carga de imágenes convertidas a WebP.
- Anulación lógica si hay viajes o reservas asociados.

**Criterios de aceptación:**
1. Destino creado visible en catálogo admin y portal público.
2. Galería admite múltiples imágenes por destino.
3. Anulación bloqueada si existen dependencias activas.

**Necesidad:** Publicar la oferta turística de Travel BQTO de forma centralizada.

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

**Necesidad:** Asignar transporte y asientos sin sobreventa.

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

**Descripción:** Registro y consulta de domicilios de recogida vinculados a clientes; el administrador consulta de forma global y el cliente gestiona los propios.

**Especificación:**
- Admin consulta: `GET /api/puntos-recogida` (permiso `leer_puntos_recogida`).
- Admin CRUD: `/api/clientes/{id}/puntos-recogida` (permiso `editar_clientes`).
- Cliente CRUD: `/api/clientes/mi-perfil/puntos-recogida`.
- Campos obligatorios: nombre, dirección, ciudad, estado, referencia.

**Criterios de aceptación:**
1. Domicilio vinculado correctamente en `clientes_puntos_recogida`.
2. Cliente puede marcar domicilio predeterminado.
3. Validación rechaza domicilios incompletos (HTTP 422).

**Necesidad:** Coordinar paradas de recogida por cliente y por viaje.

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
- Asignación de guías, ruta de recogida y costos operativos.
- `GET /api/viajes/{id}/reporte` — reporte de viaje.
- Estados: planificado, en_curso, finalizado, cancelado.
- Anulación bloqueada si hay reservas activas.

**Criterios de aceptación:**
1. Viaje creado en estado borrador o planificado.
2. Ruta de recogida con paradas ordenadas y horarios.
3. Costos operativos calculan total y precio de venta.
4. Reporte de viaje exportable o imprimible.

**Necesidad:** Programar la operación logística de cada salida.

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

**Descripción:** Vista resumen con estadísticas generales y alertas operativas (reservas pendientes, entre otras).

**Especificación:**
- `GET /api/catalogo/estadisticas`.
- Frontend: `/admin/dashboard`.

**Criterios de aceptación:**
1. Dashboard carga indicadores sin error para usuario autenticado.
2. Reservas pendientes de confirmación visibles.

**Necesidad:** Dar a gerencia una vista rápida del estado operativo.

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

**Descripción:** CRUD de clientes con documento, contacto, ubicación y domicilios de recogida. El cliente es la entidad maestra del negocio: no existe reserva sin persona registrada.

**Especificación:**
- `/api/clientes` — CRUD con permisos `crear_clientes`, `leer_clientes`, `editar_clientes`, `borrar_clientes`.
- Catálogo auxiliar de estados y ciudades: `/api/ubicaciones`.
- Búsqueda por nombre, documento y teléfono.
- `GET /api/clientes/buscar-por-documento`.
- Cada pasajero de una reserva es un registro en `clientes`; `reserva_clientes` solo enlaza reserva y cliente.

**Criterios de aceptación:**
1. Cliente creado con tipo y número de documento únicos.
2. Desactivación lógica (soft delete).
3. Integración con puntos de recogida (RF-08).
4. Un acompañante no registrado se crea primero como cliente y luego se vincula a la reserva.

**Necesidad:** Mantener el maestro de personas que viajan con la agencia.

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
2. Modificación recalcula totales.
3. Cancelación lógica si no tiene reservas activas.

**Necesidad:** Formalizar ofertas comerciales antes de la reserva.

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
- `/api/reservas` — CRUD administrativo.
- `/api/reservas/cliente` — reserva desde portal.
- Mapa de asientos: `/api/viajes/{id}/asientos-disponibles`.
- Portal: `/api/reservas/portal/mis-reservas`.
- Estados: pendiente, confirmada, abonada, cancelada.
- Bloqueo transaccional de asientos (sin sobreventa).
- Tabla `reserva_clientes`: no duplica nombre, apellido ni documento; atributos del vínculo: titular, menor, asiento, tarifa, recargo, recogida.

**Criterios de aceptación:**
1. Asiento ocupado no puede asignarse a dos pasajeros (HTTP 409).
2. Reserva refleja cupo debitado del viaje.
3. Cliente consulta sus reservas en portal.
4. Anulación libera asientos.
5. Dos reservas simultáneas sobre el último cupo: una confirma y la otra recibe 409.

**Necesidad:** Evitar sobreventa y registrar viajeros de forma estructurada.

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
- Carga de comprobante: `/api/pagos/portal/comprobante/upload`.
- Cálculo de equivalencia según tasa del día.
- Validación de monto menor o igual al saldo pendiente.

**Criterios de aceptación:**
1. Pago registrado en estado `en_validacion` (excepto efectivo administrativo).
2. Comprobante adjunto accesible para conciliación.
3. Resumen de saldo actualizado tras aprobación.

**Necesidad:** Recibir abonos con soporte verificable.

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

**Descripción:** Revisión de pagos pendientes, aprobación o rechazo bancario y actualización de saldo de reserva.

**Especificación:**
- Bandeja: `GET /api/pagos?estado=en_validacion`.
- `POST /api/reservas/{id}/pagos/{pid}/aprobar`.
- `POST /api/reservas/{id}/pagos/{pid}/rechazar`.
- Modificar o anular reportes según reglas de conciliación.

**Criterios de aceptación:**
1. Aprobación cambia estado a `aprobado` y reduce saldo.
2. Rechazo cambia estado a `rechazado` sin afectar saldo aprobado.
3. Reserva pasa a pagada si el saldo llega a cero.
4. Acciones registradas en bitácora.

**Necesidad:** Validar ingresos antes de considerar la reserva cobrada.

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
- Tasa del día obligatoria para pagos en VES o EUR; sincronización BCV al arranque y consulta o actualización en `/api/tasas`.
- Frontend: módulo Pagos, subsecciones de catálogo.

**Criterios de aceptación:**
1. Sin tasa del día, el registro de pago en divisas retorna error.
2. Métodos de pago activos visibles en el formulario de pago.
3. CRUD operativo para cada catálogo.

**Necesidad:** Convertir y registrar cobros en las monedas que usa la agencia.

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
- Registro de abordaje individual y en lote.
- Permisos: `crear_abordaje`, `leer_abordaje`, `editar_abordaje`, `borrar_abordaje`.

**Criterios de aceptación:**
1. Manifiesto lista pasajeros con estado pendiente, abordado o no_presentado.
2. Resumen de totales actualizado.
3. Anulación de abordaje devuelve pasajero a pendiente.
4. Eventos en bitácora (módulo abordaje).

**Necesidad:** Controlar quién sube a la unidad el día del viaje.

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

**Descripción:** El cliente publica reseña de viaje elegible; el administrador consulta, modera visibilidad o elimina.

**Especificación:**
- Cliente: `POST /api/resenas`, reservas elegibles en portal.
- Admin: `GET /api/resenas`, `DELETE /api/resenas/{id}`.
- Público: `GET /api/resenas/publicas`.

**Criterios de aceptación:**
1. Solo reservas completadas o elegibles permiten reseña.
2. Calificación 1–5 con comentario opcional.
3. El administrador puede eliminar reseñas inapropiadas.

**Necesidad:** Recoger opinión de viajeros con control de publicación.

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
- API de catálogo público: `/api/catalogo/destinos`, `/api/catalogo/viajes`.
- Reseñas públicas visibles en destinos.

**Criterios de aceptación:**
1. El visitante consulta destinos sin inicio de sesión.
2. La agenda muestra viajes publicados o planificados.
3. Enlaces a registro e inicio de sesión disponibles.

**Necesidad:** Mostrar la oferta 24/7 sin depender de WhatsApp.

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
- APIs de portal en reservas, pagos, clientes y reseñas.
- Rol «Cliente» requerido.

**Criterios de aceptación:**
1. El cliente autenticado ve solo sus reservas y pagos.
2. Flujo de abono o reserva completable desde el portal.
3. El reporte de pago genera registro `en_validacion`.
4. Gestión de domicilios de recogida propios.

**Necesidad:** Que el cliente gestione su viaje sin intermediación constante.

---

### RF-21 — Reportes estadísticos

| Campo | Contenido |
|-------|-----------|
| **ID** | RF-21 |
| **Nombre del Requisito** | Reportes estadísticos parametrizados por fechas |
| **Tipo** | Funcional |
| **Prioridad** | Alta |
| **Actores** | Administrador |
| **Diagrama relacionado** | A, B |
| **RNF relacionados** | RNF-06, RNF-10 |

**Descripción:** El administrador consulta, en un solo apartado, indicadores de negocio filtrados por un rango de fechas reales: clientes registrados en el periodo, destinos más concurridos (reservas y cotizaciones), mes con más movimiento, reservas de un día e ingresos cobrados (pagos aprobados convertidos a euros). El sistema rechaza fechas imposibles. No se reporta por género ni edad porque el maestro de clientes no almacena esos datos.

**Especificación:**
- `GET /api/reportes/estadisticos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD`
- Frontend: `/admin/reportes`
- Validación: `desde` menor o igual a `hasta`; año entre 2000 y el año actual + 1; rango máximo 10 años.
- Métricas: clientes nuevos, reservas (activas/canceladas), pasajeros (adultos/menores), destinos más reservados, destinos más cotizados, movimiento mensual, reservas por día, ingresos de pagos en estado `aprobado`.
- Permiso: `leer_reservas` o `leer_reportes_pago` o `leer_clientes`.

**Criterios de aceptación:**
1. Consultar el año en curso muestra totales coherentes con reservas, clientes y pagos del rango.
2. Un rango de un solo día lista las reservas de esa fecha.
3. Una fecha con año imposible retorna HTTP 400.
4. La pantalla indica que no hay corte por género ni edad.
5. El reporte es imprimible.

**Necesidad:** Apoyar decisiones de la agencia con cifras reales del periodo consultado.
