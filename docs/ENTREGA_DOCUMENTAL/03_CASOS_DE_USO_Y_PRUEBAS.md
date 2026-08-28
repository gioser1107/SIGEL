# Casos de uso prioritarios y pruebas de aceptación

## CU-01 — Crear cotización

**Actor principal:** Administrador o atención al cliente.  
**Precondición:** sesión activa con permiso de cotizaciones.

1. El actor abre la vista de cotizaciones y selecciona «Nueva cotización».
2. La interfaz solicita cliente, destino, requisitos, precio/validez y líneas cuando correspondan.
3. La API valida permisos y datos de negocio.
4. Se persiste cabecera y líneas de cotización.
5. Se registra la acción en bitácora y se devuelve confirmación.

**Alternos:** datos inválidos (400/422), cliente/destino inexistente (404), permiso insuficiente (403), conflicto de BD (409).

## CU-02 — Registrar reserva con viajeros y asientos

**Actor principal:** Cliente o administrador.  
**Precondición:** viaje disponible; viajeros existentes como clientes.

1. El actor selecciona viaje y titular.
2. Agrega los viajeros y su punto de recogida.
3. El sistema consulta los asientos disponibles del viaje.
4. El actor elige asientos y confirma.
5. La API valida disponibilidad, persiste reserva, viajeros y asientos.
6. Se registra bitácora y se muestra número/estado de la reserva.

**Regla:** la operación debe rechazar asiento ya tomado para el viaje.  
**Alternos:** cupo/asiento ocupado (409), datos inválidos (400/422), viaje inexistente (404).

## CU-03 — Registrar y conciliar pago

**Actor principal:** Cliente / administrador.

1. El cliente consulta el resumen de pago de su reserva.
2. Selecciona método, banco/punto de venta según aplique, monto, referencia y comprobante.
3. La API valida y registra el pago en validación.
4. El administrador consulta la bandeja, revisa soporte y aprueba o rechaza.
5. El sistema conserva el resultado y registra la acción crítica en bitácora.

## CU-04 — Consultar reportes estadísticos

**Actor principal:** Administrador.  
**Precondición:** permiso de lectura de reservas, pagos o clientes.

1. El actor define una fecha inicial y final reales.
2. El sistema valida rango, orden y límite de diez años.
3. Se calculan clientes nuevos, reservas, pasajeros, destinos más reservados/cotizados, movimiento mensual e ingresos aprobados.
4. La interfaz presenta indicadores e impresión.

## Casos y artefactos UML

| Proceso | Secuencia | Carriles |
|---|---|---|
| Crear cotización | `diagramas/puml/secuencia/COTIZACION_CREAR.puml` | `diagramas/puml/carriles/COTIZACION_CREAR.puml` |
| Modificar cotización | `diagramas/puml/secuencia/COTIZACION_MODIFICAR.puml` | `diagramas/puml/carriles/COTIZACION_MODIFICAR.puml` |
| Crear reserva | `diagramas/puml/secuencia/RESERVA_CREAR.puml` | `diagramas/puml/carriles/RESERVA_CREAR.puml` |
| Asignar asiento a un viajero | `diagramas/puml/secuencia/RESERVA_ASIENTO.puml` | `diagramas/puml/carriles/RESERVA_ASIENTO.puml` |
| Registrar pago | `diagramas/puml/secuencia/PAGO_REGISTRAR.puml` | `diagramas/puml/carriles/PAGO_REGISTRAR.puml` |
| Consultar reportes | `diagramas/puml/secuencia/REPORTE_ESTADISTICO.puml` | `diagramas/puml/carriles/REPORTE_ESTADISTICO.puml` |

## Matriz mínima de pruebas

| ID | Prueba | Resultado esperado |
|---|---|---|
| CP-01 | Login válido/inválido. | 200 con token / 401 sin revelar detalle. |
| CP-02 | Acción admin con rol cliente. | 403. |
| CP-03 | Crear cliente con nombre inválido. | Rechazo de validación y sin persistencia. |
| CP-04 | Reservar el mismo asiento dos veces. | Segunda operación rechazada con 409. |
| CP-05 | Reserva familiar con varios viajeros. | Cada viajero se asocia por `cliente_id`; asientos por viajero. |
| CP-06 | Reporte con rango invertido/año imposible. | 400 con mensaje de rango válido. |
| CP-07 | Registrar, aprobar y rechazar pagos. | Estados y bitácora coherentes. |
| CP-08 | Crear/editar/anular destino o cotización. | Cambio y bitácora con módulo/acción/registro. |
