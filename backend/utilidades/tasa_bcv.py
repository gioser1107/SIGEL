import json
import ssl
import urllib.error
import urllib.request
from decimal import Decimal, InvalidOperation

from fastapi import HTTPException

URL_EUR_OFICIAL = "https://ve.dolarapi.com/v1/euros/oficial"
URL_USD_OFICIAL = "https://ve.dolarapi.com/v1/dolares/oficial"
TIMEOUT_SEGUNDOS = 20


def _decimal_positivo(valor) -> Decimal:
    try:
        numero = Decimal(str(valor))
    except (InvalidOperation, ValueError, TypeError) as error:
        raise HTTPException(status_code=503, detail="La tasa BCV recibida no es un número válido") from error
    if numero <= 0:
        raise HTTPException(status_code=503, detail="La tasa BCV recibida no es válida")
    return numero.quantize(Decimal("0.0001"))


def _consultar_json(url: str) -> dict:
    peticion = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "User-Agent": "SIGEL-TravelBQTO/1.0"},
    )
    contexto = ssl.create_default_context()
    try:
        with urllib.request.urlopen(peticion, timeout=TIMEOUT_SEGUNDOS, context=contexto) as respuesta:
            cuerpo = respuesta.read().decode("utf-8")
    except urllib.error.URLError as error:
        raise HTTPException(
            status_code=503,
            detail="No se pudo consultar la tasa oficial BCV. Intenta de nuevo o regístrala a mano.",
        ) from error

    try:
        datos = json.loads(cuerpo)
    except json.JSONDecodeError as error:
        raise HTTPException(status_code=503, detail="La respuesta de la tasa BCV no es válida") from error
    if not isinstance(datos, dict):
        raise HTTPException(status_code=503, detail="La respuesta de la tasa BCV no es válida")
    return datos


def _valor_oficial(datos: dict) -> Decimal:
    for clave in ("promedio", "venta", "compra"):
        if datos.get(clave) is not None:
            return _decimal_positivo(datos[clave])
    raise HTTPException(status_code=503, detail="La fuente BCV no devolvió un valor de tasa")


def consultar_tasas_oficiales_bcv() -> dict[str, Decimal]:
    """Tasa oficial BCV: Bs por 1 EUR y, si está disponible, Bs por 1 USD."""
    eur = _valor_oficial(_consultar_json(URL_EUR_OFICIAL))
    tasas = {"EUR": eur}
    try:
        tasas["USD"] = _valor_oficial(_consultar_json(URL_USD_OFICIAL))
    except HTTPException:
        pass
    return tasas
