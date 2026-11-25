"""Pruebas HTTP reales contra SIGEL local y comprobaciones en MySQL.

La autenticación usa el CAPTCHA firmado como dato de prueba controlado,
no valida su resistencia a automatización ni la lectura humana de la imagen.
"""
import base64
import os
import json
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path
import httpx
import pytest
from sqlalchemy import text
from database import SessionLocal
from modelos.asiento_reservado_modelo import AsientoReservado
from modelos.reservas_modelo import Reserva
from modelos.reserva_cliente_modelo import ReservaCliente
from modelos.cliente_modelo import Cliente
from modelos.usuario_modelo import Usuario, hashear_contrasena
from modelos.rol_modelo import Rol
from modelos.punto_recogida_modelo import PuntoRecogida, ClientePuntoRecogida
from modelos.boleto_modelo import Boleto

BASE = os.environ.get('SIGEL_QA_URL','http://127.0.0.1:8000')
DIR = Path(os.environ.get('SIGEL_QA_SALIDA', str(Path(__file__).parent)))
(DIR/'evidencias'/'modulos_18').mkdir(parents=True, exist_ok=True)
DATOS = json.loads(Path(os.environ.get('SIGEL_QA_DATOS', str(Path(__file__).parent.parent/'primer_caso/preparacion.json'))).read_text())
EVIDENCIA = DIR/'evidencias/http.jsonl'
PASSWORD = 'PruebaAcademica2026!'

def pedir(method, ruta, token=None, **kw):
    headers = {'Authorization':'Bearer '+token} if token else {}
    r = httpx.request(method, BASE+ruta, headers=headers, timeout=30, **kw)
    try: cuerpo = r.json()
    except ValueError: cuerpo = r.text[:200]
    if '/auth/' in ruta and isinstance(cuerpo,dict):
        cuerpo = {k:v for k,v in cuerpo.items() if k not in ['token','usuario','imagen']}
    def limpiar(x):
        if isinstance(x,dict):
            return {k:('OMITIDO' if k in ['token','token_operacion','hash_contrasena','contrasena','captcha_token'] else limpiar(v)) for k,v in x.items()}
        if isinstance(x,list): return [limpiar(v) for v in x]
        return x
    cuerpo=limpiar(cuerpo)
    if ruta.startswith('/api/usuarios/') and method=='GET' and isinstance(cuerpo,dict) and 'items' in cuerpo:
        cuerpo={k:v for k,v in cuerpo.items() if k!='items'}
    with EVIDENCIA.open('a') as f:
        f.write(json.dumps({'fecha':datetime.now().astimezone().isoformat(),'metodo':method,'ruta':ruta,'status':r.status_code,'segundos':r.elapsed.total_seconds(),'respuesta':cuerpo},ensure_ascii=False,default=str)+'\n')
    return r

def login(correo, password):
    c=pedir('GET','/api/auth/captcha').json()
    respuesta=base64.urlsafe_b64decode(c['token']).decode().split('|')[0]
    return pedir('POST','/api/auth/login',json={'correo':correo,'contrasena':password,'captcha_token':c['token'],'captcha_respuesta':respuesta})

@pytest.fixture(scope='module')
def usuarios():
    """Completa los datos sintéticos previos; no usa identidades reales."""
    with SessionLocal.begin() as db:
        rol=db.query(Rol).filter(Rol.nombre=='Cliente',Rol.eliminado_en.is_(None)).one()
        for i,p in enumerate(DATOS['pasajeros'],1):
            correo=f'qa.rf01.{i}@example.test'
            u=db.query(Usuario).filter_by(correo=correo).first()
            if not u:
                u=Usuario(rol_id=rol.id,correo=correo,hash_contrasena=hashear_contrasena(PASSWORD),nombre=['Alfa','Beta'][i-1],apellido='Prueba',creado_en=datetime.now(),actualizado_en=datetime.now())
                db.add(u); db.flush()
            cliente=db.get(Cliente,p['cliente_id'])
            cliente.usuario_id=u.id
            # Corrección de preparación: el código válido para pasaporte es P.
            cliente.tipo_documento='P'; cliente.numero_documento=str(990000000+i)
            cliente.telefono='0412000000'+str(i)
            cliente.direccion='Domicilio sintético de prueba académica'
            punto=db.query(PuntoRecogida).filter_by(nombre=f'PRUEBA RF01 {i}').first()
            if not punto:
                punto=PuntoRecogida(nombre=f'PRUEBA RF01 {i}',direccion=cliente.direccion,ciudad='Barquisimeto',estado='Lara',tipo='domicilio',activo=True,creado_en=datetime.now(),actualizado_en=datetime.now())
                db.add(punto); db.flush()
                db.add(ClientePuntoRecogida(cliente_id=cliente.id,punto_recogida_id=punto.id,es_predeterminado=True,creado_en=datetime.now(),actualizado_en=datetime.now()))
            db.get(ReservaCliente,p['pasajero_id']).punto_recogida_id=punto.id
    tokens=[]
    for i in [1,2]:
        r=login(f'qa.rf01.{i}@example.test',PASSWORD)
        assert r.status_code==200, r.text
        tokens.append(r.json()['token'])
    return tokens

