"""Pruebas por módulo: expectativas definidas antes de ejecutar.
Solo crea/edita registros sintéticos identificados QA; la restauración no toca
las bases de trabajo. Cada flujo comprueba persistencia y reglas de negocio.
"""
import json,uuid,random,gzip
from datetime import datetime,timedelta,date
from pathlib import Path
import pytest
from sqlalchemy import text
from database import SessionLocal, nombre_bd_seguridad
from test_api_integracion import usuarios,admin,pedir,login,DATOS,PASSWORD,DIR
from test_pagos_usuarios import escenario,catalogos,comprobante,reportar,aprobar

PLAN=[]
def caso(id,modulo,rf,esperado):
    def dec(f):
        f.sigel_caso={'id':id,'modulo':modulo,'requisito':rf,'objetivo':f.__name__.split('_',2)[-1].replace('_',' '),'esperado':esperado}
        PLAN.append(f.sigel_caso)
        return f
    return dec

def ok(r,status=200):
    assert r.status_code==status,f'{r.request.method} {r.request.url.path}: {r.status_code} {r.text[:500]}'
    return r.json()

def items(datos):return datos if isinstance(datos,list) else datos.get('items',[])
def nuevo(texto='QA') :return texto+'-'+uuid.uuid4().hex[:8]
def uid(d,clave):
    if clave in d:return d[clave]['id'] if isinstance(d[clave],dict) else d[clave]
    return d['id']

@pytest.fixture
def destino_qa(admin):
    d=ok(pedir('POST','/api/destinos',admin,json={'nombre':nuevo('QA Destino'),'descripcion':'Destino sintético académico','precio_base_eur':20}))
    return uid(d,'destino')

@caso('D01','Destinos','RF-04.1 / RF-04.2','Crear, consultar, editar, publicar y dar de baja un destino sin dependencias; persistencia coherente.')
def test_D01_ciclo_destino(admin):
    nombre=nuevo('QA Destino');d=ok(pedir('POST','/api/destinos',admin,json={'nombre':nombre,'descripcion':'Ensayo académico','precio_base_eur':20}));id=uid(d,'destino')
    assert ok(pedir('GET',f'/api/destinos/{id}',admin))['destino']['nombre']==nombre
    ok(pedir('PUT',f'/api/destinos/{id}',admin,json={'descripcion':'Descripción corregida QA','precio_base_eur':25}))
    d=ok(pedir('GET',f'/api/destinos/{id}',admin))['destino'];assert float(d['precio_base_eur'])==25
    assert any(x['id']==id for x in items(ok(pedir('GET','/api/catalogo/destinos'))))
    ok(pedir('DELETE',f'/api/destinos/{id}',admin));assert pedir('GET',f'/api/destinos/{id}',admin).status_code==404
    with SessionLocal() as db:assert db.execute(text('SELECT eliminado_en FROM destinos WHERE id=:id'),{'id':id}).scalar_one() is not None

@caso('D02','Destinos','RF-04.3','Destino con viaje activo no se anula ni pierde su registro.')
def test_D02_bloqueo_destino_con_viaje(admin,destino_qa):
    salida=datetime.now()+timedelta(days=20)
    v=ok(pedir('POST','/api/viajes',admin,json={'destino_id':destino_qa,'unidad_id':DATOS['unidad_id'],'fecha_salida':salida.isoformat(),'fecha_regreso':(salida+timedelta(hours=4)).isoformat()}))
    assert pedir('DELETE',f'/api/destinos/{destino_qa}',admin).status_code in [400,409]
    ok(pedir('GET',f'/api/destinos/{destino_qa}',admin))

@caso('D03','Destinos','RF-04 / RNF-10','Precio negativo rechazado 422; no se crea destino.')
def test_D03_precio_negativo(admin):
    nombre=nuevo('QA Invalido')
    assert pedir('POST','/api/destinos',admin,json={'nombre':nombre,'precio_base_eur':-1}).status_code==422
    with SessionLocal() as db:assert db.execute(text('SELECT count(*) FROM destinos WHERE nombre=:n'),{'n':nombre}).scalar_one()==0

@caso('F01','Flota y asientos','RF-16','Unidad con placa única, croquis y asiento persistidos; duplicado rechazado; baja lógica.')
def test_F01_ciclo_flota_croquis_asiento(admin):
    placa='QA'+uuid.uuid4().hex[:5].upper();d=ok(pedir('POST','/api/unidades',admin,json={'placa':placa,'modelo':'Unidad QA','capacidad':2}));id=d['unidad_id']
    assert pedir('POST','/api/unidades',admin,json={'placa':placa,'capacidad':2}).status_code==400
    ok(pedir('PUT',f'/api/unidades/{id}/croquis',admin,json={'filas':2,'columnas':2,'celdas':[]}))
    a=ok(pedir('POST','/api/asientos',admin,json={'unidad_id':id,'numero':'1','fila':0,'columna':0,'posicion':'ventana'}))['asiento_id']
    assert any(x['id']==a for x in items(ok(pedir('GET',f'/api/asientos?unidad_id={id}',admin))))
    assert pedir('POST','/api/asientos',admin,json={'unidad_id':id,'numero':'1','fila':0,'columna':1}).status_code==400
    ok(pedir('PUT',f'/api/asientos/{a}',admin,json={'numero':'2','fila':1,'columna':1}))
    assert pedir('PUT',f'/api/unidades/{id}/croquis',admin,json={'filas':1,'columnas':1,'celdas':[]}).status_code==400
    ok(pedir('PUT',f'/api/unidades/{id}',admin,json={'modelo':'Unidad QA editada'}));assert ok(pedir('GET',f'/api/unidades/{id}',admin))['modelo']=='Unidad QA editada'
    ok(pedir('DELETE',f'/api/asientos/{a}',admin));ok(pedir('DELETE',f'/api/unidades/{id}',admin));assert pedir('GET',f'/api/unidades/{id}',admin).status_code==404

