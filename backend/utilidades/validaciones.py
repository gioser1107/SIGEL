"""Validaciones centralizadas de entrada en el backend (regex y reglas de negocio)."""

from __future__ import annotations

import re
from typing import Any

from fastapi import HTTPException

_REGEX_CORREO = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
_REGEX_NOMBRE_PERSONA = re.compile(r"^[A-Za-záéíóúÁÉÍÓÚüÜñÑ\s'-]{2,80}$")
_REGEX_NOMBRE_ENTIDAD = re.compile(r"^[A-Za-záéíóúÁÉÍÓÚüÜñÑ0-9\s'.&-]{2,160}$")
_REGEX_ETIQUETA = re.compile(r"^[A-Za-záéíóúÁÉÍÓÚüÜñÑ0-9\s'.#-]{2,80}$")
_REGEX_CODIGO = re.compile(r"^[A-Za-z0-9_\-]{1,30}$")
_REGEX_URL_HTTP = re.compile(
    r"^https?://[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]{1,512}$"
)
_REGEX_RUTA_ARCHIVO = re.compile(r"^/api/archivos/[A-Za-z0-9._\-/]{1,480}$")

_TIPOS_DOCUMENTO = frozenset({"V", "E", "P", "J", "G"})
_TIPOS_DOCUMENTO_NUMERICOS = frozenset({"V", "E", "P"})
_TIPOS_CLIENTE = frozenset({"natural", "juridico"})


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
        limpio = str(valor).strip()
        if not _REGEX_NOMBRE_PERSONA.fullmatch(limpio):
            cls._error(
                campo,
                "solo puede contener letras, espacios, guiones y apóstrofes (mín. 2 caracteres)",
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
            cls._error(
                campo,
                "contiene caracteres no permitidos (usa letras, números, espacios y .-'&)",
            )
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
        return limpio

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
            cls._error("numero_documento", "debe tener entre 4 y 15 caracteres alfanuméricos")
        return limpio

    @classmethod
    def contrasena(cls, valor: str | None, *, minimo: int = 6) -> str:
        if valor is None or not str(valor):
            cls._error("contrasena", "es obligatoria")
        if len(str(valor)) < minimo:
            cls._error("contrasena", f"debe tener al menos {minimo} caracteres")
        return str(valor)


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
