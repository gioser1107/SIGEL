"""Ampliación del 18/11: pagos, boleto, vencimiento y ciclo de usuarios.

Toda tasa añadida por el fixture es sintética, manual, para esta base de
pruebas; no representa una cotización del BCV. Expectativas escritas antes
de ejecutar. Los comprobantes son imágenes sintéticas identificadas.
"""
import base64
import io
import json
import uuid
from datetime import date,datetime,timedelta
from pathlib import Path
import pytest
from PIL import Image,ImageDraw
from sqlalchemy import text
from database import SessionLocal, nombre_bd_seguridad
from modelos.tasa_modelo import Tasa
from modelos.usuario_modelo import Usuario
from modelos.reservas_modelo import Reserva
from modelos.asiento_reservado_modelo import AsientoReservado
from modelos.reserva_cliente_modelo import ReservaCliente
from modelos.pago_modelo import Pago
from test_api_integracion import usuarios,admin,pedir,login,DATOS,PASSWORD,DIR

@pytest.fixture(scope='module')
def catalogos():
    with SessionLocal.begin() as db:
        eur=db.execute(text("SELECT id FROM monedas WHERE codigo='EUR'")).scalar_one()
        tasa=db.query(Tasa).filter_by(moneda_id=eur,fecha=date.today(),eliminado_en=None).first()
        creada=False
        if tasa is None:
            tasa=Tasa(moneda_id=eur,fecha=date.today(),valor=100,origen='manual')
            db.add(tasa);db.flush();creada=True
        zelle=db.execute(text("SELECT id FROM metodos_pago WHERE codigo='zelle' AND eliminado_en IS NULL")).scalar_one()
        cash=db.execute(text("SELECT id FROM metodos_pago WHERE codigo='efectivo_usd' AND eliminado_en IS NULL")).scalar_one()
        movil=db.execute(text("SELECT id FROM metodos_pago WHERE codigo='pago_movil' AND eliminado_en IS NULL")).scalar_one()
        rol=db.execute(text(f"SELECT id FROM `{nombre_bd_seguridad}`.roles WHERE nombre='Cliente' AND eliminado_en IS NULL")).scalar_one()
        ciudad=db.execute(text('SELECT id,estado_id FROM ciudades ORDER BY id LIMIT 1')).mappings().one()
        datos={'tasa_id':tasa.id,'valor':float(tasa.valor),'zelle':zelle,'efectivo':cash,'movil':movil,'rol_cliente':rol,'ciudad_id':ciudad['id'],'estado_id':ciudad['estado_id'],'tasa_sintetica_creada':creada}
    (DIR/'evidencias/catalogos_ampliacion.json').write_text(json.dumps(datos,ensure_ascii=False,indent=2))
    return datos

@pytest.fixture
def escenario(admin,usuarios):
    salida=datetime.now()+timedelta(days=14)
    r=pedir('POST','/api/viajes',admin,json={'destino_id':DATOS['destino_id'],'unidad_id':DATOS['unidad_id'],'fecha_salida':salida.isoformat(),'fecha_regreso':(salida+timedelta(hours=8)).isoformat()})
    assert r.status_code==200,r.text
    viaje=r.json()['viaje']['id']
    r=pedir('POST','/api/reservas/cliente',usuarios[1],json={'viaje_id':viaje,'asientos_ids':[DATOS['asiento_id']]})
    assert r.status_code==200,r.text
    return {'reserva_id':r.json()['reserva_id'],'viaje_id':viaje}

@pytest.fixture(scope='module')
def comprobante(usuarios):
    im=Image.new('RGB',(500,160),'white');draw=ImageDraw.Draw(im)
    draw.text((15,30),'PRUEBA ACADEMICA SIGEL - SIN VALOR BANCARIO',fill='black')
    buff=io.BytesIO();im.save(buff,format='PNG')
    r=pedir('POST','/api/pagos/portal/comprobante/upload',usuarios[1],files={'archivo':('comprobante_prueba.png',buff.getvalue(),'image/png')})
    assert r.status_code==200,r.text
    return r.json()['comprobante_url']

def reportar(escenario,usuarios,catalogos,comprobante,monto=5):
    rid=escenario['reserva_id']
    return pedir('POST',f'/api/reservas/{rid}/pagos/portal/reportar',usuarios[1],json={'metodo_pago_id':catalogos['zelle'],'tasa_id':catalogos['tasa_id'],'monto':monto,'referencia':'QA-'+uuid.uuid4().hex[:12],'comprobante_url':comprobante,'notas':'Pago sintético, sin valor bancario'})

