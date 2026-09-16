"""Plantillas de croquis reutilizables por unidad de transporte."""

from __future__ import annotations

TIPOS_CELDA_CROQUIS = frozenset({"conductor", "puerta"})
PLANTILLAS_CROQUIS = frozenset({"travel_bqto"})

CROQUIS_FILAS_MAX = 15
CROQUIS_COLUMNAS_MAX = 7


def _asiento(numero: str, fila: int, columna: int, posicion: str) -> dict:
    return {
        "numero": numero,
        "fila": fila,
        "columna": columna,
        "posicion": posicion,
    }


def plantilla_travel_bqto() -> dict:
    """Croquis más usado de Travel BQTO: 33 asientos, puerta izquierda y conductor.

    Fila 0 = frente (abajo en el mapa). Fila 8 = fondo de 5 puestos.
    """
    asientos = [
        _asiento("A-0", 0, 0, "otro"),
        _asiento("A-00", 0, 2, "medio"),
        _asiento("A-02", 1, 3, "pasillo"),
        _asiento("A-01", 1, 4, "ventana"),
    ]

    for indice, fila in enumerate(range(2, 8)):
        impar_derecha = 3 + indice * 2
        par_derecha = impar_derecha + 1
        impar_izquierda = 15 + indice * 2
        par_izquierda = impar_izquierda + 1
        asientos.extend(
            [
                _asiento(f"A-{par_izquierda:02d}", fila, 0, "ventana"),
                _asiento(f"A-{impar_izquierda:02d}", fila, 1, "pasillo"),
                _asiento(f"A-{par_derecha:02d}", fila, 3, "pasillo"),
                _asiento(f"A-{impar_derecha:02d}", fila, 4, "ventana"),
            ]
        )

    for columna, numero in enumerate(range(27, 32)):
        if columna in (0, 4):
            posicion = "ventana"
        elif columna == 2:
            posicion = "medio"
        else:
            posicion = "pasillo"
        asientos.append(_asiento(f"A-{numero:02d}", 8, columna, posicion))

    return {
        "codigo": "travel_bqto",
        "nombre": "Travel BQTO (33 asientos)",
        "filas": 9,
        "columnas": 5,
        "celdas": [
            {"fila": 0, "columna": 4, "tipo": "conductor"},
            {"fila": 1, "columna": 0, "tipo": "puerta"},
            {"fila": 1, "columna": 1, "tipo": "puerta"},
        ],
        "asientos": asientos,
    }


def obtener_plantilla_croquis(codigo: str) -> dict:
    if codigo == "travel_bqto":
        return plantilla_travel_bqto()
    from fastapi import HTTPException
    raise HTTPException(status_code=400, detail="Plantilla de croquis no reconocida")