@pytest.fixture(scope='module')
def admin():
    # CI utiliza un administrador sintético; conserva el acceso de demo local.
    CORREO = os.environ.get('SIGEL_QA_ADMIN_CORREO', 'admin@travelbqto.com')
    CLAVE = os.environ.get('SIGEL_QA_ADMIN_CLAVE', 'TravelBqto2026')
    r=login(CORREO,CLAVE)
    assert r.status_code==200,r.text
    return r.json()['token']

def vigentes(asiento):
    with SessionLocal() as db:
        return [{'id':x.id,'pasajero':x.reserva_cliente_id} for x in db.query(AsientoReservado).filter_by(viaje_id=DATOS['viaje_id'],asiento_id=asiento,eliminado_en=None).all()]

def test_H01_salud():
    assert pedir('GET','/api').status_code==200

def test_H02_openapi():
    r=pedir('GET','/openapi.json'); assert r.status_code==200
    assert '/api/auth/login' in r.json()['paths']

def test_B01_catalogo_publico():
    r=pedir('GET','/api/catalogo/destinos'); assert r.status_code==200
    assert isinstance(r.json(),(dict,list))

def test_B02_contrasena_invalida(usuarios):
    r=login('qa.rf01.1@example.test','Incorrecta123!')
    assert r.status_code==401
    assert 'Correo o contraseña incorrectos' in r.text

def test_B03_captcha_incorrecto():
    c=pedir('GET','/api/auth/captcha').json()
    r=pedir('POST','/api/auth/login',json={'correo':'qa.rf01.1@example.test','contrasena':PASSWORD,'captcha_token':c['token'],'captcha_respuesta':'XXXXX'})
    assert r.status_code==400

@pytest.mark.parametrize('ruta',['/api/reservas','/api/usuarios/','/api/reservas/portal/mis-reservas'])
def test_B04_sin_token_401(ruta):
    assert pedir('GET',ruta).status_code==401

def test_B05_token_invalido_401():
    assert pedir('GET','/api/auth/perfil','token.invalido.x').status_code==401

def test_B06_cliente_sin_permiso_403(usuarios):
    assert pedir('GET','/api/usuarios/',usuarios[0]).status_code==403

def test_I01_propietario_consulta_reserva(usuarios):
    p=DATOS['pasajeros'][0]
    assert pedir('GET',f"/api/reservas/portal/mis-reservas/{p['reserva_id']}",usuarios[0]).status_code==200

def test_I02_otro_cliente_no_consulta_reserva(usuarios):
    p=DATOS['pasajeros'][1]
    assert pedir('GET',f"/api/reservas/portal/mis-reservas/{p['reserva_id']}",usuarios[0]).status_code in [403,404]

def test_I03_asiento_ocupado_409_sin_duplicado(admin):
    p=DATOS['pasajeros'][1]; a=DATOS['asiento_id']
    antes=vigentes(a)
    assert len(antes)==1 and antes[0]['pasajero']==DATOS['pasajeros'][0]['pasajero_id']
    r=pedir('POST',f"/api/reservas/{p['reserva_id']}/pasajeros/{p['pasajero_id']}/asientos",admin,json={'asiento_id':a})
    despues=vigentes(a)
    (DIR/'evidencias/primer_caso.json').write_text(json.dumps({'caso':'CP-RF01-01','antes':antes,'status':r.status_code,'respuesta':r.json(),'despues':despues},ensure_ascii=False,indent=2))
    assert r.status_code==409
    assert 'Este asiento ya está reservado para este viaje' in r.text
    assert despues==antes

def test_B07_payload_invalido_no_persiste(admin):
    p=DATOS['pasajeros'][1]; antes=vigentes(DATOS['asiento_id'])
    r=pedir('POST',f"/api/reservas/{p['reserva_id']}/pasajeros/{p['pasajero_id']}/asientos",admin,json={'asiento_id':'incorrecto'})
    assert r.status_code==422
    assert vigentes(DATOS['asiento_id'])==antes

def test_I04_boleto_sin_pago_aprobado(usuarios):
    p=DATOS['pasajeros'][0]
    r=pedir('GET',f"/api/reservas/portal/mis-reservas/{p['reserva_id']}/boleto",usuarios[0])
    assert r.status_code==404
    assert 'depósito mínimo' in r.text
    with SessionLocal() as db: assert db.query(Boleto).filter_by(reserva_id=p['reserva_id']).count()==0