def aprobar(rid,pid,admin):
    ruta=f'/api/reservas/{rid}/pagos/{pid}'
    token=pedir('POST',ruta+'/token-aprobacion',admin)
    assert token.status_code==200,token.text
    r=pedir('POST',ruta+'/aprobar',admin,json={'token_operacion':token.json()['token_operacion']})
    assert r.status_code==200,r.text
    return r

@pytest.mark.parametrize('monto',[-1,0])
def test_P01_monto_no_positivo_no_persiste(escenario,usuarios,catalogos,comprobante,monto):
    r=reportar(escenario,usuarios,catalogos,comprobante,monto)
    assert r.status_code==422
    with SessionLocal() as db:assert db.query(Pago).filter_by(reserva_id=escenario['reserva_id']).count()==0

@pytest.mark.parametrize('monto',[4,21])
def test_P02_deposito_insuficiente_o_exceso_rechazado(escenario,usuarios,catalogos,comprobante,monto):
    r=reportar(escenario,usuarios,catalogos,comprobante,monto)
    assert r.status_code==400,r.text
    with SessionLocal() as db:assert db.query(Pago).filter_by(reserva_id=escenario['reserva_id']).count()==0

def test_P03_pago_validacion_aprobacion_y_boleto(escenario,usuarios,catalogos,comprobante,admin):
    rid=escenario['reserva_id'];r=reportar(escenario,usuarios,catalogos,comprobante)
    assert r.status_code==200,r.text
    pago=r.json()['pago'];pid=pago['id'];assert pago['estado']=='en_validacion'
    assert pedir('GET',f'/api/reservas/portal/mis-reservas/{rid}/boleto',usuarios[1]).status_code==404
    r=pedir('POST',f'/api/reservas/{rid}/pagos/{pid}/aprobar',admin,json={'token_operacion':'invalido-para-este-pago'})
    assert r.status_code==403
    r=aprobar(rid,pid,admin);assert r.json()['pago']['estado']=='aprobado'
    r=pedir('GET',f'/api/reservas/portal/mis-reservas/{rid}/boleto',usuarios[1]);assert r.status_code==200
    assert r.json()['boleto']['integridad']['valida'] is True
    resumen=pedir('GET',f'/api/reservas/{rid}/pagos/resumen',admin).json()
    assert resumen['total_pagado_aprobado_eur']==5 and resumen['saldo_pendiente_eur']==15
    (DIR/'evidencias/pago_boleto_aprobado.json').write_text(json.dumps({'reserva_id':rid,'pago_id':pid,'resumen':resumen,'boleto':r.json()},ensure_ascii=False,indent=2))

def test_P04_rechazo_no_reduce_saldo_y_permite_reintento(escenario,usuarios,catalogos,comprobante,admin):
    rid=escenario['reserva_id'];r=reportar(escenario,usuarios,catalogos,comprobante);assert r.status_code==200
    pid=r.json()['pago']['id'];r=pedir('POST',f'/api/reservas/{rid}/pagos/{pid}/rechazar',admin,json={'notas':'Rechazo sintético de prueba'})
    assert r.status_code==200 and r.json()['pago']['estado']=='rechazado'
    resumen=pedir('GET',f'/api/reservas/{rid}/pagos/resumen',admin).json()
    assert resumen['total_pagado_aprobado_eur']==0 and resumen['saldo_pendiente_eur']==20
    assert reportar(escenario,usuarios,catalogos,comprobante).status_code==200

