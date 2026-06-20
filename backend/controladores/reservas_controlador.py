from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from dependencias.auth_dependencia import obtener_usuario_actual
from dependencias.permiso_dependencia import requiere_permiso
from modelos.reservas_modelo import Reserva
from modelos.viaje_modelo import Viaje
from modelos.reserva_cliente_modelo import ReservaCliente
from modelos.asiento_reservado_modelo import AsientoReservado
from modelos.asiento_modelo import Asiento
from modelos.cliente_modelo import Cliente
from modelos.punto_recogida_modelo import PuntoRecogida
from utilidades.bitacora_utilidad import obtener_ip_origen, registrar_evento
from utilidades.viaje_utilidad import viaje_disponible_para_reserva, viaje_reserva_a_dict
from utilidades.permisos_constantes import (
    PERMISO_BORRAR_RESERVAS,
    PERMISO_CREAR_RESERVAS,
    PERMISO_EDITAR_RESERVAS,
    PERMISO_LEER_RESERVAS,
)

router = APIRouter(prefix="/reservas", tags=["Reservas y Pasajeros"])


class DatosReservaCrear(BaseModel):
    cliente_id: int
    viaje_id: int
    estado: str = "pendiente"


class DatosReservaActualizar(BaseModel):
    estado: Optional[str] = None


class DatosPasajeroCrear(BaseModel):
    cliente_id: int
    es_menor: bool = False
    ocupa_asiento: bool = True
    precio_pasajero_eur: Decimal = Field(default=0.00, ge=0)
    recargo_eur: Decimal = Field(default=0.00, ge=0)
    notas_tarifa: Optional[str] = None
    punto_recogida_id: Optional[int] = None


class DatosPasajeroActualizar(BaseModel):
    es_menor: Optional[bool] = None
    ocupa_asiento: Optional[bool] = None
    precio_pasajero_eur: Optional[Decimal] = Field(default=None, ge=0)
    recargo_eur: Optional[Decimal] = Field(default=None, ge=0)
    notas_tarifa: Optional[str] = None
    punto_recogida_id: Optional[int] = None


class DatosAsientoReservadoCrear(BaseModel):
    asiento_id: int


# Acompañante desde el portal público: se busca por doc o se crea
class DatosPasajeroExtraPublico(BaseModel):
    tipo_documento: str = "V"
    numero_documento: str
    nombre: str
    apellido: str
    punto_recogida_id: Optional[int] = None


class DatosReservaClientePublico(BaseModel):
    viaje_id: int
    titular_punto_recogida_id: Optional[int] = None
    pasajeros_extra: List[DatosPasajeroExtraPublico] = []


def _obtener_reserva_activa(db: Session, reserva_id: int) -> Reserva:
    reserva = db.query(Reserva).filter(
        Reserva.id == reserva_id,
        Reserva.eliminado_en.is_(None)
    ).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return reserva


def _obtener_pasajero_activo(db: Session, reserva_id: int, pasajero_id: int) -> ReservaCliente:
    pasajero = db.query(ReservaCliente).filter(
        ReservaCliente.id == pasajero_id,
        ReservaCliente.reserva_id == reserva_id
    ).first()
    if not pasajero:
        raise HTTPException(status_code=404, detail="Pasajero no encontrado en esta reserva")
    return pasajero


def _validar_viaje_para_reserva(db: Session, viaje_id: int) -> Viaje:
    viaje = db.query(Viaje).filter(
        Viaje.id == viaje_id,
        Viaje.eliminado_en.is_(None),
    ).first()
    if not viaje:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    if not viaje_disponible_para_reserva(db, viaje):
        raise HTTPException(
            status_code=400,
            detail="El viaje no está disponible para reservar (sin unidad, sin asientos o cupo completo)",
        )
    return viaje


def _buscar_o_crear_cliente(db: Session, tipo_doc: str, num_doc: str, nombre: str, apellido: str) -> Cliente:
    """Busca un cliente por documento. Si no existe lo crea como cliente natural."""
    cliente = db.query(Cliente).filter(
        Cliente.numero_documento == num_doc.strip(),
        Cliente.eliminado_en.is_(None)
    ).first()
    if cliente:
        return cliente

    ahora = datetime.now()
    nuevo = Cliente(
        tipo_cliente="natural",
        tipo_documento=tipo_doc or "V",
        numero_documento=num_doc.strip(),
        nombre=nombre,
        apellido=apellido,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nuevo)
    db.flush()
    return nuevo


