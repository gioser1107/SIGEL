# Pipeline de SIGEL

El workflow `.github/workflows/pruebas-sigel.yml` compila el frontend, crea dos bases MySQL nuevas con datos sintéticos, arranca la API y ejecuta 102 casos Pytest, 4 casos Playwright y 7 reglas del asistente. Conserva XML, logs, captura y resumen aun si falla. No publica la web ni registra aceptación humana. Las pruebas de rendimiento se conservan como ensayos separados; este workflow no certifica sus umbrales.

En GitHub: abrir Actions → Pruebas SIGEL → seleccionar la ejecución. Revisar los pasos y descargar `resultados-sigel-*` en Artifacts. El enlace de la ejecución, el commit y los reportes deben corresponder entre sí. La rama `codex/pipeline-pruebas` ejecuta el workflow al subir cambios; el botón manual requiere que el workflow exista en la rama predeterminada.

## Ejecución local

Requiere Python 3.12, Node 24, MySQL con permiso para crear bases aisladas y cliente mysql, frontend instalado con `npm ci --prefix frontend`, dependencias de `backend/requirements.txt` y `pruebas/ci/requirements.txt`, y Chromium instalado con `python -m playwright install chromium`.

Desde la raíz ejecutar `python pruebas/ci/ejecutar.py`. Para repetir, elegir otra carpeta vacía con `--salida pruebas/resultados_pipeline_otro`. El proceso escoge dos nombres nuevos con prefijo `sigel_ci_`; si esos nombres ya existen, se detiene sin borrarlos. Utiliza otro puerto local (8017), rechaza un puerto ocupado y solo detiene su propia API. Nunca utiliza las bases de trabajo como destino. La conexión puede usar el `.env` local; los nombres de bases los fija el proceso antes de importarlo. No subir `.env` ni respaldos SQL.

La creación se hace con metadata de los modelos y las migraciones/vistas/triggers de arranque, no importando una copia de la base de la laptop. Es un escenario limpio y reproducible, no una prueba de instalación desde un respaldo histórico.

## Resultados

- `pytest.xml`: 102 casos de unitarias, humo, API e integración.
- `interfaz.xml`: 4 casos sobre el frontend compilado.
- `casos/asistente.xml`: 7 reglas TypeScript con contexto controlado.
- `01_compilacion.log` a `05_asistente.log`, `servidor.log` y `resumen.json`.
- `casos/evidencias/`: trazas de peticiones con tokens ocultos y comprobaciones.

La automatización usa CAPTCHA como dato controlado, no mide resistencia a bots. La restauración de BK03 ocurre en esquemas aislados que crea el propio caso. El pipeline sale con error cuando falla una etapa; no se omiten aserciones para obtener un estado verde.