def test_P05_pago_total_admin_y_consultas(escenario,usuarios,catalogos,admin):
    rid=escenario['reserva_id']
    r=pedir('POST',f'/api/reservas/{rid}/pagos',admin,json={'metodo_pago_id':catalogos['efectivo'],'tasa_id':catalogos['tasa_id'],'monto':20,'tipo':'total','notas':'Pago total sintético'})
    assert r.status_code==200,r.text
    pago=r.json()['pago'];assert pago['estado']=='aprobado'
    rutas=[(f'/api/reservas/{rid}/pagos',admin),(f'/api/reservas/{rid}/pagos/{pago["id"]}',admin),(f'/api/reservas/{rid}/pagos/portal',usuarios[1]),(f'/api/reservas/{rid}/pagos/portal/{pago["id"]}',usuarios[1]),('/api/pagos/portal/mis-pagos',usuarios[1]),('/api/pagos?reserva_id='+str(rid),admin),('/api/pagos/catalogo',admin)]
    for ruta,token in rutas:assert pedir('GET',ruta,token).status_code==200,ruta
    resumen=pedir('GET',f'/api/reservas/{rid}/pagos/resumen',admin).json()
    assert resumen['saldo_pendiente_eur']==0 and resumen['pagado_completo'] is True
    assert pedir('GET',f'/api/reservas/portal/mis-reservas/{rid}/boleto',usuarios[1]).status_code==200

def test_P06_pago_ajeno_y_aprobacion_cliente_denegados(escenario,usuarios,catalogos,comprobante):
    rid=escenario['reserva_id'];r=reportar(escenario,usuarios,catalogos,comprobante);assert r.status_code==200
    pid=r.json()['pago']['id']
    assert pedir('GET',f'/api/reservas/{rid}/pagos/portal/{pid}',usuarios[0]).status_code==403
    assert pedir('POST',f'/api/reservas/{rid}/pagos/{pid}/aprobar',usuarios[1],json={'token_operacion':'invalido-para-este-pago'}).status_code==403

def test_P07_cotizacion_bolivares_y_saldo_portal(escenario,usuarios,catalogos):
    rid=escenario['reserva_id']
    r=pedir('GET',f'/api/reservas/{rid}/pagos/portal/cotizar?monto_eur=5&metodo_pago_id={catalogos["movil"]}&tasa_id={catalogos["tasa_id"]}',usuarios[1])
    assert r.status_code==200,r.text
    assert r.json()['monto']==round(5*catalogos['valor'],2)
    r=pedir('GET',f'/api/reservas/{rid}/pagos/portal/resumen',usuarios[1]);assert r.status_code==200
    assert r.json()['resumen']['saldo_pendiente_eur']==20

def test_P08_edicion_referencia_sin_cambiar_saldo(escenario,usuarios,catalogos,comprobante,admin):
    rid=escenario['reserva_id'];r=reportar(escenario,usuarios,catalogos,comprobante);assert r.status_code==200
    pid=r.json()['pago']['id']
    r=pedir('PUT',f'/api/reservas/{rid}/pagos/{pid}',admin,json={'referencia':'QA-REFERENCIA-CORREGIDA','tipo':'cuota','fecha_pago':date.today().isoformat(),'telefono_origen':'04120000001','correo_origen':'prueba@example.test','comprobante_url':comprobante,'notas':'Corrección de datos sintéticos'})
    assert r.status_code==200,r.text
    assert r.json()['pago']['referencia']=='QA-REFERENCIA-CORREGIDA'
    assert pedir('GET',f'/api/reservas/{rid}/pagos/resumen',admin).json()['saldo_pendiente_eur']==20

def test_P09_retirar_pago_aprobado_invalida_boleto(escenario,usuarios,catalogos,comprobante,admin):
    rid=escenario['reserva_id'];r=reportar(escenario,usuarios,catalogos,comprobante);assert r.status_code==200
    pid=r.json()['pago']['id'];aprobar(rid,pid,admin)
    assert pedir('GET',f'/api/reservas/portal/mis-reservas/{rid}/boleto',usuarios[1]).status_code==200
    assert pedir('DELETE',f'/api/reservas/{rid}/pagos/{pid}',admin).status_code==200
    r=pedir('GET',f'/api/reservas/portal/mis-reservas/{rid}/boleto',usuarios[1])
    (DIR/'evidencias/retiro_pago_boleto.json').write_text(json.dumps({'reserva_id':rid,'pago_id':pid,'status_boleto':r.status_code,'respuesta':r.json()},ensure_ascii=False,indent=2))
    assert r.status_code==404,'Sin pagos aprobados el boleto no debe continuar emitido.'