@caso('F02','Flota y asientos','RF-16 / RNF-10','Capacidad cero y negativa rechazadas sin crear unidades.')
@pytest.mark.parametrize('capacidad',[0,-1])
def test_F02_capacidad_invalida(admin,capacidad):
    assert pedir('POST','/api/unidades',admin,json={'placa':'QA'+uuid.uuid4().hex[:5].upper(),'capacidad':capacidad}).status_code in [400,422]

@caso('C01','Clientes','RF-11','Alta y búsqueda por documento; duplicado rechazado; contacto actualizado; baja lógica conserva fila.')
def test_C01_ciclo_cliente(admin,catalogos):
    numero=str(random.randint(500000000,900000000));body={'nombre':'Prueba','apellido':'Academica','tipo_documento':'P','numero_documento':numero,'telefono':'04120000001','direccion':'Domicilio QA','contacto_emergencia_nombre':'Contacto Prueba','contacto_emergencia_telefono':'04120000003','estado_id':catalogos['estado_id'],'ciudad_id':catalogos['ciudad_id']}
    d=ok(pedir('POST','/api/clientes/',admin,json=body));id=uid(d,'cliente')
    assert pedir('POST','/api/clientes/',admin,json=body).status_code in [400,409]
    d=ok(pedir('GET',f'/api/clientes/buscar-por-documento?tipo_documento=P&numero_documento={numero}',admin));assert str(id) in json.dumps(d)
    ok(pedir('PUT',f'/api/clientes/{id}',admin,json={'telefono':'04120000002','contacto_emergencia_nombre':'Contacto Prueba','contacto_emergencia_telefono':'04120000003'}))
    assert '04120000002' in json.dumps(ok(pedir('GET',f'/api/clientes/{id}',admin)))
    ok(pedir('DELETE',f'/api/clientes/{id}',admin))
    with SessionLocal() as db:assert db.execute(text('SELECT eliminado_en FROM clientes WHERE id=:id'),{'id':id}).scalar_one() is not None

@caso('RC01','Puntos de recogida','RF-07.3 / RF-14.3','Cliente crea/edita su domicilio; otro cliente no puede editarlo; predeterminado y baja coherentes.')
def test_RC01_domicilio_propio_y_ajeno(usuarios):
    base='/api/clientes/mi-perfil/puntos-recogida'
    d=ok(pedir('POST',base,usuarios[0],json={'nombre':nuevo('QA Recogida'),'direccion':'Domicilio QA','ciudad':'Barquisimeto','estado':'Lara','es_predeterminado':False}));ps=items(ok(pedir('GET',base,usuarios[0])))
    id=max(x.get('punto_recogida_id',x.get('id')) for x in ps)
    assert pedir('PUT',f'{base}/{id}',usuarios[1],json={'direccion':'No debe cambiar'}).status_code in [403,404]
    ok(pedir('PUT',f'{base}/{id}',usuarios[0],json={'direccion':'Domicilio corregido QA'}))
    ok(pedir('PUT',f'{base}/{id}/predeterminado',usuarios[0]))
    assert 'Domicilio corregido QA' in json.dumps(ok(pedir('GET',base,usuarios[0])))
    ok(pedir('DELETE',f'{base}/{id}',usuarios[0]))
    assert id not in [x.get('punto_recogida_id',x.get('id')) for x in items(ok(pedir('GET',base,usuarios[0])))]

@caso('CT01','Cotizaciones','RF-05','Líneas calculan 2×10=20; editar 3×10=30; agregar 5 total35; borrar vuelve30; baja lógica.')
def test_CT01_cotizacion_lineas_totales(admin):
    d=ok(pedir('POST','/api/cotizaciones',admin,json={'cliente_id':DATOS['pasajeros'][0]['cliente_id'],'destino_id':DATOS['destino_id'],'requisitos':'QA cotización','valida_hasta':(datetime.now()+timedelta(days=3)).isoformat(),'modalidad':'individual','lineas':[{'concepto':'Servicio QA','cantidad':2,'precio_unitario_eur':10}]}));id=uid(d,'cotizacion');base=f'/api/cotizaciones/{id}'
    d=ok(pedir('GET',base,admin));assert '20' in json.dumps(d)
    ls=items(ok(pedir('GET',base+'/lineas',admin)));linea=ls[0]['id']
    ok(pedir('PUT',base+f'/lineas/{linea}',admin,json={'cantidad':3}));res=ok(pedir('GET',base+'/lineas/resumen',admin));assert res['total_eur']==30
    d=ok(pedir('POST',base+'/lineas',admin,json={'concepto':'Extra QA','cantidad':1,'precio_unitario_eur':5}));extra=uid(d,'linea')
    res=ok(pedir('GET',base+'/lineas/resumen',admin));assert res['total_eur']==35
    ok(pedir('DELETE',base+f'/lineas/{extra}',admin));ok(pedir('PUT',base,admin,json={'requisitos':'QA corregida'}))
    ok(pedir('DELETE',base,admin));assert pedir('GET',base,admin).status_code==404