def _pasajero_a_dict(p: ReservaCliente, cliente: Cliente, punto_nombre: Optional[str]) -> dict:
    return {
        "id": p.id,
        "reserva_id": p.reserva_id,
        "cliente_id": p.cliente_id,
        "es_titular": p.es_titular,
        "nombre": cliente.nombre,
        "apellido": cliente.apellido,
        "tipo_documento": cliente.tipo_documento,
        "numero_documento": cliente.numero_documento,
        "es_menor": p.es_menor,
        "ocupa_asiento": p.ocupa_asiento,
        "precio_pasajero_eur": float(p.precio_pasajero_eur),
        "recargo_eur": float(p.recargo_eur),
        "notas_tarifa": p.notas_tarifa,
        "punto_recogida_id": p.punto_recogida_id,
        "punto_recogida_nombre": punto_nombre,
    }


@router.get("/viajes-disponibles")
def listar_viajes_disponibles_para_reserva(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_RESERVAS)),
):
    viajes = (
        db.query(Viaje)
        .filter(
            Viaje.eliminado_en.is_(None),
            Viaje.estado.notin_(("finalizado", "cancelado")),
        )
        .order_by(Viaje.fecha_salida.asc())
        .all()
    )
    return [viaje_reserva_a_dict(db, v) for v in viajes if viaje_disponible_para_reserva(db, v)]


@router.post("/cliente")
def crear_reserva_desde_landing(
    datos: DatosReservaClientePublico,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    cliente_id = usuario_actual.get("cliente_id")
    if not cliente_id:
        raise HTTPException(status_code=403, detail="Solo clientes registrados pueden crear reservas")

    cliente = db.query(Cliente).filter(
        Cliente.id == cliente_id,
        Cliente.eliminado_en.is_(None)
    ).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Perfil de cliente no encontrado")

    viaje = _validar_viaje_para_reserva(db, datos.viaje_id)

    if datos.titular_punto_recogida_id:
        punto = db.query(PuntoRecogida).filter(
            PuntoRecogida.id == datos.titular_punto_recogida_id,
            PuntoRecogida.eliminado_en.is_(None)
        ).first()
        if not punto:
            raise HTTPException(status_code=404, detail="Punto de recogida no encontrado")

    ahora = datetime.now()

    nueva_reserva = Reserva(
        cliente_id=cliente_id,
        viaje_id=datos.viaje_id,
        fecha_reserva=ahora,
        estado="pendiente",
        creado_por=usuario_actual["id"],
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nueva_reserva)
    db.flush()

    titular = ReservaCliente(
        reserva_id=nueva_reserva.id,
        cliente_id=cliente_id,
        es_titular=True,
        es_menor=False,
        ocupa_asiento=True,
        precio_pasajero_eur=0,
        recargo_eur=0,
        punto_recogida_id=datos.titular_punto_recogida_id,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(titular)

    for p in datos.pasajeros_extra:
        acomp = _buscar_o_crear_cliente(
            db, p.tipo_documento, p.numero_documento, p.nombre, p.apellido
        )
        # Evitar duplicar al mismo cliente en la misma reserva
        ya_existe = db.query(ReservaCliente).filter(
            ReservaCliente.reserva_id == nueva_reserva.id,
            ReservaCliente.cliente_id == acomp.id,
            ReservaCliente.eliminado_en.is_(None)
        ).first()
        if ya_existe:
            continue

        db.add(ReservaCliente(
            reserva_id=nueva_reserva.id,
            cliente_id=acomp.id,
            es_titular=False,
            es_menor=False,
            ocupa_asiento=True,
            precio_pasajero_eur=0,
            recargo_eur=0,
            punto_recogida_id=p.punto_recogida_id,
            creado_en=ahora,
            actualizado_en=ahora,
        ))

    db.commit()
    db.refresh(nueva_reserva)

    registrar_evento(
        db, modulo="reservas", accion="INSERT",
        resumen=f"Reserva {nueva_reserva.id} creada desde landing (viaje {datos.viaje_id}, cliente {cliente_id})",
        usuario_id=usuario_actual["id"], tabla_afectada="reservas",
        registro_id=nueva_reserva.id, ip_origen=obtener_ip_origen(request),
    )

    return {"mensaje": "Reserva creada con éxito", "reserva_id": nueva_reserva.id}


@router.get("")
def listar_reservas(
    viaje_id: Optional[int] = Query(default=None),
    cliente_id: Optional[int] = Query(default=None),
    estado: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_RESERVAS)),
):
    consulta = db.query(Reserva).filter(Reserva.eliminado_en.is_(None))
    if viaje_id:
        consulta = consulta.filter(Reserva.viaje_id == viaje_id)
    if cliente_id:
        consulta = consulta.filter(Reserva.cliente_id == cliente_id)
    if estado:
        consulta = consulta.filter(Reserva.estado == estado)

    return [
        {
            "id": r.id,
            "cliente_id": r.cliente_id,
            "viaje_id": r.viaje_id,
            "fecha_reserva": r.fecha_reserva,
            "estado": r.estado,
            "creado_en": r.creado_en,
            "actualizado_en": r.actualizado_en,
        }
        for r in consulta.order_by(Reserva.creado_en.desc()).all()
    ]


