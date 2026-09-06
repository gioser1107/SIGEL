# Informe y plan de pruebas de requisitos no funcionales

**Proyecto:** SIGEL — Travel BQTO  
**Sistema:** API FastAPI 1.3.0 + frontend React  
**Integrantes:** María Alvarado, Luis Herice, Sergio Jiménez, Gabriel Jiménez  
**Tutor:** Edecio Freitez  
**Fecha:** 4 de septiembre de 2026  
**Base:** Guía de pruebas RNF 2026 (prioridad seguridad, rendimiento, fiabilidad, usabilidad, mantenibilidad)

**Documentos maestros:** `docs/SRS_REQUISITOS_FUNCIONALES.md` (RF-01 a RF-21) y `docs/SRS_REQUISITOS_NO_FUNCIONALES.md` (RNF-01 a RNF-16).

---

## 1. Informe: cinco RNF clave

Se seleccionan cinco RNF aplicables y medibles en el prototipo local. No se elige RNF-09 (uptime 99 %) porque no es demostrable en localhost.

| # | ID oficial | Nombre | Categoría guía | Prioridad | Cómo se verifica en SIGEL |
|---|------------|--------|----------------|-----------|---------------------------|
| 1 | RNF-07 (+ RNF-01) | Seguridad de datos, comunicaciones y sesión | Seguridad | Alta | Bandit sobre `backend/`; JWT en endpoints protegidos; OWASP ZAP pendiente |
| 2 | RNF-10 | Tiempo de respuesta de la API | Eficiencia / rendimiento | Alta | JMeter o Locust: 20 VU, 3 min, promedio &lt; 2 s |
| 3 | RNF-08 | Fiabilidad e integridad transaccional | Fiabilidad | Media | Caída de MySQL → 503 genérico; asiento duplicado → 409 |
| 4 | RNF-15 | Usabilidad en tareas críticas | Usabilidad | Media | Encuesta SUS con compañeros; tarea reserva o pago |
| 5 | RNF-13 | Mantenibilidad del software | Mantenibilidad | Baja / indirecta | Carpetas MVC + OpenAPI `/docs` |

### Especificación breve (criterio de éxito / fracaso)

**RNF-07 / RNF-01.** Éxito: 0 hallazgos Bandit de severidad **alta** no justificados; recursos administrativos sin token responden 401/403; no se filtran stack traces. Fracaso: SQL injection explotable, secretos en código o listados de usuarios/reservas anónimos.

**RNF-10.** Éxito: 20 usuarios virtuales, 3 minutos, promedio &lt; 2 s y 0 % HTTP 500. Fracaso: promedio &gt; 5 s o errores 500.

**RNF-08.** Éxito: MySQL detenido → JSON 503 con mensaje controlado; dos reservas del mismo asiento → una OK y otra 409. Fracaso: traceback/SQL en pantalla o doble asiento vigente.

**RNF-15.** Éxito: SUS ≥ 70 y error de tarea ≤ 10 %. Fracaso: SUS &lt; 50 o abandono.

**RNF-13.** Éxito: existen `controladores/`, `modelos/`, `utilidades/` y `/docs` documenta la API. Fracaso: lógica de negocio solo en el frontend.

---

## 2. Plan de pruebas (2 casos por RNF)

