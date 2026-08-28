# Plan de trabajo para corregir y replicar los diagramas de SIGEL

**Objetivo:** producir diagramas UML que coincidan con el sistema implementado, con los requisitos corregidos y con las observaciones de la revisión académica.

**Fuentes de contraste:** tres páginas escaneadas con anotaciones, tres grabaciones de la defensa, SRS actualizado, frontend React, controladores FastAPI, modelos SQLAlchemy y migraciones de la base de datos.

## 0. Contraste: lo que rayó la profesora vs lo que dijeron los audios

Las tres hojas son **dos tipos UML**, no tres. Lo hablado y lo rayado coinciden; el papel es la versión visual del dictamen.

| Hoja | Qué es | Qué creían / qué es | Marca de la profesora | Audio (mismo pedido) | Regla del patrón |
|---|---|---|---|---|---|
| 1 | Secuencia: crear usuario | Secuencia | Tachó `Frontend` y `API /api/usuarios` como capas. Encerró Controlador, Modelo y MySQL y escribió **obj**. Escribió **Return**. Junto a MySQL: **BD sí**. | Faltan objetos, líneas de vida, activación, BD, mensajes de error y de éxito. | Participantes como `nombre : Clase` (boundary/control/entity/database). Toda llamada tiene retorno hasta el actor. |
| 2 | Actividad con **carriles** | Carriles | Solo hay carriles Administrador / Sistema. Escribió **faltan pasos**, **faltan objetos**, **click**, **BD**. Encerró el rombo y el `UPDATE`. | Decisiones con rombo; validación en el sistema; errores y confirmación visibles. | Carriles = objetos reales. Actividades en lenguaje natural (no SQL). Rombo = pregunta. Objetos de datos (`reserva : Reserva`). El error no se mezcla con el éxito. |
| 3 | Secuencia de consulta de cotizaciones | «La que no se sabía cuál era» | Cajas Controller / Service / Repository. Escribió **No usan la nomenclatura de UML** y **Falta Bitácora**. Encerró la BD. | Nomenclatura UML; bitácora con acción y módulo. | No dibujar una arquitectura inventada. SIGEL no tiene Service/Repository: interfaz, controlador, modelo, MySQL, bitácora. En escrituras sí se registra bitácora (quién, módulo, acción, tabla, id). |

Conclusión: se corrige **un** proceso completo (secuencia + carriles del mismo caso) y ese par se replica. El proceso patrón es **CU-02 Registrar reserva desde el portal**, porque concentra clientes-viajeros, 3FN, cupo/asiento, retornos, rombos y bitácora.

## 1. Diagnóstico de las tres páginas escaneadas

### Página 1 - Secuencia: crear usuario

Problemas observados:

- No usa de manera consistente la nomenclatura UML de objetos/instancias.
- Los participantes `Frontend`, `API /api/usuarios`, `Controlador`, `Modelo` y `MySQL` aparecen como nombres de capas o tecnologías, no como objetos concretos con responsabilidad identificable.
- Faltan objetos de interfaz y sus líneas de vida/activación.
- Faltan mensajes y respuestas entre varios participantes.
- No están representados los caminos alternos: token ausente o inválido, permiso insuficiente, datos inválidos, correo duplicado y error de persistencia.
- La respuesta exitosa debe volver hasta la interfaz y el actor; no basta con indicar `200 Usuario creado` entre componentes internos.
- Debe coincidir con el código real: endpoint, autorización, validaciones, modelo utilizado, persistencia y bitácora.

### Página 2 - Actividad con carriles: modificar punto de recogida

Problemas observados:

- El texto inicial dice `Seleccionar domicilio del cliente`, pero el proceso y la persistencia hablan de `puntos_recogida`; el vocabulario debe ser uniforme.
- Los carriles `Administrador` y `Sistema` son demasiado generales para demostrar qué componente es responsable de cada acción.
- Faltan la interfaz, el controlador/API, el modelo y la base de datos como responsables diferenciados.
- Faltan pasos: abrir la interfaz, consultar el punto existente, devolver sus datos, editarlos, enviar la solicitud, validar, persistir y devolver el resultado.
- La decisión de validez pertenece al sistema, no al administrador.
- Toda decisión debe usar rombo y formularse como pregunta con salidas claramente rotuladas, por ejemplo `¿Permiso y datos válidos?`.
- Las actividades deben escribirse en lenguaje natural. Debe decir `Actualizar el punto de recogida`, no `UPDATE puntos_recogida`.
- Los mensajes de error y de confirmación deben llegar a la interfaz y ser visibles para el actor.