def test_P10_vencimiento_rechazo_libera_asiento(escenario,usuarios,catalogos,comprobante,admin):
    rid=escenario['reserva_id'];r=reportar(escenario,usuarios,catalogos,comprobante);assert r.status_code==200
    pid=r.json()['pago']['id'];assert pedir('POST',f'/api/reservas/{rid}/pagos/{pid}/rechazar',admin,json={'notas':'Prueba de vencimiento'}).status_code==200
    with SessionLocal.begin() as db:
        reserva=db.get(Reserva,rid);assert reserva.plazo_correccion_hasta is not None
        reserva.plazo_correccion_hasta=datetime.now()-timedelta(minutes=1)
    assert pedir('GET','/api/reservas/portal/mis-reservas',usuarios[1]).status_code==200
    with SessionLocal() as db:
        estado=db.get(Reserva,rid).estado
        cantidad=db.query(AsientoReservado).filter_by(viaje_id=escenario['viaje_id'],eliminado_en=None).count()
    (DIR/'evidencias/vencimiento_pago.json').write_text(json.dumps({'reserva_id':rid,'estado':estado,'asignaciones_vigentes':cantidad,'metodo':'Precondición temporal controlada en BD, no espera real de 24 horas.'},ensure_ascii=False,indent=2))
    assert estado=='cancelada' and cantidad==0

def test_P11_reserva_economica_exige_pago_aprobado(escenario,usuarios,catalogos,comprobante,admin):
    rid=escenario['reserva_id']
    with SessionLocal.begin() as db:
        db.query(ReservaCliente).filter_by(reserva_id=rid).one().precio_pasajero_eur=4
    r=reportar(escenario,usuarios,catalogos,comprobante,monto=4);assert r.status_code==200
    pid=r.json()['pago']['id']
    r=pedir('GET',f'/api/reservas/portal/mis-reservas/{rid}/boleto',usuarios[1])
    assert r.status_code==404,'Una reserva de 4 EUR también exige aprobar el pago antes de emitir boleto.'
    aprobar(rid,pid,admin)
    assert pedir('GET',f'/api/reservas/portal/mis-reservas/{rid}/boleto',usuarios[1]).status_code==200

def test_Y01_ciclo_usuario_y_revocacion(admin,catalogos):
    correo='qa.ciclo.'+uuid.uuid4().hex[:10]+'@example.test'
    r=pedir('POST','/api/usuarios/',admin,json={'nombre':'Gamma','apellido':'Prueba','correo':correo,'contrasena':PASSWORD,'rol_id':catalogos['rol_cliente'],'telefono':'04120000003'})
    assert r.status_code==200,r.text
    uid=r.json()['usuario']['id'];r=login(correo,PASSWORD);assert r.status_code==200;token=r.json()['token']
    assert pedir('GET',f'/api/usuarios/{uid}',token).status_code==200
    r=pedir('PUT','/api/usuarios/mi-perfil',token,json={'nombre':'Gamma','apellido':'Ensayo','telefono':'04120000004'});assert r.status_code==200
    r=pedir('PUT','/api/usuarios/mi-contrasena',token,json={'contrasena_actual':'Incorrecta123!','contrasena_nueva':'CambioPrueba2026!'});assert r.status_code==400
    r=pedir('PUT','/api/usuarios/mi-contrasena',token,json={'contrasena_actual':PASSWORD,'contrasena_nueva':'CambioPrueba2026!'});assert r.status_code==200
    assert login(correo,PASSWORD).status_code==401
    assert login(correo,'CambioPrueba2026!').status_code==200
    assert pedir('PUT',f'/api/usuarios/{uid}',admin,json={'nombre':'Delta','apellido':'Prueba','telefono':'04120000005'}).status_code==200
    assert pedir('PUT',f'/api/usuarios/{uid}/contrasena',admin,json={'contrasena_nueva':'Restablecida2026!'}).status_code==200
    r=login(correo,'Restablecida2026!');assert r.status_code==200;token=r.json()['token']
    assert pedir('DELETE',f'/api/usuarios/{uid}',admin).status_code==200
    assert login(correo,'Restablecida2026!').status_code==401
    assert pedir('GET','/api/auth/perfil',token).status_code==401

