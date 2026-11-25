"""Casos aislados. Entradas y expectativas fijadas antes de ejecutar."""
from datetime import datetime, timedelta
import pytest
from fastapi import HTTPException
from utilidades.validaciones import ValidadorEntrada as V
from utilidades.politicas_agencia import normalizar_modalidad, cumple_aviso_anticipacion
from utilidades.captcha import generar_captcha, validar_captcha

def test_U01_nombre_valido():
    assert V.nombre_persona('  María   Pérez  ') == 'María Pérez'

def test_U02_nombre_con_digitos_rechazado():
    with pytest.raises(HTTPException) as e: V.nombre_persona('Maria123')
    assert e.value.status_code == 422

def test_U03_monto_negativo_rechazado():
    with pytest.raises(HTTPException) as e: V.monto(-1, 'monto')
    assert e.value.status_code == 422

def test_U04_modalidad_invalida_rechazada():
    with pytest.raises(HTTPException) as e: normalizar_modalidad('inexistente')
    assert e.value.status_code == 400

def test_U05_aviso_limite_24_horas():
    salida = datetime(2026,11,24,12)
    assert cumple_aviso_anticipacion(salida, salida-timedelta(hours=24))
    assert not cumple_aviso_anticipacion(salida, salida-timedelta(hours=24)+timedelta(seconds=1))

def test_U06_captcha_incorrecto_rechazado():
    c = generar_captcha()
    with pytest.raises(HTTPException) as e: validar_captcha(c['token'], 'XXXXX')
    assert e.value.status_code == 400