def test_I05_concurrencia_mismo_asiento(admin):
    # Segundo asiento libre. Las dos solicitudes arrancan desde una barrera común.
    from modelos.asiento_modelo import Asiento
    with SessionLocal() as db:
        a=db.query(Asiento).filter_by(unidad_id=DATOS['unidad_id'],numero='2',eliminado_en=None).one().id
    # Restauración del fixture exclusivo antes de repetir la medición.
    with SessionLocal.begin() as db:
        existentes=db.query(AsientoReservado).filter_by(viaje_id=DATOS['viaje_id'],asiento_id=a,eliminado_en=None).all()
        for x in existentes:
            assert x.reserva_cliente_id in [p['pasajero_id'] for p in DATOS['pasajeros']]
            x.eliminado_en=datetime.now()
    assert vigentes(a)==[], 'El escenario concurrente requiere el asiento 2 libre.'
    barrera=threading.Barrier(2)
    def asignar(p):
        barrera.wait()
        return pedir('POST',f"/api/reservas/{p['reserva_id']}/pasajeros/{p['pasajero_id']}/asientos",admin,json={'asiento_id':a}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool: estados=list(pool.map(asignar,DATOS['pasajeros']))
    despues=vigentes(a)
    (DIR/'evidencias/concurrencia.json').write_text(json.dumps({'asiento_id':a,'solicitudes':2,'status':estados,'asignaciones_vigentes':despues},indent=2))
    assert sorted(estados)==[200,409]
    assert len(despues)==1

def test_I06_crear_reserva_y_anular_libera_asiento(admin,usuarios):
    """Recorrido por API. El viaje se crea para este caso; no modifica el viaje 16."""
    from datetime import timedelta
    salida=datetime.now()+timedelta(days=10)
    r=pedir('POST','/api/viajes',admin,json={'destino_id':DATOS['destino_id'],'unidad_id':DATOS['unidad_id'],'fecha_salida':salida.isoformat(),'fecha_regreso':(salida+timedelta(hours=8)).isoformat()})
    assert r.status_code==200,r.text
    cuerpo=r.json()
    (DIR/'evidencias/alta_viaje.json').write_text(json.dumps(cuerpo,ensure_ascii=False,indent=2,default=str))
    viaje_id=cuerpo.get('viaje_id') or cuerpo.get('id') or cuerpo.get('viaje',{}).get('id')
    assert viaje_id, cuerpo
    r=pedir('POST','/api/reservas/cliente',usuarios[1],json={'viaje_id':viaje_id,'asientos_ids':[DATOS['asiento_id']]})
    assert r.status_code==200,r.text
    reserva_id=r.json()['reserva_id']
    with SessionLocal() as db:
        vinculados=db.query(ReservaCliente).filter_by(reserva_id=reserva_id,eliminado_en=None).all()
        assert len(vinculados)==1
        pasajero_id=vinculados[0].id
        assert vinculados[0].cliente_id==DATOS['pasajeros'][1]['cliente_id']
        assert db.query(AsientoReservado).filter_by(viaje_id=viaje_id,asiento_id=DATOS['asiento_id'],eliminado_en=None).count()==1
    r=pedir('POST',f'/api/creditos/reservas/{reserva_id}/cancelar',admin,json={'notas':'Anulación del caso académico I06'})
    assert r.status_code==200,r.text
    with SessionLocal() as db:
        estado=db.get(Reserva,reserva_id).estado
        asignaciones=db.query(AsientoReservado).filter_by(viaje_id=viaje_id,asiento_id=DATOS['asiento_id'],eliminado_en=None).count()
    (DIR/'evidencias/anulacion.json').write_text(json.dumps({'viaje_id':viaje_id,'reserva_id':reserva_id,'pasajero_id':pasajero_id,'estado':estado,'asignaciones_vigentes':asignaciones,'respuesta':r.json()},ensure_ascii=False,indent=2))
    assert estado=='cancelada'
    assert asignaciones==0, 'RF-12 exige liberar el asiento al anular.'

def test_I07_reutilizar_asiento_de_reserva_anulada(usuarios):
    anterior=json.loads((DIR/'evidencias/anulacion.json').read_text())
    r=pedir('POST','/api/reservas/cliente',usuarios[0],json={'viaje_id':anterior['viaje_id'],'asientos_ids':[DATOS['asiento_id']]})
    (DIR/'evidencias/reutilizacion.json').write_text(json.dumps({'viaje_id':anterior['viaje_id'],'status':r.status_code,'respuesta':r.json()},ensure_ascii=False,indent=2))
    assert r.status_code==200, 'Un asiento liberado al anular debe poder reservarse de nuevo: '+r.text

def test_I08_baja_logica_libera_sin_borrar_historial(admin):
    datos=json.loads((DIR/'evidencias/reutilizacion.json').read_text())
    reserva_id=datos['respuesta']['reserva_id']
    with SessionLocal() as db:
        p=db.query(ReservaCliente).filter_by(reserva_id=reserva_id).one()
        pasajero=p.id
        assert db.query(AsientoReservado).filter_by(reserva_cliente_id=pasajero,eliminado_en=None).count()==1
    r=pedir('DELETE',f'/api/reservas/{reserva_id}',admin)
    assert r.status_code==200
    with SessionLocal() as db:
        assert db.get(Reserva,reserva_id).eliminado_en is not None
        assert db.query(AsientoReservado).filter_by(reserva_cliente_id=pasajero,eliminado_en=None).count()==0
        assert db.query(AsientoReservado).filter_by(reserva_cliente_id=pasajero).count()==1