@caso('CT02','Cotizaciones','RF-05 / RF-14','Cliente solicita y consulta su cotización; otro cliente no la ve y no puede fijarse precio.')
def test_CT02_solicitud_cliente_y_propiedad(usuarios):
    d=ok(pedir('POST','/api/cotizaciones',usuarios[0],json={'destino_id':DATOS['destino_id'],'requisitos':'Solicitud sintética QA','modalidad':'grupo'}));id=uid(d,'cotizacion');base=f'/api/cotizaciones/{id}'
    ok(pedir('GET',base,usuarios[0]));assert pedir('GET',base,usuarios[1]).status_code in [403,404]
    assert pedir('PUT',base,usuarios[0],json={'precio_cotizado_eur':1}).status_code==403
    ok(pedir('PUT',base,usuarios[0],json={'estado':'cancelada'}))

@caso('PL01','Planificación de viajes','RF-18 / RF-06','Costos 10+5=15; edición y baja recalculan; viaje editado y anulado sin reservas.')
def test_PL01_viaje_costos(admin,destino_qa):
    salida=datetime.now()+timedelta(days=21)
    id=ok(pedir('POST','/api/viajes',admin,json={'destino_id':destino_qa,'unidad_id':DATOS['unidad_id'],'fecha_salida':salida.isoformat(),'fecha_regreso':(salida+timedelta(hours=8)).isoformat()}))['viaje']['id'];base=f'/api/viajes/{id}'
    c=ok(pedir('POST',base+'/costos',admin,json={'categoria':'combustible','monto_eur':10,'descripcion':'Costo QA'}));cid=uid(c,'costo')
    d=ok(pedir('POST',base+'/costos',admin,json={'categoria':'otro','monto_eur':5,'descripcion':'Extra QA'}));cid2=uid(d,'costo')
    resumen=ok(pedir('GET',base+'/costos/resumen',admin));assert resumen['total_eur']==15
    ok(pedir('PUT',base+f'/costos/{cid}',admin,json={'monto_eur':20}));assert ok(pedir('GET',base+'/costos/resumen',admin))['total_eur']==25
    ok(pedir('DELETE',base+f'/costos/{cid2}',admin));assert ok(pedir('GET',base+'/costos/resumen',admin))['total_eur']==20
    ok(pedir('PUT',base,admin,json={'fecha_regreso':(salida+timedelta(hours=9)).isoformat()}));ok(pedir('GET',base+'/reporte',admin));ok(pedir('DELETE',base,admin));assert pedir('GET',base,admin).status_code==404

@caso('PL02','Planificación de viajes','RF-18.3','Viaje con reserva activa no se anula y la reserva permanece.')
def test_PL02_bloqueo_viaje_con_reserva(admin,escenario):
    assert pedir('DELETE',f'/api/viajes/{escenario["viaje_id"]}',admin).status_code in [400,409]
    ok(pedir('GET',f'/api/viajes/{escenario["viaje_id"]}',admin))

@caso('PL03','Planificación de viajes','RF-18 / RNF-10','Regreso anterior a salida rechazado sin crear viaje.')
def test_PL03_fechas_invertidas(admin):
    salida=datetime.now()+timedelta(days=22)
    assert pedir('POST','/api/viajes',admin,json={'destino_id':DATOS['destino_id'],'unidad_id':DATOS['unidad_id'],'fecha_salida':salida.isoformat(),'fecha_regreso':(salida-timedelta(hours=1)).isoformat()}).status_code in [400,422]

@caso('RC02','Puntos de recogida','RF-07.1 / RF-07.2','Parada de pasajero propio del viaje se guarda en orden; ajeno rechazado.')
def test_RC02_ruta_viaje(admin,escenario):
    vid=escenario['viaje_id'];rid=escenario['reserva_id']
    with SessionLocal() as db:pid=db.execute(text('SELECT id FROM reserva_clientes WHERE reserva_id=:id AND eliminado_en IS NULL'),{'id':rid}).scalar_one()
    base=f'/api/viajes/{vid}/ruta-recogida';ok(pedir('GET',base+'/candidatos',admin))
    ok(pedir('PUT',base,admin,json={'paradas':[{'reserva_cliente_id':pid,'orden':1,'notas':'Parada QA'}]}));assert str(pid) in json.dumps(ok(pedir('GET',base,admin)),ensure_ascii=False)
    assert pedir('PUT',base,admin,json={'paradas':[{'reserva_cliente_id':DATOS['pasajeros'][0]['pasajero_id'],'orden':1}]}).status_code in [400,404]

