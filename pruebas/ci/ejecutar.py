"""Pipeline local y GitHub: usa bases nuevas sigel_ci_*, guarda evidencia y falla de verdad."""
from pathlib import Path
from datetime import datetime, timezone
import argparse
import json
import os
import re
import socket
import subprocess
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--salida', default='pruebas/resultados_pipeline')
parser.add_argument('--sin-compilar', action='store_true', help='Solo si el frontend ya se compiló en este mismo entorno.')
args = parser.parse_args()
SALIDA = (ROOT / args.salida).resolve()
SALIDA.mkdir(parents=True, exist_ok=True)
if any(SALIDA.iterdir()):
    raise SystemExit('El directorio de salida debe estar vacío: se conservan las ejecuciones anteriores.')

def limpiar(s):
    return re.sub(r'eyJ[A-Za-z0-9_.-]+', 'TOKEN_OMITIDO', s)

env = os.environ.copy()
env.update({'TZ':'America/Caracas','TASA_BCV_AUTO':'0','RESPALDO_AUTO':'0','PYTHONUNBUFFERED':'1'})
if hasattr(time, 'tzset'):
    os.environ['TZ'] = env['TZ']; time.tzset()
marca = datetime.now().strftime('%Y%m%d_%H%M%S')
env.setdefault('DB_NOMBRE', 'sigel_ci_neg_'+marca)
env.setdefault('DB_NOMBRE_SEGURIDAD', 'sigel_ci_seg_'+marca)
for k in ('DB_NOMBRE','DB_NOMBRE_SEGURIDAD'):
    if not re.fullmatch(r'sigel_ci_[a-z0-9_]{1,45}',env[k]):
        raise SystemExit('Solo se permite crear bases nuevas sigel_ci_*; nunca las bases de trabajo.')
env.setdefault('DB_HOST','127.0.0.1')
env.setdefault('SIGEL_QA_ADMIN_CORREO','qa.admin.ci@example.test')
env.setdefault('SIGEL_QA_ADMIN_CLAVE','SoloDatosSinteticosCI2026!')
env['SIGEL_QA_DATOS'] = str(SALIDA/'preparacion.json')
env['SIGEL_QA_SALIDA'] = str(SALIDA/'casos')
env['SIGEL_UPLOAD_ROOT'] = str(SALIDA/'.privado'/'uploads')
env['SIGEL_RESPALDOS_DIR'] = str(SALIDA/'.privado'/'respaldos')
env['SIGEL_CLAVE_BOLETO_RUTA'] = str(SALIDA/'.privado'/'boleto_ci.pem')
env.setdefault('SIGEL_QA_URL','http://127.0.0.1:8017')
env.setdefault('JWT_SECRETO','clave-academica-ci-para-entorno-efimero-no-produccion')
from urllib.parse import urlparse
url = urlparse(env['SIGEL_QA_URL'])
if url.hostname not in ('127.0.0.1','localhost') or not url.port:
    raise SystemExit('La instancia del pipeline debe estar en localhost con puerto explícito.')
with socket.socket() as s:
    if s.connect_ex((url.hostname,url.port)) == 0:
        raise SystemExit('El puerto ya está ocupado; no se probará ni se detendrá ese servidor.')
