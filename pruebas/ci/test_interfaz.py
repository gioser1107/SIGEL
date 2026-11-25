"""Interfaz real servida por la API compilada; CAPTCHA como dato controlado de QA."""
import base64
import json
import os
import re
from pathlib import Path
import httpx
from playwright.sync_api import expect

BASE=os.environ['SIGEL_QA_URL']

def test_UI_CI01_catalogo_disponible(page):
    respuesta=page.goto(BASE,wait_until='domcontentloaded')
    assert respuesta.status==200
    expect(page.locator('body')).not_to_have_text('')
    expect(page.get_by_role('link', name=re.compile('iniciar sesi',re.I)).first).to_be_visible()

def test_UI_CI02_captcha_obligatorio(page):
    page.goto(BASE+'/iniciar-sesion')
    page.locator('input[type=email]').fill(os.environ['SIGEL_QA_ADMIN_CORREO'])
    page.locator('#contrasena').fill(os.environ['SIGEL_QA_ADMIN_CLAVE'])
    page.get_by_role('button',name=re.compile('Iniciar Sesión',re.I)).click()
    assert '/iniciar-sesion' in page.url
    expect(page.locator('input[aria-label="Caracteres del CAPTCHA"]')).to_be_visible()

def test_UI_CI03_login_y_destinos(page):
    page.goto(BASE+'/iniciar-sesion')
    # Se obtiene de la API, sin deshabilitar la validación del servidor.
    c=httpx.get(BASE+'/api/auth/captcha').json()
    codigo=base64.urlsafe_b64decode(c['token']).decode().split('|')[0]
    page.route('**/api/auth/captcha',lambda ruta:ruta.fulfill(json=c))
    page.reload()
    page.locator('input[type=email]').fill(os.environ['SIGEL_QA_ADMIN_CORREO'])
    page.locator('#contrasena').fill(os.environ['SIGEL_QA_ADMIN_CLAVE'])
    page.locator('input[aria-label="Caracteres del CAPTCHA"]').fill(codigo)
    page.get_by_role('button',name=re.compile('Iniciar Sesión',re.I)).click()
    page.wait_for_url('**/admin/**')
    page.goto(BASE+'/admin/destinos')
    expect(page.locator('body')).to_contain_text('CI Destino sintético')
    (Path(os.environ['SIGEL_QA_SALIDA']).parent/'interfaz_destinos.png').parent.mkdir(parents=True,exist_ok=True)
    page.screenshot(path=str(Path(os.environ['SIGEL_QA_SALIDA']).parent/'interfaz_destinos.png'),full_page=True)

def test_UI_CI04_cliente_no_entra_administracion(page):
    # Sesión real de un Cliente; comprueba la protección de rutas del frontend.
    c=httpx.get(BASE+'/api/auth/captcha').json()
    respuesta=base64.urlsafe_b64decode(c['token']).decode().split('|')[0]
    r=httpx.post(BASE+'/api/auth/login',json={'correo':'qa.rf01.1@example.test','contrasena':'PruebaAcademica2026!','captcha_token':c['token'],'captcha_respuesta':respuesta})
    assert r.status_code==200
    d=r.json()
    page.goto(BASE)
    page.evaluate('(d)=>{localStorage.setItem("auth_token",d.token);localStorage.setItem("auth_usuario",JSON.stringify(d.usuario));}',d)
    page.goto(BASE+'/admin/destinos')
    page.wait_for_url('**/client/dashboard')
    expect(page.get_by_role('heading', name='Mis viajes', exact=True)).to_be_visible()