@caso('AB01','Abordaje','RF-03','Manifiesto contiene pasajero; abordado/no presentado individual/lote; anulación vuelve pendiente.')
def test_AB01_ciclo_abordaje(admin,escenario,usuarios,catalogos,comprobante):
    rid=escenario['reserva_id'];rep=reportar(escenario,usuarios,catalogos,comprobante);pidp=ok(rep)['pago']['id'];aprobar(rid,pidp,admin)
    vid=escenario['viaje_id'];rid=escenario['reserva_id']
    with SessionLocal() as db:pid=db.execute(text('SELECT id FROM reserva_clientes WHERE reserva_id=:id AND eliminado_en IS NULL'),{'id':rid}).scalar_one()
    base=f'/api/abordajes/viajes/{vid}';assert str(pid) in json.dumps(ok(pedir('GET',base+'/manifiesto',admin)))
    d=ok(pedir('PUT',base+f'/pasajeros/{pid}',admin,json={'estado':'abordado','notas':'Ensayo QA'}));id=uid(d,'abordaje')
    assert 'abordado' in json.dumps(ok(pedir('GET',f'/api/abordajes/{id}',admin)))
    ok(pedir('POST',base+'/registrar-lote',admin,json={'registros':[{'reserva_cliente_id':pid,'estado':'no_presentado'}]}));assert 'no_presentado' in json.dumps(ok(pedir('GET',base+'/manifiesto',admin)))
    ok(pedir('DELETE',f'/api/abordajes/{id}',admin));assert 'pendiente' in json.dumps(ok(pedir('GET',base+'/manifiesto',admin)))

@caso('AB02','Abordaje','RF-03 / RNF-10','Estado inválido rechazado422 y no se crea abordaje.')
def test_AB02_estado_invalido(admin,escenario):
    assert pedir('PUT',f'/api/abordajes/viajes/{escenario["viaje_id"]}/pasajeros/{DATOS["pasajeros"][0]["pasajero_id"]}',admin,json={'estado':'inexistente'}).status_code==422

@caso('OP01','Operación e incidencias','RF-26.3','Registrar incidencia, consultar contenido y dar baja sin perder historial.')
def test_OP01_incidencia_viaje(admin,escenario):
    base=f'/api/viajes/{escenario["viaje_id"]}/incidencias';desc=nuevo('Retraso académico')
    d=ok(pedir('POST',base,admin,json={'tipo':'retraso','descripcion':desc}));id=d['incidencia']['id'];assert desc in json.dumps(ok(pedir('GET',base,admin)),ensure_ascii=False)
    ok(pedir('DELETE',base+f'/{id}',admin));assert desc not in json.dumps(ok(pedir('GET',base,admin)),ensure_ascii=False)

@caso('RE01','Reseñas','RF-08','Viaje futuro no reseñable; viaje terminado por precondición controlada admite1–5; moderación oculta y elimina.')
def test_RE01_ciclo_resena(admin,usuarios,escenario):
    rid=escenario['reserva_id'];vid=escenario['viaje_id'];body={'reserva_id':rid,'calificacion':4,'comentario':'Reseña académica sintética'}
    assert pedir('POST','/api/resenas',usuarios[1],json=body).status_code==400
    with SessionLocal.begin() as db:db.execute(text('UPDATE viajes SET fecha_salida=:a,fecha_regreso=:b WHERE id=:id'),{'id':vid,'a':datetime.now()-timedelta(days=2),'b':datetime.now()-timedelta(days=1)})
    id=ok(pedir('POST','/api/resenas',usuarios[1],json=body))['resena']['id']
    assert pedir('POST','/api/resenas',usuarios[1],json=body).status_code==400
    assert pedir('GET',f'/api/resenas/mi-resena?reserva_id={rid}',usuarios[0]).status_code==403
    assert str(id) in json.dumps(ok(pedir('GET','/api/resenas/publicas')))
    ok(pedir('PATCH',f'/api/resenas/{id}/visibilidad',admin));assert id not in [x['id'] for x in items(ok(pedir('GET','/api/resenas/publicas')))]
    ok(pedir('DELETE',f'/api/resenas/{id}',admin))

@caso('RE02','Reseñas','RF-08.2','Calificaciones0y6 rechazadas422 sin persistencia.')
@pytest.mark.parametrize('nota',[0,6])
def test_RE02_limite_calificacion(usuarios,nota):
    assert pedir('POST','/api/resenas',usuarios[0],json={'reserva_id':DATOS['pasajeros'][0]['reserva_id'],'calificacion':nota}).status_code==422

@caso('RP01','Reportes','RF-15.1 / RF-15.3','Periodo válido200; rango invertido y año imposible400.')
def test_RP01_rangos_reporte(admin):
    ok(pedir('GET','/api/reportes/estadisticos?desde=2026-11-01&hasta=2026-11-18',admin))
    assert pedir('GET','/api/reportes/estadisticos?desde=2026-11-18&hasta=2026-11-01',admin).status_code==400
    assert pedir('GET','/api/reportes/estadisticos?desde=1800-01-01&hasta=1800-01-02',admin).status_code==400

@caso('BI01','Bitácora','RF-19','Acción sintética de alta de destino queda auditada; filtro y detalle recuperan evento; Cliente403.')
def test_BI01_bitacora_accion_y_filtro(admin,usuarios):
    nombre=nuevo('QA Auditoria');d=ok(pedir('POST','/api/destinos',admin,json={'nombre':nombre,'descripcion':'Destino para auditoría académica','precio_base_eur':1}));id=uid(d,'destino')
    d=ok(pedir('GET','/api/bitacora?modulo=catalogo&accion=INSERT&q='+str(id),admin));filas=items(d);assert any(x['tabla_afectada']=='destinos' and str(x['registro_id'])==str(id) for x in filas)
    ok(pedir('GET',f'/api/bitacora/{filas[0]["id"]}',admin));assert pedir('GET','/api/bitacora',usuarios[0]).status_code==403
    ok(pedir('DELETE',f'/api/destinos/{id}',admin))

