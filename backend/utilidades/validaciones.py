"""Validaciones centralizadas de entrada en el backend (regex y reglas de negocio)."""

from __future__ import annotations

import os
import re
import urllib.error
import urllib.request
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from fastapi import HTTPException

_REGEX_CORREO = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
_REGEX_NOMBRE_PERSONA = re.compile(r"^[A-Za-záéíóúÁÉÍÓÚüÜñÑ]+(?:\s+[A-Za-záéíóúÁÉÍÓÚüÜñÑ]+){0,6}$")
_REGEX_NOMBRE_ENTIDAD = re.compile(r"^[A-Za-záéíóúÁÉÍÓÚüÜñÑ0-9\s'.&-]{2,160}$")
_REGEX_ETIQUETA = re.compile(r"^[A-Za-záéíóúÁÉÍÓÚüÜñÑ0-9\s'.#-]{2,80}$")
_REGEX_CODIGO = re.compile(r"^[A-Za-z0-9_\-]{1,30}$")
_REGEX_URL_HTTP = re.compile(
    r"^https?://[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]{1,512}$"
)
_REGEX_RUTA_ARCHIVO = re.compile(r"^/api/archivos/[A-Za-z0-9._\-/]{1,480}$")
_REGEX_TELEFONO = re.compile(r"^\+?[0-9]{7,20}$")

_REGEX_PLACA = re.compile(r"^[A-Za-z0-9\-]{4,16}$")
_REGEX_ASIENTO = re.compile(r"^[A-Za-z0-9\-]{1,10}$")

_TIPOS_DOCUMENTO = frozenset({"V", "E", "P", "J", "G"})
_TIPOS_DOCUMENTO_NUMERICOS = frozenset({"V", "E", "P"})
_TIPOS_CLIENTE = frozenset({"natural", "juridico"})
_CATEGORIAS_COSTO = frozenset(
    {"combustible", "logistica", "pago_guia", "alimentacion", "peajes", "otro"}
)
_POSICIONES_ASIENTO = frozenset({"ventana", "pasillo", "medio", "otro"})
_ESTADOS_VIAJE = frozenset({"planificado", "en_curso", "finalizado", "cancelado"})
_ESTADOS_COTIZACION = frozenset(
    {"solicitada", "pendiente", "aceptada", "vencida", "cancelada"}
)
_ESTADOS_RESERVA = frozenset({"pendiente", "confirmada", "abonada", "cancelada"})
_MONTO_MAXIMO = Decimal("9999999.99")


