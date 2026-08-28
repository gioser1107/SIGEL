# Lectura de observaciones y alcance de reconstrucción

**Proyecto:** SIGEL — Sistema Integral de Gestión Logística Turística para Travel BQTO  
**Fecha de reconstrucción:** 26 de agosto de 2026  
**Base de evidencia:** código fuente, estructura de base de datos definida por SQLAlchemy, migraciones y tres grabaciones de revisión académica.

## Propósito

Este paquete sustituye la documentación que no representaba fielmente el sistema. No se describe una funcionalidad solo porque sea conveniente para el texto: cada requisito y diagrama se vincula a un módulo real del repositorio o se identifica expresamente como pendiente de validación.

## Observaciones incorporadas

| Observación de la revisión | Respuesta documental |
|---|---|
| Los requisitos no coincidían con la historia de negocio ni con el sistema. | Se reconstruyó el SRS por capacidades verificables: catálogo turístico, clientes, cotizaciones, reservas, pagos, operación, seguridad y reportes. |
| Faltaban clientes, paquetes/destinos, cotizaciones y pagos en los requisitos. | Se incorporaron como procesos centrales y se trazan a API, modelo y pantallas. |
| Los diagramas de secuencia no tenían objetos, interfaz, mensajes, BD ni respuestas. | Cada secuencia usa actor, interfaz React, API/controlador FastAPI, modelos/BD y bitácora. |
| Los diagramas de carriles omitían decisiones, validaciones y mensajes de error. | Los flujos incluyen validación, decisión, persistencia, auditoría y respuesta al usuario. |
| La bitácora debe indicar quién hizo qué, en cuál módulo y sobre qué registro. | Se documenta la entidad `bitacora` con usuario, módulo, acción, tabla afectada, registro, detalle, IP y fecha. |
| Los reportes deben apoyar decisiones y permitir rangos de fechas reales. | Se documentan los indicadores implementados: clientes nuevos, reservas, pasajeros, destinos, movimiento mensual e ingresos aprobados. |
| Debe comprobarse la normalización, especialmente en reservas. | El modelo de datos incluye `reservas`, `reserva_clientes` y `asientos_reservados`; se deja una validación crítica sobre la regla «cada viajero es un cliente». |
| Las validaciones deben ocurrir en frontend y backend. | Se especifica validación de esquema, reglas de negocio y mensajes de error; se evita afirmar cobertura total sin pruebas. |

## Regla de lectura

- **Implementado:** se pudo comprobar en el código actual.
- **Pendiente de validación:** está solicitado o es necesario para una defensa, pero requiere prueba funcional, decisión del negocio o corrección de código.
- El sistema presenta analítica **descriptiva** implementada; no se identificó un modelo predictivo entrenado. Por ello no se afirma que exista analítica predictiva.

## Inventario de entregables

1. `01_SRS_ACTUALIZADO.md` — requisitos funcionales y no funcionales trazables.
2. `02_ARQUITECTURA_Y_DATOS.md` — arquitectura, módulos y modelo relacional.
3. `03_CASOS_DE_USO_Y_PRUEBAS.md` — casos de uso prioritarios y criterios de aceptación.
4. `04_HALLAZGOS_Y_VALIDACION.md` — puntos a validar antes de la defensa.
5. `diagramas/` — `puml/` para editar y `pdf/` para imprimir; dentro de cada una: `secuencia/`, `carriles/` y `otros/`.

## Historia de negocio

Las grabaciones mencionan una «historia hablada», pero no contienen su transcripción completa. Esta reconstrucción se fundamenta en el comportamiento implementado y debe contrastarse con la entrevista/levantamiento original antes de declararla versión final del negocio.