@router.post("")
def crear_reserva(
    datos: DatosReservaCrear,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_RESERVAS)),
):
    _validar_viaje_para_reserva(db, datos.viaje_id)

    ahora = datetime.now()
    nueva_reserva = Reserva(
        cliente_id=datos.cliente_id,
        viaje_id=datos.viaje_id,
        fecha_reserva=ahora,
        estado=datos.estado,
        creado_por=usuario_actual["id"],
        creado_en=ahora,
        actualizado_en=ahora
    )
    db.add(nueva_reserva)
    db.commit()
    db.refresh(nueva_reserva)

    registrar_evento(
        db, modulo="reservas", accion="INSERT",
        resumen=f"Reserva creada (viaje {datos.viaje_id})",
        usuario_id=usuario_actual["id"], tabla_afectada="reservas",
        registro_id=nueva_reserva.id, ip_origen=obtener_ip_origen(request)
    )

    return {
        "mensaje": "Reserva creada con éxito",
        "reserva": {
            "id": nueva_reserva.id,
            "cliente_id": nueva_reserva.cliente_id,
            "viaje_id": nueva_reserva.viaje_id,
            "estado": nueva_reserva.estado,
        }
    }


@router.get("/{reserva_id}")
def obtener_reserva(
    reserva_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_RESERVAS)),
):
    reserva = _obtener_reserva_activa(db, reserva_id)
    return {
        "id": reserva.id,
        "cliente_id": reserva.cliente_id,
        "viaje_id": reserva.viaje_id,
        "fecha_reserva": reserva.fecha_reserva,
        "estado": reserva.estado,
        "creado_en": reserva.creado_en,
    }


@router.put("/{reserva_id}")
def actualizar_reserva(
    reserva_id: int,
    datos: DatosReservaActualizar,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_RESERVAS)),
):
    reserva = _obtener_reserva_activa(db, reserva_id)

    if datos.estado:
        reserva.estado = datos.estado

    reserva.actualizado_en = datetime.now()
    db.commit()
    db.refresh(reserva)

    registrar_evento(
        db, modulo="reservas", accion="UPDATE",
        resumen=f"Reserva {reserva_id} actualizada",
        usuario_id=usuario_actual["id"], tabla_afectada="reservas",
        registro_id=reserva_id, ip_origen=obtener_ip_origen(request)
    )

    return {"mensaje": "Reserva actualizada con éxito"}


@router.delete("/{reserva_id}")
def eliminar_reserva(
    reserva_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_RESERVAS)),
):
    reserva = _obtener_reserva_activa(db, reserva_id)
    ahora = datetime.now()
    reserva.eliminado_en = ahora
    reserva.actualizado_en = ahora
    db.commit()

    registrar_evento(
        db, modulo="reservas", accion="DELETE",
        resumen=f"Reserva eliminada (id {reserva_id})",
        usuario_id=usuario_actual["id"], tabla_afectada="reservas",
        registro_id=reserva_id, ip_origen=obtener_ip_origen(request)
    )

    return {"mensaje": "Reserva eliminada"}


@router.get("/{reserva_id}/pasajeros")
def listar_pasajeros(
    reserva_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_RESERVAS)),
):
    _obtener_reserva_activa(db, reserva_id)

    pasajeros = (
        db.query(ReservaCliente)
        .filter(
            ReservaCliente.reserva_id == reserva_id,
            ReservaCliente.eliminado_en.is_(None)
        )
        .order_by(ReservaCliente.es_titular.desc(), ReservaCliente.creado_en)
        .all()
    )

    cliente_ids = [p.cliente_id for p in pasajeros]
    clientes = {
        c.id: c
        for c in db.query(Cliente).filter(Cliente.id.in_(cliente_ids)).all()
    }

    punto_ids = {p.punto_recogida_id for p in pasajeros if p.punto_recogida_id}
    puntos = {}
    if punto_ids:
        for pr in db.query(PuntoRecogida).filter(PuntoRecogida.id.in_(punto_ids)).all():
            puntos[pr.id] = pr.nombre

    resultado = []
    for p in pasajeros:
        cliente = clientes.get(p.cliente_id)
        if not cliente:
            continue
        resultado.append(_pasajero_a_dict(p, cliente, puntos.get(p.punto_recogida_id)))

    return resultado