class ValidadorEntrada:
    """Encapsula reglas de validación reutilizables en modelos y controladores."""

    @staticmethod
    def _error(campo: str, mensaje: str) -> None:
        raise HTTPException(status_code=422, detail=f"{campo}: {mensaje}")

    @classmethod
    def _texto_obligatorio(cls, valor: str | None, campo: str) -> str:
        limpio = (valor or "").strip()
        if not limpio:
            cls._error(campo, "es obligatorio")
        return limpio

    @classmethod
    def nombre_persona(
        cls,
        valor: str | None,
        campo: str = "nombre",
        *,
        obligatorio: bool = True,
    ) -> str:
        if valor is None or not str(valor).strip():
            if obligatorio:
                cls._error(campo, "es obligatorio")
            return ""
        limpio = re.sub(r"\s+", " ", str(valor).strip())
        if re.search(r"\d", limpio):
            cls._error(campo, "no puede contener números")
        if re.search(r"[^A-Za-záéíóúÁÉÍÓÚüÜñÑ\s]", limpio):
            cls._error(campo, "no puede contener caracteres especiales")
        if len(limpio) < 2 or len(limpio) > 80 or not _REGEX_NOMBRE_PERSONA.fullmatch(limpio):
            cls._error(
                campo,
                "solo puede contener letras y espacios (mín. 2 caracteres, sin números ni símbolos)",
            )
        return limpio

    @classmethod
    def nombre_entidad(
        cls,
        valor: str | None,
        campo: str = "nombre",
        *,
        obligatorio: bool = True,
    ) -> str:
        if valor is None or not str(valor).strip():
            if obligatorio:
                cls._error(campo, "es obligatorio")
            return ""
        limpio = str(valor).strip()
        if len(limpio) < 2:
            cls._error(campo, "debe tener al menos 2 caracteres")
        if not _REGEX_NOMBRE_ENTIDAD.fullmatch(limpio):
            cls._error(campo, "no es válido")
        return limpio

    @classmethod
    def etiqueta_texto(
        cls,
        valor: str | None,
        campo: str = "nombre",
        *,
        obligatorio: bool = True,
    ) -> str:
        if valor is None or not str(valor).strip():
            if obligatorio:
                cls._error(campo, "es obligatorio")
            return ""
        limpio = str(valor).strip()
        if not _REGEX_ETIQUETA.fullmatch(limpio):
            cls._error(
                campo,
                "solo puede contener letras, números, espacios y caracteres .'#-",
            )
        return limpio

    @classmethod
    def correo(cls, valor: str | None, *, obligatorio: bool = True) -> str:
        if valor is None or not str(valor).strip():
            if obligatorio:
                cls._error("correo", "es obligatorio")
            return ""
        limpio = str(valor).strip().lower()
        if not _REGEX_CORREO.fullmatch(limpio):
            cls._error("correo", "no tiene un formato válido")
        return limpio

    @classmethod
    def codigo_permiso(cls, valor: str | None) -> str:
        limpio = cls._texto_obligatorio(valor, "descripcion")
        if not _REGEX_CODIGO.fullmatch(limpio):
            cls._error(
                "descripcion",
                "usa solo letras, números, guiones y guiones bajos (ej: gestionar_reservas)",
            )
        return limpio

    @classmethod
    def telefono(cls, valor: str | None, campo: str = "telefono", *, obligatorio: bool = False) -> str:
        if valor is None or not str(valor).strip():
            if obligatorio:
                cls._error(campo, "es obligatorio")
            return ""
        crudo = str(valor).strip()
        if re.search(r"[A-Za-záéíóúÁÉÍÓÚüÜñÑ]", crudo):
            cls._error(campo, "no puede contener letras")
        limpio = re.sub(r"[\s\-().]", "", crudo)
        if not _REGEX_TELEFONO.fullmatch(limpio):
            cls._error(campo, "solo dígitos (7 a 20); se admite un + inicial, sin letras")
        return limpio

    @classmethod
    def _a_fecha(cls, valor: date | datetime, campo: str) -> date:
        if isinstance(valor, datetime):
            return valor.date()
        if isinstance(valor, date):
            return valor
        cls._error(campo, "no es una fecha válida")
        raise AssertionError("inalcanzable")

    @classmethod
    def fecha_no_futura(
        cls,
        valor: date | datetime | None,
        campo: str,
        *,
        obligatorio: bool = False,
    ) -> date | datetime | None:
        """Rechaza fechas posteriores a hoy. Viajes y vigencia de cotización no usan esto."""
        if valor is None:
            if obligatorio:
                cls._error(campo, "es obligatorio")
            return None
        if cls._a_fecha(valor, campo) > date.today():
            cls._error(campo, "no puede ser una fecha futura")
        return valor

    @classmethod
    def rango_fechas_no_futuro(
        cls,
        desde: date | datetime | None,
        hasta: date | datetime | None,
        campo_desde: str = "desde",
        campo_hasta: str = "hasta",
    ) -> tuple[date | datetime | None, date | datetime | None]:
        cls.fecha_no_futura(desde, campo_desde)
        cls.fecha_no_futura(hasta, campo_hasta)
        if desde is not None and hasta is not None:
            if cls._a_fecha(desde, campo_desde) > cls._a_fecha(hasta, campo_hasta):
                cls._error(campo_desde, "no puede ser posterior a la fecha final")
        return desde, hasta

    @classmethod
    def _url_es_accesible(cls, url: str) -> bool:
        encabezados = {"User-Agent": "SIGEL-Validador/1.0"}
        try:
            peticion = urllib.request.Request(url, method="HEAD", headers=encabezados)
            with urllib.request.urlopen(peticion, timeout=4) as respuesta:
                return int(getattr(respuesta, "status", 200)) < 400
        except urllib.error.HTTPError as error:
            if error.code in (403, 405, 501):
                try:
                    peticion = urllib.request.Request(
                        url,
                        method="GET",
                        headers={**encabezados, "Range": "bytes=0-0"},
                    )
                    with urllib.request.urlopen(peticion, timeout=4) as respuesta:
                        return int(getattr(respuesta, "status", 200)) < 400
                except Exception:
                    return False
            return False
        except Exception:
            return False

    @classmethod
    def url_imagen(cls, url: str | None, *, obligatorio: bool = False) -> str:
        if url is None or not str(url).strip():
            if obligatorio:
                cls._error("url", "es obligatoria")
            return ""
        limpio = str(url).strip()
        if _REGEX_RUTA_ARCHIVO.fullmatch(limpio):
            return limpio
        if not _REGEX_URL_HTTP.fullmatch(limpio):
            cls._error(
                "url",
                "debe ser http(s):// con caracteres válidos o una ruta /api/archivos/...",
            )
        verificar = os.getenv("VALIDAR_EXISTENCIA_URL", "1").lower() not in {"0", "false", "no"}
        if verificar and not cls._url_es_accesible(limpio):
            cls._error("url", "no existe o no es accesible")
        return limpio

    url_imagen = url_imagen

    @classmethod
    def tipo_cliente(cls, valor: str | None) -> str:
        limpio = cls._texto_obligatorio(valor, "tipo_cliente")
        if limpio not in _TIPOS_CLIENTE:
            cls._error("tipo_cliente", "debe ser 'natural' o 'juridico'")
        return limpio

    @classmethod
    def tipo_documento(cls, valor: str | None) -> str:
        limpio = cls._texto_obligatorio(valor, "tipo_documento").upper()
        if limpio not in _TIPOS_DOCUMENTO:
            cls._error("tipo_documento", "tipo de documento no válido")
        return limpio

    @classmethod
    def numero_documento(cls, tipo_documento: str, numero: str | None) -> str:
        limpio = cls._texto_obligatorio(numero, "numero_documento")
        if tipo_documento in _TIPOS_DOCUMENTO_NUMERICOS:
            if not re.fullmatch(r"\d{4,9}", limpio):
                cls._error("numero_documento", "la cédula solo puede contener 4 a 9 dígitos")
        elif not re.fullmatch(r"[A-Za-z0-9]{4,15}", limpio):
            cls._error("numero_documento", "no es válido")
        return limpio

    @classmethod
    def contrasena(cls, valor: str | None, *, minimo: int = 6) -> str:
        if valor is None or not str(valor):
            cls._error("contrasena", "es obligatoria")
        if len(str(valor)) < minimo:
            cls._error("contrasena", f"debe tener al menos {minimo} caracteres")
        return str(valor)

    @classmethod
    def valor_catalogo(
        cls,
        valor: str | None,
        campo: str,
        permitidos: frozenset[str],
        *,
        obligatorio: bool = True,
    ) -> str:
        if valor is None or not str(valor).strip():
            if obligatorio:
                cls._error(campo, "es obligatorio")
            return ""
        limpio = str(valor).strip()
        if limpio not in permitidos:
            cls._error(campo, "no es válido")
        return limpio

    @classmethod
    def texto_libre(
        cls,
        valor: str | None,
        campo: str,
        *,
        obligatorio: bool = False,
        minimo: int = 0,
        maximo: int = 255,
    ) -> str:
        if valor is None or not str(valor).strip():
            if obligatorio:
                cls._error(campo, "es obligatorio")
            return ""
        limpio = str(valor).strip()
        if "\x00" in limpio:
            cls._error(campo, "contiene caracteres no permitidos")
        if minimo and len(limpio) < minimo:
            cls._error(campo, f"debe tener al menos {minimo} caracteres")
        if len(limpio) > maximo:
            cls._error(campo, f"no puede superar {maximo} caracteres")
        return limpio

    @classmethod
    def monto(
        cls,
        valor: Any,
        campo: str,
        *,
        permitir_cero: bool = False,
    ) -> Decimal:
        if valor is None:
            cls._error(campo, "es obligatorio")
        try:
            dec = valor if isinstance(valor, Decimal) else Decimal(str(valor))
        except (InvalidOperation, ValueError, TypeError):
            cls._error(campo, "no es un monto válido")
        if not dec.is_finite():
            cls._error(campo, "no es un monto válido")
        if dec < 0:
            cls._error(campo, "no puede ser negativo")
        if dec == 0 and not permitir_cero:
            cls._error(campo, "debe ser mayor a 0")
        exponente = dec.as_tuple().exponent
        if isinstance(exponente, int) and exponente < -2:
            cls._error(campo, "admite máximo 2 decimales")
        if dec > _MONTO_MAXIMO:
            cls._error(campo, "excede el máximo permitido")
        return dec

    @classmethod
    def placa(cls, valor: str | None, campo: str = "placa") -> str:
        limpio = cls._texto_obligatorio(valor, campo).upper().replace(" ", "")
        if not _REGEX_PLACA.fullmatch(limpio):
            cls._error(campo, "solo letras, números y guiones (4 a 16 caracteres)")
        return limpio

    @classmethod
    def numero_asiento(cls, valor: str | None, campo: str = "numero") -> str:
        limpio = cls._texto_obligatorio(valor, campo).upper().replace(" ", "")
        if not _REGEX_ASIENTO.fullmatch(limpio):
            cls._error(campo, "solo letras, números y guiones (máx. 10)")
        return limpio

    @classmethod
    def posicion_asiento(cls, valor: str | None, campo: str = "posicion") -> str:
        return cls.valor_catalogo(valor, campo, _POSICIONES_ASIENTO)

    @classmethod
    def capacidad_pasajeros(cls, valor: Any, campo: str = "capacidad") -> int:
        if valor is None:
            cls._error(campo, "es obligatorio")
        try:
            entero = int(valor)
        except (TypeError, ValueError):
            cls._error(campo, "debe ser un número entero")
        if entero < 1 or entero > 100:
            cls._error(campo, "debe estar entre 1 y 100")
        return entero

    @classmethod
    def categoria_costo(cls, valor: str | None, campo: str = "categoria") -> str:
        return cls.valor_catalogo(valor, campo, _CATEGORIAS_COSTO)

    @classmethod
    def estado_viaje(cls, valor: str | None, campo: str = "estado") -> str:
        return cls.valor_catalogo(valor, campo, _ESTADOS_VIAJE)

    @classmethod
    def estado_cotizacion(cls, valor: str | None, campo: str = "estado") -> str:
        return cls.valor_catalogo(valor, campo, _ESTADOS_COTIZACION)

    @classmethod
    def estado_reserva(cls, valor: str | None, campo: str = "estado") -> str:
        return cls.valor_catalogo(valor, campo, _ESTADOS_RESERVA)

    @classmethod
    def codigo(cls, valor: str | None, campo: str = "codigo") -> str:
        limpio = cls._texto_obligatorio(valor, campo)
        if not _REGEX_CODIGO.fullmatch(limpio):
            cls._error(
                campo,
                "usa solo letras, números, guiones y guiones bajos",
            )
        return limpio