@caso('SE01','Roles y permisos','RNF-11 / RNF-14','Rol y permiso sintéticos: alta, asociación, consulta, retirada, edición y baja; no alterar roles existentes.')
def test_SE01_ciclo_rol_permiso(admin):
    nombre=nuevo('QA Rol');rol=uid(ok(pedir('POST','/api/roles/',admin,json={'nombre':nombre,'descripcion':'Ensayo académico'})),'rol');perm=uid(ok(pedir('POST','/api/permisos/',admin,json={'descripcion':nuevo('qa_permiso')})),'permiso')
    ok(pedir('POST',f'/api/roles/{rol}/permisos',admin,json={'permiso_id':perm}));assert str(perm) in json.dumps(ok(pedir('GET',f'/api/roles/{rol}/permisos',admin)))
    ok(pedir('DELETE',f'/api/roles/{rol}/permisos/{perm}',admin));ok(pedir('PUT',f'/api/roles/{rol}',admin,json={'descripcion':'QA editado'}));ok(pedir('PUT',f'/api/permisos/{perm}',admin,json={'descripcion':nuevo('qa_editado')}))
    ok(pedir('DELETE',f'/api/roles/{rol}',admin));ok(pedir('DELETE',f'/api/permisos/{perm}',admin))
    assert pedir('GET',f'/api/roles/{rol}',admin).status_code==404

@caso('BK01','Respaldos','RF-21.1 / RF-21.3','Administrador genera dos archivos gzip no vacíos; Cliente403; descarga coincide con gzip SQL.')
def test_BK01_generacion_respaldo(admin,usuarios):
    assert pedir('POST','/api/respaldos',usuarios[0]).status_code==403
    d=ok(pedir('POST','/api/respaldos',admin));assert {x['tipo'] for x in d['archivos']}=={'seguridad','negocio'}
    evidencia=[]
    for a in d['archivos']:
        r=pedir('GET','/api/respaldos/'+a['archivo'],admin);assert r.status_code==200
        sql=gzip.decompress(r.content);assert b'CREATE TABLE' in sql and len(sql)>100
        evidencia.append({'archivo':a['archivo'],'bytes':len(r.content),'sql_bytes':len(sql)})
    (DIR/'evidencias/modulos_18/respaldo_verificado.json').write_text(json.dumps(evidencia,indent=2))


@caso('CF01','Catálogo financiero','RF-17.1 / RF-17.2','Catálogos sintéticos moneda/método/banco/POS/tasa: alta, edición, consulta y baja; valores persistidos.')
def test_CF01_ciclo_catalogos_financieros(admin):
    codigo='Q'+''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ',k=2))
    moneda=ok(pedir('POST','/api/monedas',admin,json={'codigo':codigo,'nombre':'Moneda académica','simbolo':'Q'}))['moneda']['id']
    metodo=ok(pedir('POST','/api/metodos-pago',admin,json={'codigo':nuevo('qa'),'nombre':'Método académico','moneda_id':moneda}))['metodo_pago']['id']
    banco=ok(pedir('POST','/api/bancos',admin,json={'codigo':str(random.randint(5000,9999)),'nombre':nuevo('QA Banco')}))['banco']['id']
    pos=ok(pedir('POST','/api/puntos-venta',admin,json={'banco_id':banco,'codigo':nuevo('qa'),'nombre':'Terminal académico','numero_terminal':'QA0001'}))['punto_venta']['id']
    tasa=ok(pedir('POST','/api/tasas',admin,json={'moneda_id':moneda,'fecha':date.today().isoformat(),'valor':123}))['tasa']['id']
    for ruta,id,datos in [('/api/monedas',moneda,{'nombre':'Moneda QA editada'}),('/api/metodos-pago',metodo,{'nombre':'Método QA editado'}),('/api/bancos',banco,{'nombre':'Banco QA editado'}),('/api/puntos-venta',pos,{'nombre':'Terminal QA editado'}),('/api/tasas',tasa,{'valor':124})]:
        ok(pedir('PUT',f'{ruta}/{id}',admin,json=datos));resp=ok(pedir('GET',f'{ruta}/{id}',admin));assert all(str(v) in json.dumps(resp,ensure_ascii=False) for v in datos.values())
    for ruta,id in [('/api/puntos-venta',pos),('/api/tasas',tasa),('/api/metodos-pago',metodo),('/api/bancos',banco),('/api/monedas',moneda)]:
        ok(pedir('DELETE',f'{ruta}/{id}',admin));assert pedir('GET',f'{ruta}/{id}',admin).status_code==404

@caso('CF02','Catálogo financiero','RF-17.2 / RNF-10','Tasa cero o negativa rechazada422.')
@pytest.mark.parametrize('valor',[0,-1])
def test_CF02_tasa_no_positiva(admin,catalogos,valor):
    with SessionLocal() as db:moneda=db.execute(text("SELECT id FROM monedas WHERE codigo='EUR'")).scalar_one()
    assert pedir('POST','/api/tasas',admin,json={'moneda_id':moneda,'fecha':date.today().isoformat(),'valor':valor}).status_code==422

