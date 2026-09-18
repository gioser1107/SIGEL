from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from dependencias.auth_dependencia import obtener_usuario_actual
from dependencias.permiso_dependencia import requiere_permiso
from modelos.bitacora_modelo import obtener_ip_origen, registrar_evento
from modelos.cliente_modelo import requiere_sesion_cliente_portal
from modelos.credito_modelo import (
    aplicar_credito_a_reserva,
    listar_creditos_admin,
    listar_creditos_cliente,
)
from modelos.permiso_modelo import PERMISO_EDITAR_RESERVAS, PERMISO_LEER_RESERVAS
from modelos.reservas_modelo import cancelar_reserva_sin_reembolso, obtener_reserva_activa

router = APIRouter(prefix="/creditos", tags=["Saldo a favor"])


class DatosAplicarCredito(BaseModel):
    reserva_id: int
    monto_eur: Optional[float] = Field(default=None, ge=0)


class DatosCancelarReserva(BaseModel):
    notas: Optional[str] = None


@router.get("/portal/mios")
def mis_creditos_portal(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    cliente_id = requiere_sesion_cliente_portal(usuario_actual)
    return listar_creditos_cliente(db, cliente_id)


@router.post("/portal/aplicar")
def aplicar_credito_portal(
    datos: DatosAplicarCredito,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    cliente_id = requiere_sesion_cliente_portal(usuario_actual)
    resultado = aplicar_credito_a_reserva(
        db,
        reserva_id=datos.reserva_id,
        cliente_id=cliente_id,
        usuario_id=usuario_actual["id"],
        monto_eur=datos.monto_eur,
    )
    registrar_evento(
        db,
        modulo="pagos",
        accion="UPDATE",
        resumen=f"Saldo a favor aplicado a reserva {datos.reserva_id}",
        usuario_id=usuario_actual["id"],
        tabla_afectada="creditos_aplicados",
        registro_id=datos.reserva_id,
        ip_origen=obtener_ip_origen(request),
    )
    return resultado


@router.get("")
def listar_creditos_admin_endpoint(
    cliente_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_RESERVAS)),
):
    return listar_creditos_admin(db, cliente_id)


@router.post("/aplicar")
def aplicar_credito_admin(
    datos: DatosAplicarCredito,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_RESERVAS)),
):
    reserva = obtener_reserva_activa(db, datos.reserva_id)
    resultado = aplicar_credito_a_reserva(
        db,
        reserva_id=datos.reserva_id,
        cliente_id=reserva.cliente_id,
        usuario_id=usuario_actual["id"],
        monto_eur=datos.monto_eur,
    )
    registrar_evento(
        db,
        modulo="pagos",
        accion="UPDATE",
        resumen=f"ATC/Admin aplicó saldo a favor a reserva {datos.reserva_id}",
        usuario_id=usuario_actual["id"],
        tabla_afectada="creditos_aplicados",
        registro_id=datos.reserva_id,
        ip_origen=obtener_ip_origen(request),
    )
    return resultado


@router.post("/reservas/{reserva_id}/cancelar")
def cancelar_reserva_credito(
    reserva_id: int,
    datos: DatosCancelarReserva,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_RESERVAS)),
):
    resultado = cancelar_reserva_sin_reembolso(
        db,
        reserva_id=reserva_id,
        usuario_id=usuario_actual["id"],
        notas=datos.notas,
    )
    registrar_evento(
        db,
        modulo="reservas",
        accion="UPDATE",
        resumen=f"Reserva {reserva_id} cancelada sin reembolso (saldo a favor)",
        usuario_id=usuario_actual["id"],
        tabla_afectada="reservas",
        registro_id=reserva_id,
        ip_origen=obtener_ip_origen(request),
    )
    return resultado