def validar_datos_cliente_entrada(datos: Any, *, parcial: bool = False) -> None:
    """Valida campos de cliente antes de persistir (creación o actualización parcial)."""

    tipo_cliente = getattr(datos, "tipo_cliente", None)
    if not parcial or tipo_cliente is not None:
        ValidadorEntrada.tipo_cliente(tipo_cliente or "natural")

    nombre = getattr(datos, "nombre", None)
    if not parcial or nombre is not None:
        ValidadorEntrada.nombre_persona(nombre, "nombre", obligatorio=not parcial)

    apellido = getattr(datos, "apellido", None)
    if not parcial or apellido is not None:
        ValidadorEntrada.nombre_persona(apellido, "apellido", obligatorio=not parcial)

    tipo_documento = getattr(datos, "tipo_documento", None)
    numero_documento = getattr(datos, "numero_documento", None)
    if not parcial or tipo_documento is not None or numero_documento is not None:
        tipo = ValidadorEntrada.tipo_documento(
            tipo_documento if tipo_documento is not None else "V"
        )
        if not parcial or numero_documento is not None:
            ValidadorEntrada.numero_documento(
                tipo,
                numero_documento if numero_documento is not None else "",
            )

    razon_social = getattr(datos, "razon_social", None)
    tipo_final = (tipo_cliente or "natural").strip().lower()
    if tipo_final == "juridico":
        if not parcial or razon_social is not None:
            ValidadorEntrada.nombre_entidad(
                razon_social,
                "razon_social",
                obligatorio=not parcial,
            )

    direccion = getattr(datos, "direccion", None)
    if direccion is not None:
        ValidadorEntrada.texto_libre(direccion, "direccion", maximo=255)

    notas = getattr(datos, "notas", None)
    if notas is not None:
        ValidadorEntrada.texto_libre(notas, "notas", maximo=1000)


def normalizar_datos_cliente(datos: Any) -> dict[str, Any]:
    """Devuelve campos de cliente ya validados y normalizados para persistencia."""

    validar_datos_cliente_entrada(datos, parcial=False)
    tipo_documento = ValidadorEntrada.tipo_documento(datos.tipo_documento)
    return {
        "tipo_cliente": ValidadorEntrada.tipo_cliente(datos.tipo_cliente),
        "tipo_documento": tipo_documento,
        "numero_documento": ValidadorEntrada.numero_documento(
            tipo_documento,
            datos.numero_documento,
        ),
        "nombre": ValidadorEntrada.nombre_persona(datos.nombre, "nombre"),
        "apellido": ValidadorEntrada.nombre_persona(datos.apellido, "apellido"),
        "razon_social": (
            ValidadorEntrada.nombre_entidad(datos.razon_social, "razon_social")
            if getattr(datos, "tipo_cliente", "natural") == "juridico"
            and getattr(datos, "razon_social", None)
            else getattr(datos, "razon_social", None)
        ),
    }