@pytest.fixture
def guia_qa(admin):
    with SessionLocal() as db:rol=db.execute(text(f"SELECT id FROM `{nombre_bd_seguridad}`.roles WHERE LOWER(nombre)='guia' AND eliminado_en IS NULL")).scalar_one()
    correo='qa.guia.'+uuid.uuid4().hex[:8]+'@example.test'
    d=ok(pedir('POST','/api/usuarios/',admin,json={'nombre':'Guia','apellido':'Academico','correo':correo,'contrasena':PASSWORD,'rol_id':rol,'telefono':'04120000009'}))
    token=ok(login(correo,PASSWORD))['token'];return {'id':d['usuario']['id'],'token':token}

@caso('GU01','Guías','RF-10.1 / RF-10.2 / RF-10.3','Guía asignado puede ver manifiesto; no asignado403; asignación principal persistida; no otorgar permisos administrativos.')
def test_GU01_guia_solo_viaje_asignado(admin,escenario,guia_qa):
    id=escenario['viaje_id'];base=f'/api/viajes/{id}';tok=guia_qa['token']
    assert pedir('GET',f'/api/abordajes/viajes/{id}/manifiesto',tok).status_code==403
    ok(pedir('PUT',base+'/guias',admin,json={'guias_ids':[guia_qa['id']],'guia_principal_id':guia_qa['id']}))
    d=ok(pedir('GET',base+'/guias',admin));assert d['guia_principal_id']==guia_qa['id']
    ok(pedir('GET',f'/api/abordajes/viajes/{id}/manifiesto',tok));assert str(id) in json.dumps(ok(pedir('GET','/api/abordajes/viajes',tok)))
    assert pedir('GET','/api/usuarios/',tok).status_code==403
    ok(pedir('PUT',base+'/guias',admin,json={'guias_ids':[]}));assert pedir('GET',f'/api/abordajes/viajes/{id}/manifiesto',tok).status_code==403

@caso('GU02','Guías','RF-10.1','Asignar Cliente como guía rechazado400, sin vínculo persistido.')
def test_GU02_cliente_no_es_guia(admin,usuarios,escenario):
    with SessionLocal() as db:cid=db.execute(text(f"SELECT id FROM `{nombre_bd_seguridad}`.usuarios WHERE correo='qa.rf01.1@example.test'")).scalar_one()
    assert pedir('PUT',f'/api/viajes/{escenario["viaje_id"]}/guias',admin,json={'guias_ids':[cid],'guia_principal_id':cid}).status_code==400

@caso('CR01','Saldo a favor','RF-23.2 / RF-23.3','Cancelar con más24h conserva5EUR de pago aprobado como crédito; aplicar5 a reserva futura reduce saldo a15 sin reembolso.')
def test_CR01_cancelacion_credito_y_aplicacion(admin,usuarios,escenario,catalogos,comprobante):
    rid=escenario['reserva_id'];pago=ok(reportar(escenario,usuarios,catalogos,comprobante))['pago']['id'];aprobar(rid,pago,admin)
    ok(pedir('POST',f'/api/creditos/reservas/{rid}/cancelar',admin,json={'notas':'Cancelación académica anticipada'}))
    d=ok(pedir('GET','/api/creditos/portal/mios',usuarios[1]));credito=next(x for x in d['creditos'] if x['reserva_origen_id']==rid);assert credito['monto_eur']==5
    salida=datetime.now()+timedelta(days=25)
    vid=ok(pedir('POST','/api/viajes',admin,json={'destino_id':DATOS['destino_id'],'unidad_id':DATOS['unidad_id'],'fecha_salida':salida.isoformat(),'fecha_regreso':(salida+timedelta(hours=5)).isoformat()}))['viaje']['id']
    destino=ok(pedir('POST','/api/reservas/cliente',usuarios[1],json={'viaje_id':vid,'asientos_ids':[DATOS['asiento_id']]}))['reserva_id']
    assert pedir('POST','/api/creditos/portal/aplicar',usuarios[0],json={'reserva_id':destino,'monto_eur':5}).status_code in [400,403,404]
    ok(pedir('POST','/api/creditos/portal/aplicar',usuarios[1],json={'reserva_id':destino,'monto_eur':5}))
    resumen=ok(pedir('GET',f'/api/reservas/{destino}/pagos/resumen',admin));assert resumen['saldo_pendiente_eur']==15