@router.post("/{reserva_id}/pasajeros")
def agregar_pasajero(
    reserva_id: int,
    datos: DatosPasajeroCrear,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_RESERVAS)),
):
    _obtener_reserva_activa(db, reserva_id)

    cliente = db.query(Cliente).filter(
        Cliente.id == datos.cliente_id,
        Cliente.eliminado_en.is_(None)
    ).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado. Debe estar registrado en el sistema.")

    duplicado = db.query(ReservaCliente).filter(
        ReservaCliente.reserva_id == reserva_id,
        ReservaCliente.cliente_id == datos.cliente_id,
        ReservaCliente.eliminado_en.is_(None)
    ).first()
    if duplicado:
        raise HTTPException(status_code=400, detail="Este cliente ya está registrado en esta reserva")

    if datos.punto_recogida_id:
        punto = db.query(PuntoRecogida).filter(
            PuntoRecogida.id == datos.punto_recogida_id,
            PuntoRecogida.eliminado_en.is_(None)
        ).first()
        if not punto:
            raise HTTPException(status_code=404, detail="Punto de recogida no encontrado")

    # Marca titular si el cliente coincide con el que hizo la reserva
    reserva = _obtener_reserva_activa(db, reserva_id)
    es_el_titular = (datos.cliente_id == reserva.cliente_id)

    ahora = datetime.now()
    nuevo_pasajero = ReservaCliente(
        reserva_id=reserva_id,
        cliente_id=datos.cliente_id,
        es_titular=es_el_titular,
        es_menor=datos.es_menor,
        ocupa_asiento=datos.ocupa_asiento,
        precio_pasajero_eur=datos.precio_pasajero_eur,
        recargo_eur=datos.recargo_eur,
        notas_tarifa=datos.notas_tarifa,
        punto_recogida_id=datos.punto_recogida_id,
        creado_en=ahora,
        actualizado_en=ahora
    )
    db.add(nuevo_pasajero)
    db.commit()
    db.refresh(nuevo_pasajero)

    registrar_evento(
        db, modulo="reservas", accion="INSERT",
        resumen=f"Pasajero {nuevo_pasajero.id} (cliente {datos.cliente_id}) agregado a reserva {reserva_id}",
        usuario_id=usuario_actual["id"], tabla_afectada="reserva_clientes",
        registro_id=nuevo_pasajero.id, ip_origen=obtener_ip_origen(request)
    )

    return {"mensaje": "Pasajero agregado", "pasajero_id": nuevo_pasajero.id}


@router.put("/{reserva_id}/pasajeros/{pasajero_id}")
def actualizar_pasajero(
    reserva_id: int,
    pasajero_id: int,
    datos: DatosPasajeroActualizar,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_RESERVAS)),
):
    pasajero = _obtener_pasajero_activo(db, reserva_id, pasajero_id)

    if datos.es_menor is not None:
        pasajero.es_menor = datos.es_menor
    if datos.ocupa_asiento is not None:
        pasajero.ocupa_asiento = datos.ocupa_asiento
    if datos.precio_pasajero_eur is not None:
        pasajero.precio_pasajero_eur = datos.precio_pasajero_eur
    if datos.recargo_eur is not None:
        pasajero.recargo_eur = datos.recargo_eur
    if datos.notas_tarifa is not None:
        pasajero.notas_tarifa = datos.notas_tarifa
    if "punto_recogida_id" in datos.model_fields_set:
        if datos.punto_recogida_id is not None:
            punto = db.query(PuntoRecogida).filter(
                PuntoRecogida.id == datos.punto_recogida_id,
                PuntoRecogida.eliminado_en.is_(None)
            ).first()
            if not punto:
                raise HTTPException(status_code=404, detail="Punto de recogida no encontrado")
        pasajero.punto_recogida_id = datos.punto_recogida_id

    pasajero.actualizado_en = datetime.now()
    db.commit()

    registrar_evento(
        db, modulo="reservas", accion="UPDATE",
        resumen=f"Pasajero {pasajero_id} de reserva {reserva_id} editado",
        usuario_id=usuario_actual["id"], tabla_afectada="reserva_clientes",
        registro_id=pasajero_id, ip_origen=obtener_ip_origen(request)
    )

    return {"mensaje": "Pasajero actualizado"}