### Página 3 - Secuencia: consultar cotizaciones

Problemas observados:

- La arquitectura dibujada (`Controller`, `Service`, `Repository`) no coincide con el código actual de SIGEL, que usa interfaz React, servicio HTTP del frontend, controlador FastAPI y modelo SQLAlchemy.
- La base de datos aparece duplicada o desconectada del flujo principal.
- Faltan respuestas de retorno y el resultado visible para el administrador.
- Faltan validación de sesión/permiso, filtros, paginación y caminos alternos.
- La notación de mensajes, activaciones y retornos debe ser consistente en todo el diagrama.

## 2. Reglas obligatorias para todos los diagramas

### Diagramas de secuencia

1. El actor representa a la persona o sistema externo.
2. Cada participante se nombra como instancia con responsabilidad concreta, por ejemplo:
   - `vistaReservas:InterfazReserva`
   - `servicioReservas:ReservasService` del frontend
   - `reservasControlador:ReservasControlador`
   - `reservasModelo:ReservasModelo`
   - `db:MySQL`
   - `bitacora:BitacoraModelo`
3. Se muestran las líneas de vida y las activaciones.
4. Las solicitudes usan flecha continua y las respuestas flecha discontinua.
5. Todo mensaje indica qué se solicita o devuelve; se evitan textos vagos como `procesar` o `validar` sin objeto.
6. Los caminos alternos se expresan con `alt`, `else`, `opt` o `loop` cuando corresponda.
7. La respuesta debe regresar hasta la interfaz y el actor.
8. Los endpoints, estados HTTP y participantes deben existir en el código. No se inventan servicios o repositorios.
9. Las operaciones persistentes relevantes incluyen el registro de bitácora con usuario, módulo, acción, tabla/registro y detalle.

### Diagramas de actividad con carriles

1. Los carriles mínimos serán Actor, Interfaz React, API/Controlador, Modelo/Reglas de negocio, MySQL y Bitácora cuando aplique.
2. Cada actividad se coloca en el carril de quien realmente la ejecuta.
3. Las decisiones internas, permisos y validaciones van en el sistema, no en el carril del actor.
4. Las decisiones usan rombos con preguntas y salidas `sí`/`no` o etiquetas equivalentes.
5. Las actividades se escriben en lenguaje natural, sin SQL ni nombres de métodos como sustituto del comportamiento.
6. Cada camino termina correctamente o regresa al paso que corresponde; no se unen error y éxito como si fueran el mismo resultado.
7. La interfaz muestra explícitamente los errores o la confirmación.

## 3. Caso patrón que se construirá primero

### CU patrón: Registrar reserva con viajeros y asientos

Se eligió este proceso porque concentra las correcciones más importantes de la defensa:

- titular y acompañantes registrados como clientes;
- relación normalizada mediante `reserva_clientes`;
- puntos de recogida por viajero;
- validación de viaje, cupo y asiento;
- prevención de asiento duplicado por viaje;
- varios mensajes entre interfaz, API, modelo y base de datos;
- caminos de error reales;
- confirmación y bitácora.

El patrón debe reflejar dos variantes reales y no mezclarlas:

- **Portal del cliente:** `POST /api/reservas/cliente`, que puede crear la reserva, los clientes acompañantes, las relaciones y los asientos en una sola operación.
- **Administración:** `POST /api/reservas`, seguido de `POST /api/reservas/{id}/pasajeros` y `POST /api/reservas/{id}/pasajeros/{pasajero_id}/asientos` por cada viajero.

Para el primer patrón se usará **Portal del cliente**, porque representa una transacción completa y resulta más fácil de replicar. La variante administrativa tendrá un diagrama separado debido a que usa varios endpoints y un bucle.

### Criterios de aceptación del patrón

