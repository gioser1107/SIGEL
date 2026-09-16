# Diagramas UML

Dos carpetas de formato, y dentro las mismas tres de tipo:

```
diagramas/
  puml/     fuentes para editar
    secuencia/
    carriles/
    otros/
  pdf/      listos para imprimir
    secuencia/
    carriles/
    otros/
```

Los nombres coinciden (`RESERVA_CREAR`, `COTIZACION_CREAR`, etc.). El referente es `PATRON_RESERVA_PORTAL`.

## MER (no cabe en una sola hoja)

El reverse engineer de Workbench/phpMyAdmin de **toda** la base no se imprime: sale ilegible. `creado_por` y similares van al diccionario.

| Archivo | Qué es | Imprimir |
|---|---|---|
| `otros/MER_GLOBAL` | Toda la DB **por módulos** (2 bases, 5 cajas) | Sí, panorama |
| `otros/MER_NEGOCIO` | Reverse engineer de `travel_bqto` (tablas y columnas) | Sí, A3 / horizontal |
| `otros/MER_RESERVA` | Zoom del comercial (3FN) | **Sí, defensa** |
| `otros/MER_SEGURIDAD` | Zoom de la segunda base | Si preguntan |
