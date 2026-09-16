# Arquitectura y modelo de datos

## Arquitectura implementada

```text
React + TypeScript + Vite
    │ HTTPS/JSON
    ▼
FastAPI (`backend/main.py`) ─── routers por dominio
    │                               │
    │ SQLAlchemy                    ├─ autenticación / permisos
    ▼                               ├─ catálogo, clientes, viajes
MySQL `travel_bqto_seguridad`      ├─ cotizaciones, reservas, pagos
  usuarios, roles, permisos,       ├─ abordaje, reseñas
  roles_permisos, bitácora         └─ reportes estadísticos
MySQL `travel_bqto`
  catálogo, operación, comercial
```

El frontend contiene rutas públicas, rutas protegidas de administración y rutas protegidas de cliente. La API concentra excepciones de integridad (409), errores de base de datos (503) y errores generales (500), además de CORS para desarrollo local.

## Componentes lógicos

| Capa | Responsabilidad | Evidencia |
|---|---|---|
| Presentación | Vistas React, formularios, rutas y servicios HTTP. | `frontend/src/pages`, `services`, `App.tsx` |
| API/control | Endpoints, autorización, reglas de entrada y respuestas. | `backend/controladores` |
| Dominio/persistencia | Entidades SQLAlchemy, relaciones, consultas y transacciones. | `backend/modelos`, `database.py` |
| Seguridad | JWT, sesión, roles y permisos. | `dependencias/auth_dependencia.py`, `permiso_dependencia.py` |
| Auditoría | Registro de eventos de operación. | `bitacora_modelo.py` |

## Cómo se presenta el MER

Un solo diagrama con las ~31 tablas queda ilegible (Workbench lo demuestra). En la carpeta van **tres hojas**:

1. **Toda la DB por módulos** (`MER_GLOBAL.puml`): dos bases y cinco cajas. No lista cada tabla.
2. **Zoom comercial** (`MER_RESERVA.puml`): cliente, viaje, reserva, viajero, asiento y pago.
3. **Zoom seguridad** (`MER_SEGURIDAD.puml`): roles, permisos, usuarios y bitácora.

Las FK `creado_por`, `actualizado_por`, `validado_por` y `registrado_por` **no se grafican**: todas apuntan a `usuarios` y se documentan en el diccionario. Si se dibujan, el diagrama se llena de rayas hacia una sola entidad.

## Modelo relacional resumido

| Dominio | Tablas principales | Relación relevante |
|---|---|---|
| Seguridad (`travel_bqto_seguridad`) | `usuarios`, `roles`, `permisos`, `roles_permisos`, `bitacora` | Usuario pertenece a rol; rol tiene permisos; bitácora audita al usuario. |
| Clientes | `clientes`, `estados`, `ciudades`, `puntos_recogida`, `clientes_puntos_recogida` | Cliente puede guardar varios puntos de recogida. `usuario_id` apunta a la base de seguridad. |
| Oferta/operación | `destinos`, `destino_imagenes`, `viajes`, `unidades_transporte`, `asientos`, `viajes_guias`, `costos_operativos` | Un viaje usa un destino y una unidad. |
| Comercial | `cotizaciones`, `cotizacion_lineas`, `reservas`, `reserva_clientes`, `asientos_reservados` | Reserva vincula titular/viajeros al viaje y sus asientos. |
| Finanzas | `pagos`, `tasas`, `monedas`, `metodos_pago`, `bancos`, `puntos_venta` | Pago pertenece a una reserva y usa método/tasa. |
| Operación | `abordajes_viaje`, `resenas`, `viajes_ruta_recogida` | Abordaje refiere al viajero; el registrador vive en la base de seguridad. |

## Integridad y normalización

1. Las líneas de cotización separan importes repetibles de la cabecera de cotización.
2. La asociación entre reserva y clientes se modela en `reserva_clientes`; evita duplicar los datos personales del pasajero dentro de la reserva.
3. La asignación de asiento se separa en `asientos_reservados`, con índice único sobre asiento/viaje vigente.
4. Las relaciones lógicas se conservan mediante `eliminado_en` para mantener trazabilidad.

### Punto que debe confirmarse

La revisión académica solicita que cada persona que viaje tenga registro en `clientes`, no un texto repetido dentro de una línea de reserva. La estructura actual de `reserva_clientes` cumple ese enfoque porque contiene `cliente_id`; antes de defender se debe ejecutar una prueba creando una reserva familiar y verificando que cada viajero elegido exista como cliente.

## Bitácora

La entidad `bitacora` vive en `travel_bqto_seguridad`. Los **triggers** `trg_sigel_*` escriben INSERT/UPDATE/DELETE (la baja lógica se registra como DELETE). LOGIN, VALIDAR, RECHAZAR y respaldos los registra la API. Las variables de sesión `@sigel_usuario_id` y `@sigel_ip` identifican al operador.

## Vistas, índices y triggers

1. Vistas: `v_bitacora_listado`, `v_reserva_totales_eur`, `v_ocupacion_viaje`.
2. Índices: PK en cada tabla; únicos de negocio (correo, documento, placa, asiento por viaje); índices en FKs y en bitácora.
3. Triggers de integridad: rol/usuario Administrador intocable, bitácora no se borra, monto de pago > 0.
4. Se instalan con `utilidades/objetos_mysql.py` (también al arrancar la API).

## Dos bases y respaldo

1. `travel_bqto_seguridad` concentra credenciales, RBAC y auditoría. `travel_bqto` concentra el negocio.
2. Las FKs de negocio (`creado_por`, `usuario_id`, etc.) apuntan a `travel_bqto_seguridad.usuarios` en el mismo servidor MySQL.
3. El administrador genera respaldos desde Configuración > Respaldos. El cron `backend/jobs/respaldo_diario.py` deja un `.sql.gz` por base y rota a 7 días.