def test_Y02_registro_portal_y_duplicados(catalogos):
    correo='qa.registro.'+uuid.uuid4().hex[:10]+'@example.test'
    def registro(datos):
        c=pedir('GET','/api/auth/captcha').json();respuesta=base64.urlsafe_b64decode(c['token']).decode().split('|')[0]
        return pedir('POST','/api/auth/registro',json={**datos,'captcha_token':c['token'],'captcha_respuesta':respuesta})
    datos={'nombre':'Epsilon','apellido':'Prueba','correo':correo,'contrasena':PASSWORD,'tipo_documento':'P','numero_documento':str(500000000+int(uuid.uuid4().hex[:8],16)%400000000),'telefono':'04120000006','direccion':'Dirección sintética del registro académico','estado_id':catalogos['estado_id'],'ciudad_id':catalogos['ciudad_id'],'puntos_recogida':[{'nombre':'Domicilio de prueba','direccion':'Dirección sintética de prueba','ciudad':'Barquisimeto','estado':'Lara','notas_referencia':'Sin valor real'}]}
    r=registro(datos);assert r.status_code==200,r.text
    assert login(correo,PASSWORD).status_code==200
    assert registro(datos).status_code==400
    datos['correo']='qa.duplicado.'+uuid.uuid4().hex[:8]+'@example.test'
    assert registro(datos).status_code==400

@pytest.mark.parametrize('filtro',['todos','sistema','clientes'])
def test_Y03_listado_paginado(admin,filtro):
    r=pedir('GET',f'/api/usuarios/?filtro={filtro}&limite=1',admin);assert r.status_code==200
    assert len(r.json()['items'])<=1 and r.json()['limite']==1

def test_R01_reserva_administrativa_pasajeros_y_liberacion(admin,usuarios):
    salida=datetime.now()+timedelta(days=16)
    r=pedir('POST','/api/viajes',admin,json={'destino_id':DATOS['destino_id'],'unidad_id':DATOS['unidad_id'],'fecha_salida':salida.isoformat(),'fecha_regreso':(salida+timedelta(hours=8)).isoformat()});assert r.status_code==200
    viaje=r.json()['viaje']['id']
    r=pedir('POST','/api/reservas',admin,json={'cliente_id':DATOS['pasajeros'][0]['cliente_id'],'viaje_id':viaje});assert r.status_code==200,r.text
    rid=r.json()['reserva']['id'];pasajeros=[]
    for p in DATOS['pasajeros']:
        r=pedir('POST',f'/api/reservas/{rid}/pasajeros',admin,json={'cliente_id':p['cliente_id'],'precio_pasajero_eur':20})
        assert r.status_code==200,r.text
    r=pedir('GET',f'/api/reservas/{rid}/pasajeros',admin);assert r.status_code==200
    datos=r.json();pasajeros=datos if isinstance(datos,list) else datos.get('pasajeros',datos.get('items',[]))
    assert len(pasajeros)==2
    ids=[p['id'] for p in pasajeros]
    for p,numero in zip(ids,[DATOS['asiento_id'],DATOS['asiento_id']+1]):
        assert pedir('POST',f'/api/reservas/{rid}/pasajeros/{p}/asientos',admin,json={'asiento_id':numero}).status_code==200
    r=pedir('POST',f'/api/reservas/{rid}/pasajeros',admin,json={'cliente_id':DATOS['pasajeros'][0]['cliente_id'],'precio_pasajero_eur':20});assert r.status_code==400
    r=pedir('PUT',f'/api/reservas/{rid}',admin,json={'modalidad':'grupo','tipo_hospedaje':'compartido'});assert r.status_code==200
    r=pedir('PUT',f'/api/reservas/{rid}/pasajeros/{ids[0]}',admin,json={'precio_pasajero_eur':22,'recargo_eur':0,'notas_tarifa':'Tarifa sintética de prueba','es_menor':False,'ocupa_asiento':True});assert r.status_code==200,r.text
    with SessionLocal() as db:
        assert db.get(Reserva,rid).modalidad=='grupo'
        assert float(db.get(ReservaCliente,ids[0]).precio_pasajero_eur)==22
    r=pedir('GET',f'/api/reservas/{rid}/pasajeros/{ids[0]}/asientos',admin);assert r.status_code==200
    asignacion=r.json()[0]['id']
    assert pedir('DELETE',f'/api/reservas/{rid}/pasajeros/{ids[0]}/asientos/{asignacion}',admin).status_code==200
    assert pedir('DELETE',f'/api/reservas/{rid}/pasajeros/{ids[1]}',admin).status_code==200
    with SessionLocal() as db:
        assert db.query(AsientoReservado).filter_by(viaje_id=viaje,eliminado_en=None).count()==0
        assert db.get(ReservaCliente,ids[1]).eliminado_en is not None