@router.delete("/{reserva_id}/pasajeros/{pasajero_id}")
def eliminar_pasajero(
    reserva_id: int,
    pasajero_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_RESERVAS)),
):
    pasajero = _obtener_pasajero_activo(db, reserva_id, pasajero_id)

    ahora = datetime.now()
    db.query(AsientoReservado).filter(
        AsientoReservado.reserva_cliente_id == pasajero_id,
        AsientoReservado.eliminado_en.is_(None)
    ).update({"eliminado_en": ahora, "actualizado_en": ahora}, synchronize_session=False)
    pasajero.eliminado_en = ahora
    pasajero.actualizado_en = ahora
    db.commit()

    registrar_evento(
        db, modulo="reservas", accion="DELETE",
        resumen=f"Pasajero {pasajero_id} eliminado de reserva {reserva_id}",
        usuario_id=usuario_actual["id"], tabla_afectada="reserva_clientes",
        registro_id=pasajero_id, ip_origen=obtener_ip_origen(request)
    )

    return {"mensaje": "Pasajero eliminado"}


@router.get("/{reserva_id}/pasajeros/{pasajero_id}/asientos")
def listar_asientos_pasajero(
    reserva_id: int,
    pasajero_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_RESERVAS)),
):
    _obtener_pasajero_activo(db, reserva_id, pasajero_id)
    asientos = db.query(AsientoReservado).filter(
        AsientoReservado.reserva_cliente_id == pasajero_id,
        AsientoReservado.eliminado_en.is_(None)
    ).all()

    return [{"id": a.id, "asiento_id": a.asiento_id, "viaje_id": a.viaje_id} for a in asientos]


@router.post("/{reserva_id}/pasajeros/{pasajero_id}/asientos")
def asignar_asiento_pasajero(
    reserva_id: int,
    pasajero_id: int,
    datos: DatosAsientoReservadoCrear,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_RESERVAS)),
):
    reserva = _obtener_reserva_activa(db, reserva_id)
    _obtener_pasajero_activo(db, reserva_id, pasajero_id)

    asiento = db.query(Asiento).filter(
        Asiento.id == datos.asiento_id, Asiento.eliminado_en.is_(None)
    ).first()
    if not asiento:
        raise HTTPException(status_code=404, detail="El asiento seleccionado no existe o está eliminado")

    ocupado = db.query(AsientoReservado).filter(
        AsientoReservado.asiento_id == datos.asiento_id,
        AsientoReservado.viaje_id == reserva.viaje_id,
        AsientoReservado.eliminado_en.is_(None)
    ).first()
    if ocupado:
        raise HTTPException(status_code=400, detail="Este asiento ya está reservado para este viaje")

    ahora = datetime.now()
    nuevo_asiento = AsientoReservado(
        reserva_cliente_id=pasajero_id,
        viaje_id=reserva.viaje_id,
        asiento_id=datos.asiento_id,
        creado_en=ahora,
        actualizado_en=ahora
    )
    db.add(nuevo_asiento)
    db.commit()
    db.refresh(nuevo_asiento)

    registrar_evento(
        db, modulo="reservas", accion="INSERT",
        resumen=f"Asiento {datos.asiento_id} asignado a pasajero {pasajero_id}",
        usuario_id=usuario_actual["id"], tabla_afectada="asientos_reservados",
        registro_id=nuevo_asiento.id, ip_origen=obtener_ip_origen(request)
    )

    return {"mensaje": "Asiento asignado", "asiento_reservado_id": nuevo_asiento.id}


@router.delete("/{reserva_id}/pasajeros/{pasajero_id}/asientos/{asiento_reservado_id}")
def quitar_asiento_pasajero(
    reserva_id: int,
    pasajero_id: int,
    asiento_reservado_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_RESERVAS)),
):
    _obtener_pasajero_activo(db, reserva_id, pasajero_id)
    asignacion = db.query(AsientoReservado).filter(
        AsientoReservado.id == asiento_reservado_id,
        AsientoReservado.reserva_cliente_id == pasajero_id,
        AsientoReservado.eliminado_en.is_(None)
    ).first()

    if not asignacion:
        raise HTTPException(status_code=404, detail="Asignación de asiento no encontrada")

    ahora = datetime.now()
    asignacion.eliminado_en = ahora
    asignacion.actualizado_en = ahora
    db.commit()

    registrar_evento(
        db, modulo="reservas", accion="DELETE",
        resumen=f"Asiento quitado a pasajero {pasajero_id}",
        usuario_id=usuario_actual["id"], tabla_afectada="asientos_reservados",
        registro_id=asiento_reservado_id, ip_origen=obtener_ip_origen(request)
    )

    return {"mensaje": "Asiento liberado"}
