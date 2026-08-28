# Hallazgos y validación previa a defensa

## Hallazgos comprobados

| Estado | Hallazgo | Evidencia |
|---|---|---|
| Confirmado | El backend supera compilación sintáctica. | `compileall` sobre `backend`. |
| Confirmado | La API está organizada en 24 routers funcionales. | `backend/main.py`. |
| Confirmado | Existen reportes estadísticos parametrizados por fecha y reglas para años/rangos. | `reporte_estadistico_modelo.py`. |
| Confirmado | Hay índice de unicidad para asientos vigentes por viaje. | migración `20260823_3fn_concurrencia_reservas.sql`. |
| Confirmado | El frontend compila a producción (`tsc -b && vite build`). | `npm run build` del 28-08-2026. |
| Pendiente | No se encontró modelo predictivo real. | revisión de controladores/modelos. |

## Bloqueantes sugeridos antes de afirmar «listo»

1. Ejecutar pruebas de extremo a extremo de reserva familiar, doble asiento, pago y bitácora.
2. Confirmar con el negocio y profesor la regla: cada viajero debe estar registrado como cliente.
3. Verificar que el interfaz de seguridad permita comprender permisos/módulos y que la bitácora muestre acción y registro afectados.
4. No presentar analítica predictiva hasta implementar y validar un modelo predictivo; presentar el módulo actual como analítica descriptiva/estadística.

## Registro de evidencias recomendado

Para cada prueba, conservar fecha, usuario/rol, datos de entrada no sensibles, respuesta HTTP, captura de interfaz y entrada correspondiente en bitácora. Esto permitirá defender la trazabilidad entre requisito, diagrama, código y comportamiento.