- El flujo coincide línea por línea con el frontend, controlador y modelo actuales.
- Aparecen actor, interfaz, servicio HTTP, controlador, modelo, MySQL y bitácora.
- Incluye los caminos: sesión inválida, perfil inexistente, viaje no disponible, reserva duplicada, punto de recogida ausente, cupo insuficiente, asiento ocupado y éxito.
- Distingue `reservas`, `clientes`, `reserva_clientes` y `asientos_reservados` sin repetir datos personales en la tabla puente.
- La confirmación devuelve el identificador de la reserva y se muestra al cliente.
- El diagrama de secuencia y el de carriles cuentan exactamente el mismo proceso con dos vistas UML distintas.

## 4. Orden de producción

### Fase A - Cerrar la verdad del sistema

1. Congelar la lista de requisitos funcionales que sí corresponden al negocio y al código.
2. Resolver la regla de negocio de viajeros/clientes y comprobar la tercera forma normal.
3. Corregir la compilación del frontend antes de considerar definitiva la trazabilidad.
4. Confirmar endpoints, permisos, respuestas, estados de error y eventos de bitácora de cada proceso.

### Fase B - Construir y validar los dos patrones

1. Crear la ficha textual de `Registrar reserva desde el portal`: actor, precondiciones, flujo principal, alternos, postcondiciones y evidencia de código.
2. Construir el diagrama de secuencia patrón.
3. Compararlo contra la ficha y el código.
4. Construir el diagrama de actividad con carriles del mismo proceso.
5. Verificar que ambos diagramas cuenten el mismo comportamiento.
6. Renderizar en PDF y revisar legibilidad, notación y consistencia.

### Fase C - Replicar por familias de procesos

**Prioridad 1 - Procesos transaccionales centrales**

- Crear/modificar cotización y líneas.
- Crear/modificar reserva administrativa.
- Registrar pago desde el portal.
- Aprobar o rechazar pago.
- Registrar abordaje individual y por lote.

**Prioridad 2 - Maestros que afectan el negocio**

- Gestionar clientes y puntos de recogida.
- Gestionar destinos e imágenes.
- Planificar viajes, guías, costos y ruta de recogida.
- Gestionar unidades y asientos.

**Prioridad 3 - Seguridad, consulta y cierre**

- Crear/modificar usuario, rol y permisos.
- Consultar bitácora.
- Consultar reportes estadísticos por rango.
- Emitir reporte operativo del viaje.
- Crear y moderar reseñas.

No se debe hacer un diagrama por cada endpoint CRUD si el flujo es idéntico. Se construye un diagrama por proceso de negocio significativo y se agrupan variantes repetitivas cuando no aporten decisiones nuevas.

## 5. Plantilla de réplica

Antes de dibujar cada proceso se completa esta ficha:

| Campo | Contenido obligatorio |
|---|---|
| Nombre | Verbo + objeto de negocio |
| Actor principal | Rol que inicia el flujo |
| Precondición | Sesión, permiso y estado previo |
| Interfaz | Pantalla/modal/componente real |
| Endpoint(s) | Método y ruta reales |
| Controlador | Función o controlador real |
| Modelo/servicio | Funciones reales de negocio/persistencia |
| Tablas | Tablas consultadas o modificadas |
| Flujo principal | Pasos numerados de inicio a confirmación |
| Alternos | 400/401/403/404/409/422 según el código |
| Bitácora | Módulo, acción, tabla y registro |
| Resultado | Mensaje/datos visibles para el actor |
| Evidencia | Archivos y líneas del código revisado |

## 6. Control de calidad antes de aprobar cada diagrama

- ¿Coincide con un requisito funcional aprobado?
- ¿Coincide con el comportamiento del código actual?
- ¿Todos los participantes/carriles tienen una responsabilidad real?
- ¿Falta alguna interfaz, objeto, consulta, respuesta o paso?
- ¿Las decisiones están en el responsable correcto?
- ¿Los errores regresan a la interfaz?
- ¿La persistencia representa el modelo normalizado?
- ¿La bitácora registra quién, qué acción, módulo y registro?
- ¿El diagrama puede leerse impreso sin texto cortado o flechas cruzadas?
- ¿Otro integrante puede replicar la plantilla sin inventar arquitectura?

## 7. Definición de terminado

Un diagrama queda terminado únicamente cuando tiene ficha textual, fuente PlantUML, PDF renderizado, revisión visual, trazabilidad con requisito/código y aprobación mediante la lista de control anterior.