@caso('MN01','Expediente y menores','RF-24.2 / RF-22.3','Menor sin partida rechazado; documento académico y fecha válidos permiten menor sin asiento con recargo5–10EUR.')
def test_MN01_menor_exige_partida(admin,escenario,catalogos,usuarios,destino_qa):
    ok(pedir('PUT',f'/api/viajes/{escenario["viaje_id"]}',admin,json={'destino_id':destino_qa}))
    from PIL import Image
    import io
    body={'cliente_id':DATOS['pasajeros'][0]['cliente_id'],'es_menor':True,'fecha_nacimiento':(date.today().replace(year=date.today().year-3)).isoformat(),'ocupa_asiento':False,'precio_pasajero_eur':0}
    ruta=f'/api/reservas/{escenario["reserva_id"]}/pasajeros'
    assert pedir('POST',ruta,admin,json=body).status_code in [400,422]
    im=Image.new('RGB',(400,100),'white');from PIL import ImageDraw;ImageDraw.Draw(im).text((10,20),'PARTIDA ACADEMICA - SIN VALOR LEGAL',fill='black');buff=io.BytesIO();im.save(buff,format='PNG')
    url=ok(pedir('POST','/api/reservas/portal/partida/upload',usuarios[1],files={'archivo':('partida_academica_sin_valor.png',buff.getvalue(),'image/png')}))['partida_nacimiento_url']
    d=ok(pedir('POST',ruta,admin,json={**body,'partida_nacimiento_url':url}));assert 'pasajero' in d or 'pasajero_id' in d
    with SessionLocal() as db:
        cargo=db.execute(text('SELECT recargo_eur FROM reserva_clientes WHERE id=:id'),{'id':d['pasajero_id']}).scalar_one();assert 5<=float(cargo)<=10
    assert pedir('PUT',ruta+'/'+str(d['pasajero_id']),admin,json={'partida_nacimiento_url':''}).status_code in [400,422]

@caso('BK02','Respaldos','RF-21.2','Rotación7d en directorio temporal conserva respaldo6d y elimina8d; no se espera tiempo real.')
def test_BK02_retencion_controlada(tmp_path,monkeypatch):
    import os,time
    from utilidades import respaldo
    monkeypatch.setattr(respaldo,'DIRECTORIO_RESPALDOS',tmp_path)
    viejo=tmp_path/'respaldo_negocio_20261110_010000.sql.gz';reciente=tmp_path/'respaldo_negocio_20261112_010000.sql.gz'
    for p,dias in [(viejo,8),(reciente,6)]:p.write_bytes(b'QA');os.utime(p,(time.time()-dias*86400,)*2)
    assert respaldo.rotar_respaldos()==[viejo.name];assert reciente.exists()

LECTURAS_PROTEGIDAS=['/api/destinos','/api/unidades','/api/asientos','/api/clientes','/api/puntos-recogida','/api/cotizaciones','/api/viajes','/api/abordajes/viajes','/api/resenas','/api/reportes/estadisticos','/api/bitacora','/api/roles/','/api/permisos/','/api/monedas','/api/tasas','/api/metodos-pago','/api/bancos','/api/puntos-venta','/api/respaldos']
@caso('AC01','Control de acceso transversal','RNF-01 / RNF-11','Cada consulta administrativa sin sesión401; cliente403 excepto sus propias cotizaciones.')
@pytest.mark.parametrize('ruta',LECTURAS_PROTEGIDAS)
def test_AC01_acceso_por_modulo(usuarios,ruta):
    assert pedir('GET',ruta).status_code==401
    assert pedir('GET',ruta,usuarios[0]).status_code==(200 if ruta=='/api/cotizaciones' else 403)

@caso('D04','Destinos','RF-22.3','Recargo de menor fuera de5–10EUR rechazado422 en alta y edición.')
@pytest.mark.parametrize('recargo',[0,4,11])
def test_D04_limites_recargo_menor(admin,destino_qa,recargo):
    assert pedir('POST','/api/destinos',admin,json={'nombre':nuevo('QA Recargo'),'descripcion':'Destino académico','precio_base_eur':20,'recargo_menor_eur':recargo}).status_code==422
    assert pedir('PUT',f'/api/destinos/{destino_qa}',admin,json={'recargo_menor_eur':recargo}).status_code==422


@caso('RP02','Reportes','RF-15.2','Un pago académico aprobado5EUR incrementa exactamente5 los ingresos del periodo; pago pendiente no cuenta.')
def test_RP02_ingresos_solo_aprobados(admin,usuarios,escenario,catalogos,comprobante):
    ruta='/api/reportes/estadisticos?desde='+date.today().isoformat()+'&hasta='+date.today().isoformat()
    antes=ok(pedir('GET',ruta,admin))['resumen']['ingresos_aprobados_eur']
    pid=ok(reportar(escenario,usuarios,catalogos,comprobante))['pago']['id']
    assert ok(pedir('GET',ruta,admin))['resumen']['ingresos_aprobados_eur']==antes
    aprobar(escenario['reserva_id'],pid,admin)
    despues=ok(pedir('GET',ruta,admin))['resumen']['ingresos_aprobados_eur']
    assert round(despues-antes,2)==5