resumen = {'inicio_utc':datetime.now(timezone.utc).isoformat(), 'origen':'GitHub Actions' if env.get('GITHUB_ACTIONS')=='true' else 'Local', 'commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(), 'run_url': f"https://github.com/{env.get('GITHUB_REPOSITORY')}/actions/runs/{env.get('GITHUB_RUN_ID')}" if env.get('GITHUB_RUN_ID') else None,'alcance':'Compilación; Pytest 102 casos; interfaz CI; reglas del asistente. Sin aceptación humana ni certificación de rendimiento.', 'etapas':[]}

def guardar():
    (SALIDA/'resumen.json').write_text(json.dumps(resumen,ensure_ascii=False,indent=2))

def etapa(nombre, comando, cwd=ROOT):
    print(f'[{nombre}] Iniciando', flush=True)
    inicio = time.monotonic()
    r = subprocess.run(comando,cwd=cwd,env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
    log=limpiar(r.stdout); (SALIDA/(nombre+'.log')).write_text(log)
    resumen['etapas'].append({'nombre':nombre,'codigo_salida':r.returncode,'segundos':round(time.monotonic()-inicio,2)})
    guardar()
    print(log[-3500:],flush=True)
    if r.returncode:
        raise RuntimeError(f'Falló {nombre}; ver {nombre}.log')

servidor = None
archivo_servidor = None
try:
    if not args.sin_compilar:
        etapa('01_compilacion',['npm','run','build'],ROOT/'frontend')
    elif not (ROOT/'frontend/dist/index.html').exists():
        raise RuntimeError('No existe frontend compilado.')
    etapa('02_preparacion',[sys.executable,str(ROOT/'pruebas/ci/preparar_base.py')])
    archivo_servidor = (SALIDA/'servidor.log').open('w')
    servidor = subprocess.Popen([sys.executable,'-m','uvicorn','main:app','--host','127.0.0.1','--port',str(url.port)],cwd=ROOT/'backend',env=env,stdout=archivo_servidor,stderr=subprocess.STDOUT)
    disponible=False
    for _ in range(90):
        if servidor.poll() is not None:
            raise RuntimeError('El servidor terminó durante el arranque.')
        try:
            with urllib.request.urlopen(env['SIGEL_QA_URL']+'/api',timeout=2) as r:datos=json.load(r)
            if all(datos['bases']['estado'][k]['disponible'] for k in ('negocio','seguridad')):
                disponible=True;break
        except (OSError,ValueError,KeyError):
            pass
        time.sleep(1)
    if not disponible:
        raise RuntimeError('No se confirmó API y ambas bases en el tiempo de arranque.')
    (SALIDA/'disponibilidad.json').write_text(json.dumps(datos,ensure_ascii=False,indent=2))
    archivos=['test_unitarias.py','test_api_integracion.py','test_pagos_usuarios.py','test_modulos_completos.py']
    etapa('03_pytest',[sys.executable,'-m','pytest',*[str(ROOT/'pruebas/asignacion_2026'/f) for f in archivos],'-v','--tb=short',f'--junitxml={SALIDA / "pytest.xml"}'])
    suite=ET.parse(SALIDA/'pytest.xml').getroot()
    total=sum(int(s.get('tests','0')) for s in suite.findall('testsuite'))
    if total != 102:
        raise RuntimeError(f'Se esperaban 102 casos; se recolectaron {total}.')
    etapa('04_interfaz',[sys.executable,'-m','pytest',str(ROOT/'pruebas/ci/test_interfaz.py'),'-v','--tb=short',f'--junitxml={SALIDA / "interfaz.xml"}',f'--output={SALIDA / "navegador"}','--screenshot=only-on-failure','--tracing=retain-on-failure',*(['--browser-channel',env['SIGEL_QA_BROWSER_CHANNEL']] if env.get('SIGEL_QA_BROWSER_CHANNEL') else [])])
    etapa('05_asistente',['node',str(ROOT/'pruebas/asignacion_2026/reglas_asistente.cjs')])
    resumen['resultado']='aprobado'
except Exception as error:
    resumen['resultado']='fallido';resumen['error']=limpiar(str(error));print(resumen['error'],file=sys.stderr)
finally:
    if servidor is not None:
        servidor.terminate()
        try:servidor.wait(timeout=15)
        except subprocess.TimeoutExpired:servidor.kill();servidor.wait(timeout=10)
    if archivo_servidor is not None:archivo_servidor.close()
    for p in SALIDA.rglob('*'):
        if p.is_file() and p.suffix in ('.xml','.log','.jsonl','.json'):
            s=p.read_text(errors='replace');n=limpiar(s)
            if s!=n:p.write_text(n)
    resumen['fin_utc']=datetime.now(timezone.utc).isoformat();guardar()
    print('Resultado:',resumen['resultado'],'Evidencias:',SALIDA)
raise SystemExit(0 if resumen['resultado']=='aprobado' else 1)
