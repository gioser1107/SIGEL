from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from dependencias.auth_dependencia import obtener_usuario_actual
from dependencias.permiso_dependencia import requiere_permiso
from utilidades.bitacora_utilidad import obtener_ip_origen, registrar_evento
from utilidades.permisos_constantes import (
    PERMISO_BORRAR_RESERVAS,
    PERMISO_CREAR_RESERVAS,
    PERMISO_EDITAR_RESERVAS,
    PERMISO_LEER_RESERVAS,
)
from utilidades.reserva_utilidad import (
    actualizar_pasajero,
    actualizar_reserva,
    agregar_pasajero,
    asignar_asiento_pasajero,
    crear_reserva,
    crear_reserva_desde_landing,
    eliminar_pasajero,
    eliminar_reserva,
    listar_asientos_pasajero,
    listar_pasajeros_reserva,
    listar_reservas,
    listar_viajes_disponibles,
    obtener_reserva_activa,
    quitar_asiento_pasajero,
    reserva_a_dict,
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


@router.get("/viajes-disponibles")
def listar_viajes_disponibles_para_reserva(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_RESERVAS)),
):
    return listar_viajes_disponibles(db)


@router.post("/cliente")
def crear_reserva_desde_landing_endpoint(
    datos: DatosReservaClientePublico,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    cliente_id = usuario_actual.get("cliente_id")
    if not cliente_id:
        raise HTTPException(status_code=403, detail="Solo clientes registrados pueden crear reservas")

    nueva_reserva = crear_reserva_desde_landing(
        db,
        viaje_id=datos.viaje_id,
        cliente_id=cliente_id,
        usuario_id=usuario_actual["id"],
        titular_punto_recogida_id=datos.titular_punto_recogida_id,
        pasajeros_extra=datos.pasajeros_extra,
    )

    registrar_evento(
        db, modulo="reservas", accion="INSERT",
        resumen=f"Reserva {nueva_reserva.id} creada desde landing (viaje {datos.viaje_id}, cliente {cliente_id})",
        usuario_id=usuario_actual["id"], tabla_afectada="reservas",
        registro_id=nueva_reserva.id, ip_origen=obtener_ip_origen(request),
    )

    return {"mensaje": "Reserva creada con éxito", "reserva_id": nueva_reserva.id}


@router.get("")
def listar_reservas_endpoint(
    viaje_id: Optional[int] = Query(default=None),
    cliente_id: Optional[int] = Query(default=None),
    estado: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_RESERVAS)),
):
    return listar_reservas(db, viaje_id=viaje_id, cliente_id=cliente_id, estado=estado)


@router.post("")
def crear_reserva_endpoint(
    datos: DatosReservaCrear,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_RESERVAS)),
):
    nueva_reserva = crear_reserva(
        db,
        cliente_id=datos.cliente_id,
        viaje_id=datos.viaje_id,
        estado=datos.estado,
        usuario_id=usuario_actual["id"],
    )

    registrar_evento(
        db, modulo="reservas", accion="INSERT",
        resumen=f"Reserva creada (viaje {datos.viaje_id})",
        usuario_id=usuario_actual["id"], tabla_afectada="reservas",
        registro_id=nueva_reserva.id, ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Reserva creada con éxito",
        "reserva": {
            "id": nueva_reserva.id,
            "cliente_id": nueva_reserva.cliente_id,
            "viaje_id": nueva_reserva.viaje_id,
            "estado": nueva_reserva.estado,
        },
    }


@router.get("/{reserva_id}")
def obtener_reserva(
    reserva_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_RESERVAS)),
):
    reserva = obtener_reserva_activa(db, reserva_id)
    return reserva_a_dict(reserva)


@router.put("/{reserva_id}")
def actualizar_reserva_endpoint(
    reserva_id: int,
    datos: DatosReservaActualizar,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_RESERVAS)),
):
    actualizar_reserva(db, reserva_id, datos.estado)

    registrar_evento(
        db, modulo="reservas", accion="UPDATE",
        resumen=f"Reserva {reserva_id} actualizada",
        usuario_id=usuario_actual["id"], tabla_afectada="reservas",
        registro_id=reserva_id, ip_origen=obtener_ip_origen(request),
    )

    return {"mensaje": "Reserva actualizada con éxito"}


@router.delete("/{reserva_id}")
def eliminar_reserva_endpoint(
    reserva_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_RESERVAS)),
):
    eliminar_reserva(db, reserva_id)

    registrar_evento(
        db, modulo="reservas", accion="DELETE",
        resumen=f"Reserva eliminada (id {reserva_id})",
        usuario_id=usuario_actual["id"], tabla_afectada="reservas",
        registro_id=reserva_id, ip_origen=obtener_ip_origen(request),
    )

    return {"mensaje": "Reserva eliminada"}


@router.get("/{reserva_id}/pasajeros")
def listar_pasajeros(
    reserva_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_RESERVAS)),
):
    return listar_pasajeros_reserva(db, reserva_id)


