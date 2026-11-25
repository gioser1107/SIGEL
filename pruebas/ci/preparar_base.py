"""Construye un escenario sintético nuevo; rechaza bases existentes o ajenas a CI."""
from pathlib import Path
from datetime import datetime, timedelta
import json
import os
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend'))
# Deben establecerse antes de importar database: nunca toma los nombres de la laptop.
for clave in ('DB_NOMBRE', 'DB_NOMBRE_SEGURIDAD'):
    valor = os.environ.get(clave, '')
    if not re.fullmatch(r'sigel_ci_[a-z0-9_]{1,45}', valor):
        raise SystemExit(f'{clave} debe identificar una base nueva sigel_ci_*.')

import main  # Registra en metadata todos los modelos reales.
from sqlalchemy import create_engine, text
from database import Base, engine, SessionLocal, url_mysql, nombre_bd, nombre_bd_seguridad
from modelos import permiso_modelo
from modelos.permiso_modelo import Permiso
from modelos.rol_modelo import Rol
from modelos.rol_permiso_modelo import RolPermiso
from modelos.usuario_modelo import Usuario, hashear_contrasena
from modelos.estado_modelo import Estado
from modelos.ciudad_modelo import Ciudad
from modelos.cliente_modelo import Cliente
from modelos.destino_modelo import Destino
from modelos.unidad_transporte_modelo import UnidadTransporte
from modelos.asiento_modelo import Asiento
from modelos.viaje_modelo import Viaje
from modelos.reservas_modelo import Reserva
from modelos.reserva_cliente_modelo import ReservaCliente
from modelos.asiento_reservado_modelo import AsientoReservado
from modelos.moneda_modelo import Moneda
from modelos.metodo_pago_modelo import MetodoPago

motor = create_engine(url_mysql(), isolation_level='AUTOCOMMIT')
with motor.connect() as c:
    for base in (nombre_bd_seguridad, nombre_bd):
        existe = c.execute(text('SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=:b'), {'b': base}).scalar_one()
        if existe:
            raise SystemExit(f'Se conserva {base}: ya existe. Elija nombres nuevos; no se borra ninguna base.')
    for base in (nombre_bd_seguridad, nombre_bd):
        c.execute(text(f'CREATE DATABASE `{base}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'))
motor.dispose()
Base.metadata.create_all(engine)

ahora = datetime.now().replace(microsecond=0)
fechas = {'creado_en': ahora, 'actualizado_en': ahora}
with SessionLocal.begin() as db:
    roles = {}
    for nombre in ('Administrador', 'Cliente', 'Guia'):
        rol = Rol(nombre=nombre, descripcion='Perfil sintético de CI', **fechas)
        db.add(rol); db.flush(); roles[nombre] = rol.id
    for codigo in sorted({v for k, v in vars(permiso_modelo).items() if k.startswith('PERMISO_') and isinstance(v, str)}):
        permiso = Permiso(descripcion=codigo, **fechas); db.add(permiso); db.flush()
        db.add(RolPermiso(rol_id=roles['Administrador'], permiso_id=permiso.id, **fechas))
        if codigo in ('leer_abordaje', 'editar_abordaje', 'crear_abordaje', 'borrar_abordaje'):
            db.add(RolPermiso(rol_id=roles['Guia'], permiso_id=permiso.id, **fechas))
    db.add(Usuario(rol_id=roles['Administrador'], correo=os.environ['SIGEL_QA_ADMIN_CORREO'], hash_contrasena=hashear_contrasena(os.environ['SIGEL_QA_ADMIN_CLAVE']), nombre='Administrador', apellido='Academico', **fechas))
    estado = Estado(nombre='Lara', **fechas); db.add(estado); db.flush()
    ciudad = Ciudad(estado_id=estado.id, nombre='Barquisimeto', **fechas); db.add(ciudad); db.flush()
    monedas = {}
    for codigo, nombre, simbolo in [('EUR', 'Euro de prueba', 'EUR'), ('USD', 'Dólar de prueba', '$'), ('VES', 'Bolívar de prueba', 'Bs')]:
        m = Moneda(codigo=codigo, nombre=nombre, simbolo=simbolo); db.add(m); db.flush(); monedas[codigo] = m.id
    for codigo, nombre, moneda in [('zelle', 'Zelle académico', 'EUR'), ('efectivo_usd', 'Efectivo académico', 'EUR'), ('pago_movil', 'Pago móvil académico', 'VES')]:
        db.add(MetodoPago(codigo=codigo, nombre=nombre, moneda_id=monedas[moneda]))
    destino = Destino(nombre='CI Destino sintético', descripcion='Sin venta ni datos personales reales', precio_base_eur=20, recargo_menor_eur=7, extra_hospedaje_particular_eur=0, activo=True, **fechas)
    unidad = UnidadTransporte(placa='QA-CI-001', modelo='Unidad académica', capacidad=10, croquis_filas=5, croquis_columnas=3, croquis_celdas=[], **fechas)
    db.add_all([destino, unidad]); db.flush()
    asientos = []
    for i in range(10):
        a = Asiento(unidad_id=unidad.id, numero=str(i+1), fila=i//2, columna=0 if i % 2 == 0 else 2, posicion='ventana', **fechas)
        db.add(a); db.flush(); asientos.append(a.id)
    viaje = Viaje(destino_id=destino.id, unidad_id=unidad.id, fecha_salida=ahora+timedelta(days=7), fecha_regreso=ahora+timedelta(days=7,hours=8), estado='planificado', **fechas)
    db.add(viaje); db.flush()
    pasajeros = []
    for i, nombre in enumerate(('Alfa', 'Beta'), 1):
        c = Cliente(tipo_cliente='natural', tipo_documento='P', numero_documento=str(990000000+i), nombre=nombre, apellido='Prueba', telefono='0412000000'+str(i), contacto_emergencia_nombre='Contacto Prueba', contacto_emergencia_telefono='04120000009', direccion='Domicilio académico', ciudad_id=ciudad.id, estado_id=estado.id, **fechas)
        db.add(c); db.flush()
        r = Reserva(cliente_id=c.id, viaje_id=viaje.id, fecha_reserva=ahora, estado='pendiente', modalidad='individual', tipo_hospedaje='compartido', **fechas)
        db.add(r); db.flush()
        p = ReservaCliente(reserva_id=r.id, cliente_id=c.id, es_titular=True, precio_pasajero_eur=20, recargo_eur=0, ocupa_asiento=True, **fechas)
        db.add(p); db.flush()
        pasajeros.append({'cliente_id':c.id, 'reserva_id':r.id, 'pasajero_id':p.id})
    db.add(AsientoReservado(reserva_cliente_id=pasajeros[0]['pasajero_id'], viaje_id=viaje.id, asiento_id=asientos[0], **fechas))
    datos = {'metodo':'Escenario sintético nuevo de CI, creado por modelos; no usa el dump de la laptop.', 'destino_id':destino.id, 'unidad_id':unidad.id, 'viaje_id':viaje.id, 'asiento_id':asientos[0], 'pasajeros':pasajeros}
salida = Path(os.environ['SIGEL_QA_DATOS']); salida.parent.mkdir(parents=True, exist_ok=True)
salida.write_text(json.dumps(datos, ensure_ascii=False, indent=2))
print('Dos bases nuevas preparadas con datos académicos. No se importaron bases de la laptop.')