| ID | RNF | Objetivo | Entorno | Criterio de éxito | Herramienta | Estado 2026-09-04 |
|----|-----|----------|---------|-------------------|-------------|-------------------|
| CP-RNF-01 | RNF-10 | Carga 20 VU / 3 min | API Uvicorn local | Promedio &lt; 2 s; 0 % errores | JMeter o Locust | Pendiente de ejecutar |
| CP-RNF-02 | RNF-10 | P95 lecturas catálogo | Igual | P95 ≤ 2 s | Locust / JMeter | Pendiente de ejecutar |
| CP-RNF-03 | RNF-07 | SAST código Python | Repo `backend/` | 0 High; medios justificados | Bandit | **Ejecutado** |
| CP-RNF-04 | RNF-01/07 | Caja negra sin token | API local | 401/403 en admin | curl / ZAP | **Parcial (curl)**; ZAP pendiente |
| CP-RNF-05 | RNF-08 | Caída de MySQL | Backend + MySQL | 503 sin traceback | Navegador | Pendiente |
| CP-RNF-06 | RNF-08 | Sin sobreventa de asiento | API local | Un 200 y un 409 | HTTP concurrente | Pendiente |
| CP-RNF-07 | RNF-15 | SUS con 5 compañeros | Frontend | SUS ≥ 70 | Encuesta | Pendiente |
| CP-RNF-08 | RNF-15/16 | ≤ 4 clics a reserva | Frontend | Flujo en español | Observación | Pendiente |
| CP-RNF-09 | RNF-13 | Estructura MVC + OpenAPI | Código + `/docs` | Routers en OpenAPI | Revisión | **Ejecutado** |
| CP-RNF-10 | RNF-13/14 | Chrome + 320 px | Frontend | Sin bloqueo visual | Navegador | Pendiente |

### Procedimiento detallado

**CP-RNF-01.** Instalar Apache JMeter o `pip install locust`. Levantar `uvicorn` en `:8000`. En Locust: `locust -f pruebas/rnf/locustfile.py --host=http://127.0.0.1:8000`. 20 usuarios, spawn 5/s, 3 minutos. Guardar gráfico (promedio, RPS, fallos).

**CP-RNF-02.** Misma corrida; registrar percentil 95 de GET `/api/catalogo/destinos`.

**CP-RNF-03.** `python3 -m bandit -r backend -ll` (ya corrido; ver sección 3).

**CP-RNF-04.** Completar con OWASP ZAP contra `http://127.0.0.1:5173` y `http://127.0.0.1:8000`. Evidencia curl ya obtenida (sección 3).

**CP-RNF-05.** Con sesión admin, detener MySQL (`brew services stop mysql` o equivalente), recargar un listado. Capturar respuesta: debe ser 503 `El servicio no puede completar la operación...` sin SQL.

**CP-RNF-06.** Dos POST simultáneos asignando el mismo asiento vigente del mismo viaje.

**CP-RNF-07.** Cinco usuarios internos (compañeros). Tarea: reportar un pago o crear reserva. Aplicar las 10 preguntas SUS (anexo A). Puntaje: para ítems impares restar 1; para pares restar la respuesta de 5; sumar y multiplicar por 2,5.

**CP-RNF-08.** Desde el home del rol Cliente o Admin, contar clics hasta mapa de asientos o «Crear reserva».

**CP-RNF-09.** Listar carpetas MVC y abrir `http://127.0.0.1:8000/docs`.

**CP-RNF-10.** Chrome; DevTools dispositivo 320×568; login + catálogo.

---

## 3. Resultados ejecutados (4 de septiembre de 2026)

### CP-RNF-03 — Bandit (SAST)

**Comando:** `python3 -m bandit -r backend -ll`  
**Líneas analizadas:** 12 482  
**Resumen:** 0 High, 10 Medium, 0 Low reportados en ese umbral.

| Hallazgo | Archivo | Severidad | Confianza | Dictamen |
|----------|---------|-----------|-----------|----------|
| B608 SQL con f-string | `bitacora_modelo.py` (filtros) | Media | Baja | **Falso positivo operativo.** El `WHERE` se arma con literales fijos (`modulo = :modulo`, etc.); los valores van en parámetros SQLAlchemy (`:modulo`, `:busqueda`). No se concatena input crudo. |
| B608 SQL con f-string | `sembrar_base_limpia.py` | Media | Baja | **No explotable.** Script de siembra offline, no es un endpoint. |
| B310 urllib.urlopen | `tasa_bcv.py` | Media | Alta | **Aceptado.** URL fija HTTPS (`ve.dolarapi.com`), timeout y SSL. |
| B310 urllib.urlopen | `validaciones.py` | Media | Alta | **Mitigar en endurecimiento.** Validar esquema `http`/`https` antes de HEAD (RNF-06 ya exige formato URL). |

