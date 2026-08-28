# Guía breve para la defensa

## Apertura sugerida

SIGEL digitaliza el ciclo de Travel BQTO: publicación de destinos, registro de clientes, cotización, reserva de viajeros y asientos, reporte/validación de pagos, operación de abordaje y análisis estadístico para decisiones.

## Recorrido recomendado

1. **Problema:** operación turística con información dispersa, pagos y pasajeros sin trazabilidad unificada.
2. **Actores:** visitante, cliente, administrador y guía.
3. **Arquitectura:** React consume API FastAPI; SQLAlchemy persiste en MySQL; roles/permiso protegen acciones.
4. **Flujo central:** demostrar una reserva con viajeros, selección de asiento, regla de no duplicidad y bitácora.
5. **Finanzas:** reportar pago y mostrar que pasa a validación administrativa.
6. **Operación:** consultar manifiesto y registrar abordaje.
7. **Decisión:** abrir reportes estadísticos y filtrar por fechas reales.

## Respuestas técnicas preparadas

| Pregunta probable | Respuesta sustentada |
|---|---|
| ¿Cómo evitan doble asiento? | `asientos_reservados` se relaciona con viaje y asiento; una migración crea índice único para filas vigentes y la API maneja conflicto 409. |
| ¿Cómo registran acompañantes? | La reserva usa `reserva_clientes`; cada viajero referencia un cliente y puede tener punto de recogida/asiento. Debe mostrarse una prueba familiar. |
| ¿Cómo protegen acciones administrativas? | JWT más permisos granulares en dependencias del backend; las rutas reaccionan con 403 si falta autorización. |
| ¿Cómo saben quién modificó algo? | La bitácora conserva usuario, módulo, acción, tabla, registro, detalle, IP y fecha. |
| ¿Qué análisis tiene el sistema? | Reportes descriptivos por rango: clientes, reservas, pasajeros, destinos, movimiento mensual e ingresos aprobados. No presentar como predicción sin modelo entrenado. |
| ¿Qué ocurre con datos erróneos? | Deben validarse en interfaz y backend; el SRS define rechazo 400/422 y las pruebas documentan los casos. |

## Material que se debe imprimir

1. SRS actualizado.
2. Arquitectura y modelo de datos.
3. Diccionario de datos.
4. Los PDFs de `diagramas/pdf/secuencia/` y `diagramas/pdf/carriles/`; priorizar reserva y cotización. Componentes y dominio: `diagramas/pdf/otros/`.
5. Matriz de pruebas con evidencia de ejecución.

## Mensaje de transparencia

No afirmar funcionalidades no demostradas. En particular, reportar los análisis existentes como estadísticos/descriptivos y confirmar con pruebas la regla de viajeros-clientes antes de la exposición.