@caso('BK03','Respaldos','RF-21 / RNF-08','Restauración real de ambas bases en dos esquemas aislados; todas las tablas conservan sus cantidades. No restaura sobre SIGEL.')
def test_BK03_restauracion_aislada(tmp_path):
    import re
    from sqlalchemy import create_engine
    from database import url_mysql,nombre_bd,nombre_bd_seguridad
    from utilidades import respaldo
    cli=respaldo._buscar_mysql_cli()
    assert cli,'Se necesita el cliente MySQL para restaurar el respaldo con triggers.'
    marca=uuid.uuid4().hex[:8]
    pares={nombre_bd_seguridad:'sigel_qa_seg_'+marca,nombre_bd:'sigel_qa_neg_'+marca}
    motor=create_engine(url_mysql(nombre_bd),isolation_level='AUTOCOMMIT')
    def conteos(base):
        with motor.connect() as c:
            tablas=[x[0] for x in c.execute(text('SHOW TABLES FROM `'+base+'`'))]
            return {t:int(c.execute(text('SELECT COUNT(*) FROM `'+base+'`.`'+t+'`')).scalar_one()) for t in tablas}
    resultado=respaldo.generar_respaldo();esperado={base:conteos(base) for base in pares}
    try:
        for tipo,original in [('seguridad',nombre_bd_seguridad),('negocio',nombre_bd)]:
            archivo=next(a['archivo'] for a in resultado['archivos'] if a['tipo']==tipo)
            sql=gzip.decompress((respaldo.DIRECTORIO_RESPALDOS/archivo).read_bytes()).decode()
            for antes,despues in pares.items():sql=sql.replace('`'+antes+'`','`'+despues+'`')
            for base in pares:
                assert not re.search(r'(?i)USE\s+`'+re.escape(base)+r'`',sql)
                assert '`'+base+'`.' not in sql
            ruta=tmp_path/(tipo+'.sql');ruta.write_text(sql)
            respaldo._restaurar_con_mysql(cli,ruta)
        comparaciones=[]
        for original,copia in pares.items():
            obtenido=conteos(copia)
            assert obtenido==esperado[original],{k:(v,obtenido.get(k)) for k,v in esperado[original].items() if obtenido.get(k)!=v}
            comparaciones.append({'base_origen':original,'base_aislada':copia,'tablas_verificadas':len(obtenido),'filas':sum(obtenido.values()),'coinciden_todas':True})
        (DIR/'evidencias/modulos_18/restauracion_aislada.json').write_text(json.dumps(comparaciones,indent=2))
    finally:
        with motor.connect() as c:
            for base in reversed(list(pares.values())):
                assert base.startswith('sigel_qa_')
                c.execute(text('DROP DATABASE IF EXISTS `'+base+'`'))
        motor.dispose()

@caso('OP02','Operación e incidencias','RF-26.2','Guía asignado puede marcar Finalizado un viaje de hoy en curso, sin administrar viajes ajenos.')
def test_OP02_guia_finaliza_viaje_asignado(admin,escenario,guia_qa):
    id=escenario['viaje_id']
    ok(pedir('PUT',f'/api/viajes/{id}/guias',admin,json={'guias_ids':[guia_qa['id']],'guia_principal_id':guia_qa['id']}))
    with SessionLocal.begin() as db:
        db.execute(text("UPDATE viajes SET fecha_salida=:a,fecha_regreso=:b,estado='en_curso' WHERE id=:id"),{'id':id,'a':datetime.now()-timedelta(minutes=10),'b':datetime.now()+timedelta(hours=7)})
    r=pedir('PUT',f'/api/abordajes/viajes/{id}/estado',guia_qa['token'],json={'estado':'finalizado'})
    (DIR/'evidencias/modulos_18/operacion_guia.json').write_text(json.dumps({'caso':'OP02','requisito':'RF-26.2','viaje_id':id,'precondicion':'Guía activo asignado a viaje de hoy en curso','esperado':200,'obtenido':r.status_code,'respuesta':r.json()},ensure_ascii=False,indent=2))
    assert r.status_code==200,'RF-26.2: el guía asignado debe poder marcar Finalizado.'
    assert r.json()['viaje']['estado']=='finalizado'
    assert ok(pedir('GET',f'/api/abordajes/viajes/{id}/manifiesto',guia_qa['token']))['viaje']['estado']=='finalizado'

@caso('OP03','Operación e incidencias','RF-26 / RNF-11','Guía no asignado403; viaje futuro400; no editar destino ni fechas; finalizado no reabre.')
def test_OP03_limites_operacion_guia(admin,escenario,guia_qa,usuarios):
    id=escenario['viaje_id'];base=f'/api/abordajes/viajes/{id}/estado';tok=guia_qa['token']
    assert pedir('PUT',base,tok,json={'estado':'en_curso'}).status_code==403
    ok(pedir('PUT',f'/api/viajes/{id}/guias',admin,json={'guias_ids':[guia_qa['id']]}))
    assert pedir('PUT',base,tok,json={'estado':'en_curso'}).status_code==400
    assert pedir('PUT',base,usuarios[0],json={'estado':'en_curso'}).status_code==403
    assert pedir('PUT',base,tok,json={'estado':'en_curso','destino_id':1}).status_code==422
    with SessionLocal.begin() as db:db.execute(text("UPDATE viajes SET fecha_salida=:a,fecha_regreso=:b,estado='planificado' WHERE id=:id"),{'id':id,'a':datetime.now()+timedelta(minutes=20),'b':datetime.now()+timedelta(hours=5)})
    assert pedir('PUT',base,tok,json={'estado':'finalizado'}).status_code==400
    assert ok(pedir('PUT',base,tok,json={'estado':'en_curso'}))['viaje']['estado']=='en_curso'
    assert ok(pedir('PUT',base,tok,json={'estado':'finalizado'}))['viaje']['estado']=='finalizado'
    assert pedir('PUT',base,tok,json={'estado':'en_curso'}).status_code==400
    assert pedir('PUT',f'/api/viajes/{id}',tok,json={'unidad_id':1}).status_code==403

(DIR/'plan_modulos.json').write_text(json.dumps(PLAN,ensure_ascii=False,indent=2))