**SHA-256:** Bandit no lo reportó como High. El prototipo usa `hashlib.sha256` en `usuario_modelo.py`. Limitación conocida (objetivo bcrypt/Argon2). No afirmar “hash fuerte de producción”.

**Veredicto CP-RNF-03:** **Éxito condicionado.** Cero hallazgos altos. Medios justificados o fuera de la superficie de ataque HTTP. Pendiente endurecer `urlopen` de validación de imágenes.

### CP-RNF-04 — Caja negra parcial (sin ZAP)

API en `http://127.0.0.1:8000`.

| Petición | Resultado | Cumple |
|----------|-----------|--------|
| `GET /api` | 200, ~84 ms | Salud de API |
| `GET /api/catalogo/destinos` | 200, ~14 ms | Público (diseño) |
| `GET /api/usuarios/` sin token | 401 `Not authenticated` | Sí |
| `GET /api/reservas` sin token | 401 | Sí |
| `GET /api/pagos` sin token | 401 | Sí |
| `GET /openapi.json` | 200 | OpenAPI disponible |

**Veredicto parcial:** recursos administrativos no se listan anónimos. Falta el informe de OWASP ZAP (XSS, headers).

### CP-RNF-09 — Mantenibilidad

Comprobado: `backend/controladores` (26 módulos), `backend/modelos`, `backend/utilidades`. OpenAPI HTTP 200. Frontend React consume `/api`.

**Veredicto:** **Éxito.**

---

## 4. Resultados pendientes (llenar con evidencia)

| ID | Cumplió (Sí/No) | Métrica / captura | Fecha | Responsable |
|----|-----------------|-------------------|-------|-------------|
| CP-RNF-01 | | Promedio ms, RPS, % error | | |
| CP-RNF-02 | | P95 ms | | |
| CP-RNF-04 ZAP | | Alertas altas/medias | | |
| CP-RNF-05 | | Foto 503 | | |
| CP-RNF-06 | | Códigos HTTP | | |
| CP-RNF-07 | | SUS promedio | | |
| CP-RNF-08 | | Nº de clics | | |
| CP-RNF-10 | | Chrome / 320 px | | |

---

## 5. Recomendaciones (para el informe final de la guía)

1. Migrar hash de contraseña a bcrypt o Argon2 (cierra la limitación de RNF-07).
2. En `validaciones.py`, rechazar URLs que no sean `http`/`https` antes de `urlopen`.
3. Índices y paginación ya existen; si JMeter supera 2 s, revisar listados sin límite y consultas N+1.
4. No afirmar analítica predictiva ni uptime 99 % en la oral.

---

## Anexo A — Cuestionario SUS (español)

Escala 1 = totalmente en desacuerdo … 5 = totalmente de acuerdo.

1. Creo que me gustaría usar este sistema con frecuencia.  
2. Encontré el sistema innecesariamente complejo.  
3. Pensé que el sistema era fácil de usar.  
4. Creo que necesitaría apoyo de una persona técnica para usar el sistema.  
5. Encontré que las funciones estaban bien integradas.  
6. Pensé que había demasiada inconsistencia.  
7. Imagino que la mayoría de la gente aprendería a usar el sistema rápidamente.  
8. Encontré el sistema muy engorroso de usar.  
9. Me sentí seguro usando el sistema.  
10. Necesité aprender muchas cosas antes de poder usar el sistema.

Tarea sugerida: «Inicie sesión y reporte un pago» o «Reserve un asiento en un viaje publicado».

---

## Anexo B — Cómo repetir Bandit y Locust

```bash
python3 -m pip install bandit locust
python3 -m bandit -r backend -ll
cd /ruta/SIGEL
locust -f pruebas/rnf/locustfile.py --host=http://127.0.0.1:8000
```

Locust UI: `http://localhost:8089` — 20 usuarios, 5 spawn/s, detener a los 3 minutos.
