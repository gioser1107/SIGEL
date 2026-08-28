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
MySQL `travel_bqto`                ├─ cotizaciones, reservas, pagos
                                    ├─ abordaje, reseñas, bitácora
                                    └─ reportes estadísticos
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

## Modelo relacional resumido

| Dominio | Tablas principales | Relación relevante |
|---|---|---|
| Seguridad | `usuarios`, `roles`, `permisos`, `roles_permisos` | Usuario pertenece a rol; rol tiene permisos. |
| Clientes | `clientes`, `estados`, `ciudades`, `puntos_recogida`, `clientes_puntos_recogida` | Cliente puede guardar varios puntos de recogida. |
| Oferta/operación | `destinos`, `destino_imagenes`, `viajes`, `unidades_transporte`, `asientos`, `viajes_guias`, `costos_operativos` | Un viaje usa un destino y una unidad. |
| Comercial | `cotizaciones`, `cotizacion_lineas`, `reservas`, `reserva_clientes`, `asientos_reservados` | Reserva vincula titular/viajeros al viaje y sus asientos. |
| Finanzas | `pagos`, `tasas`, `monedas`, `metodos_pago`, `bancos`, `puntos_venta` | Pago pertenece a una reserva y usa método/tasa. |
| Operación/auditoría | `abordajes_viaje`, `resenas`, `bitacora`, `viajes_ruta_recogida` | Abordaje refiere al viajero; bitácora documenta acciones. |

## Integridad y normalización

1. Las líneas de cotización separan importes repetibles de la cabecera de cotización.
2. La asociación entre reserva y clientes se modela en `reserva_clientes`; evita duplicar los datos personales del pasajero dentro de la reserva.
3. La asignación de asiento se separa en `asientos_reservados`, con índice único sobre asiento/viaje vigente.
4. Las relaciones lógicas se conservan mediante `eliminado_en` para mantener trazabilidad.

### Punto que debe confirmarse

La revisión académica solicita que cada persona que viaje tenga registro en `clientes`, no un texto repetido dentro de una línea de reserva. La estructura actual de `reserva_clientes` cumple ese enfoque porque contiene `cliente_id`; antes de defender se debe ejecutar una prueba creando una reserva familiar y verificando que cada viajero elegido exista como cliente.

## Bitácora

La entidad `bitacora` contempla `usuario_id`, `modulo`, `accion`, `tabla_afectada`, `registro_id`, `resumen`, `detalle`, `ip_origen` y `creado_en`. En los diagramas, toda operación crítica termina con el registro de auditoría antes de devolver la confirmación.