@router.post("/{reserva_id}/pasajeros")
def agregar_pasajero_endpoint(
    reserva_id: int,
    datos: DatosPasajeroCrear,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_RESERVAS)),
):
    nuevo_pasajero = agregar_pasajero(
        db, reserva_id,
        cliente_id=datos.cliente_id,
        es_menor=datos.es_menor,
        ocupa_asiento=datos.ocupa_asiento,
        precio_pasajero_eur=datos.precio_pasajero_eur,
        recargo_eur=datos.recargo_eur,
        notas_tarifa=datos.notas_tarifa,
        punto_recogida_id=datos.punto_recogida_id,
    )

    registrar_evento(
        db, modulo="reservas", accion="INSERT",
        resumen=f"Pasajero {nuevo_pasajero.id} (cliente {datos.cliente_id}) agregado a reserva {reserva_id}",
        usuario_id=usuario_actual["id"], tabla_afectada="reserva_clientes",
        registro_id=nuevo_pasajero.id, ip_origen=obtener_ip_origen(request),
    )

    return {"mensaje": "Pasajero agregado", "pasajero_id": nuevo_pasajero.id}


@router.put("/{reserva_id}/pasajeros/{pasajero_id}")
def actualizar_pasajero_endpoint(
    reserva_id: int,
    pasajero_id: int,
    datos: DatosPasajeroActualizar,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_RESERVAS)),
):
    actualizar_pasajero(
        db, reserva_id, pasajero_id,
        es_menor=datos.es_menor,
        ocupa_asiento=datos.ocupa_asiento,
        precio_pasajero_eur=datos.precio_pasajero_eur,
        recargo_eur=datos.recargo_eur,
        notas_tarifa=datos.notas_tarifa,
        punto_recogida_id=datos.punto_recogida_id,
        actualizar_punto="punto_recogida_id" in datos.model_fields_set,
    )

    registrar_evento(
        db, modulo="reservas", accion="UPDATE",
        resumen=f"Pasajero {pasajero_id} de reserva {reserva_id} editado",
        usuario_id=usuario_actual["id"], tabla_afectada="reserva_clientes",
        registro_id=pasajero_id, ip_origen=obtener_ip_origen(request),
    )

    return {"mensaje": "Pasajero actualizado"}


@router.delete("/{reserva_id}/pasajeros/{pasajero_id}")
def eliminar_pasajero_endpoint(
    reserva_id: int,
    pasajero_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_RESERVAS)),
):
    eliminar_pasajero(db, reserva_id, pasajero_id)

    registrar_evento(
        db, modulo="reservas", accion="DELETE",
        resumen=f"Pasajero {pasajero_id} eliminado de reserva {reserva_id}",
        usuario_id=usuario_actual["id"], tabla_afectada="reserva_clientes",
        registro_id=pasajero_id, ip_origen=obtener_ip_origen(request),
    )

    return {"mensaje": "Pasajero eliminado"}


@router.get("/{reserva_id}/pasajeros/{pasajero_id}/asientos")
def listar_asientos_pasajero_endpoint(
    reserva_id: int,
    pasajero_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_RESERVAS)),
):
    return listar_asientos_pasajero(db, reserva_id, pasajero_id)


@router.post("/{reserva_id}/pasajeros/{pasajero_id}/asientos")
def asignar_asiento_pasajero_endpoint(
    reserva_id: int,
    pasajero_id: int,
    datos: DatosAsientoReservadoCrear,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_RESERVAS)),
):
    nuevo_asiento = asignar_asiento_pasajero(db, reserva_id, pasajero_id, datos.asiento_id)

    registrar_evento(
        db, modulo="reservas", accion="INSERT",
        resumen=f"Asiento {datos.asiento_id} asignado a pasajero {pasajero_id}",
        usuario_id=usuario_actual["id"], tabla_afectada="asientos_reservados",
        registro_id=nuevo_asiento.id, ip_origen=obtener_ip_origen(request),
    )

    return {"mensaje": "Asiento asignado", "asiento_reservado_id": nuevo_asiento.id}


@router.delete("/{reserva_id}/pasajeros/{pasajero_id}/asientos/{asiento_reservado_id}")
def quitar_asiento_pasajero_endpoint(
    reserva_id: int,
    pasajero_id: int,
    asiento_reservado_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_RESERVAS)),
):
    quitar_asiento_pasajero(db, reserva_id, pasajero_id, asiento_reservado_id)

    registrar_evento(
        db, modulo="reservas", accion="DELETE",
        resumen=f"Asiento quitado a pasajero {pasajero_id}",
        usuario_id=usuario_actual["id"], tabla_afectada="asientos_reservados",
        registro_id=asiento_reservado_id, ip_origen=obtener_ip_origen(request),
    )

    return {"mensaje": "Asiento liberado"}
