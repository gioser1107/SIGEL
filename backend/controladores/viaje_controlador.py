from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from dependencias.permiso_dependencia import requiere_permiso
from modelos.bitacora_modelo import obtener_ip_origen, registrar_evento
from modelos.permiso_modelo import (
    PERMISO_BORRAR_PLANIFICACION,
    PERMISO_CREAR_PLANIFICACION,
    PERMISO_EDITAR_PLANIFICACION,
    PERMISO_LEER_PLANIFICACION,
    PERMISO_LEER_RESERVAS,
)
from modelos.viaje_guia_modelo import (
    guardar_guias_viaje,
    listar_guias_disponibles,
    listar_guias_viaje,
)
from modelos.viaje_ruta_recogida_modelo import (
    guardar_ruta_recogida,
    listar_candidatos_ruta_recogida,
    listar_ruta_recogida,
)
from modelos.viaje_modelo import (
    actualizar_costo,
    actualizar_viaje,
    asientos_disponibles,
    costo_a_dict,
    crear_costo,
    crear_viaje,
    eliminar_costo,
    eliminar_viaje,
    listar_costos,
    listar_viajes,
    obtener_viaje_detalle,
    resumen_costos,
    viaje_a_dict,
)

router = APIRouter(prefix="/viajes", tags=["Planificación - Viajes"])


class DatosViajeCrear(BaseModel):
    destino_id: int
    unidad_id: int
    guias_ids: list[int] = Field(default_factory=list)
    guia_principal_id: int | None = None
    guia_id: int | None = None  # legacy: un solo guía
    fecha_salida: datetime
    fecha_regreso: datetime | None = None
    estado: str = "planificado"


class DatosViajeActualizar(BaseModel):
    destino_id: int | None = None
    unidad_id: int | None = None
    guias_ids: list[int] | None = None
    guia_principal_id: int | None = None
    guia_id: int | None = None  # legacy
    fecha_salida: datetime | None = None
    fecha_regreso: datetime | None = None
    estado: str | None = None


class DatosGuiasViajeGuardar(BaseModel):
    guias_ids: list[int] = Field(default_factory=list)
    guia_principal_id: int | None = None


class DatosRutaRecogidaItem(BaseModel):
    reserva_cliente_id: int
    orden: int = Field(gt=0)
    hora_programada: datetime | None = None
    notas: str | None = None


class DatosRutaRecogidaGuardar(BaseModel):
    paradas: list[DatosRutaRecogidaItem] = []


class DatosCostoCrear(BaseModel):
    categoria: str = "otro"
    monto_eur: Decimal = Field(ge=0)
    descripcion: str | None = None


class DatosCostoActualizar(BaseModel):
    categoria: str | None = None
    monto_eur: Decimal | None = Field(default=None, ge=0)
    descripcion: str | None = None


@router.get("")
def listar_viajes_endpoint(
    estado: str | None = Query(default=None),
    destino_id: int | None = Query(default=None),
    fecha_desde: datetime | None = Query(default=None),
    fecha_hasta: datetime | None = Query(default=None),
    pagina: int = Query(default=1, ge=1),
    limite: int = Query(default=10, ge=1, le=200),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_PLANIFICACION)),
):
    return listar_viajes(
        db,
        estado=estado,
        destino_id=destino_id,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        pagina=pagina,
        limite=limite,
    )


@router.get("/guias-disponibles")
def listar_guias_disponibles_endpoint(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_PLANIFICACION)),
):
    """Usuarios con rol Guía, para asignar en crear/editar viaje."""
    return listar_guias_disponibles(db)


@router.get("/{viaje_id}")
def obtener_viaje_endpoint(
    viaje_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_PLANIFICACION)),
):
    return obtener_viaje_detalle(db, viaje_id)


@router.post("")
def crear_viaje_endpoint(
    datos: DatosViajeCrear,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_PLANIFICACION)),
):
    nuevo_viaje = crear_viaje(
        db,
        destino_id=datos.destino_id,
        unidad_id=datos.unidad_id,
        guias_ids=datos.guias_ids if datos.guias_ids else None,
        guia_principal_id=datos.guia_principal_id,
        guia_id=datos.guia_id,
        fecha_salida=datos.fecha_salida,
        fecha_regreso=datos.fecha_regreso,
        estado=datos.estado,
    )

    registrar_evento(
        db,
        modulo="viajes",
        accion="INSERT",
        resumen=f"Viaje creado (destino {datos.destino_id})",
        usuario_id=usuario_actual["id"],
        tabla_afectada="viajes",
        registro_id=nuevo_viaje.id,
        detalle={"destino_id": datos.destino_id, "estado": datos.estado},
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Viaje creado con éxito",
        "viaje": viaje_a_dict(db, nuevo_viaje),
    }


@router.put("/{viaje_id}")
def actualizar_viaje_endpoint(
    viaje_id: int,
    datos: DatosViajeActualizar,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_PLANIFICACION)),
):
    viaje = actualizar_viaje(
        db,
        viaje_id,
        destino_id=datos.destino_id,
        unidad_id=datos.unidad_id,
        guias_ids=datos.guias_ids,
        guia_principal_id=datos.guia_principal_id,
        guia_id=datos.guia_id,
        fecha_salida=datos.fecha_salida,
        fecha_regreso=datos.fecha_regreso,
        estado=datos.estado,
    )

    registrar_evento(
        db,
        modulo="viajes",
        accion="UPDATE",
        resumen=f"Viaje actualizado (id {viaje_id})",
        usuario_id=usuario_actual["id"],
        tabla_afectada="viajes",
        registro_id=viaje_id,
        detalle=datos.model_dump(exclude_none=True),
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Viaje actualizado con éxito",
        "viaje": viaje_a_dict(db, viaje),
    }


@router.delete("/{viaje_id}")
def eliminar_viaje_endpoint(
    viaje_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_PLANIFICACION)),
):
    eliminar_viaje(db, viaje_id)

    registrar_evento(
        db,
        modulo="viajes",
        accion="DELETE",
        resumen=f"Viaje eliminado (id {viaje_id})",
        usuario_id=usuario_actual["id"],
        tabla_afectada="viajes",
        registro_id=viaje_id,
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Viaje eliminado con éxito",
        "viaje_id": viaje_id,
    }


@router.get("/{viaje_id}/guias")
def listar_guias_viaje_endpoint(
    viaje_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_PLANIFICACION)),
):
    return listar_guias_viaje(db, viaje_id)


@router.put("/{viaje_id}/guias")
def guardar_guias_viaje_endpoint(
    viaje_id: int,
    datos: DatosGuiasViajeGuardar,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_PLANIFICACION)),
):
    resultado = guardar_guias_viaje(
        db,
        viaje_id,
        guias_ids=datos.guias_ids,
        guia_principal_id=datos.guia_principal_id,
    )

    registrar_evento(
        db,
        modulo="viajes",
        accion="UPDATE",
        resumen=f"Guías actualizados en viaje {viaje_id} ({resultado['total']} guías)",
        usuario_id=usuario_actual["id"],
        tabla_afectada="viajes_guias",
        registro_id=viaje_id,
        detalle={"guias_ids": datos.guias_ids, "guia_principal_id": datos.guia_principal_id},
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Guías del viaje actualizados",
        **resultado,
    }


@router.get("/{viaje_id}/ruta-recogida/candidatos")
def listar_candidatos_ruta_recogida_endpoint(
    viaje_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_PLANIFICACION)),
):
    return listar_candidatos_ruta_recogida(db, viaje_id)


@router.get("/{viaje_id}/ruta-recogida")
def listar_ruta_recogida_endpoint(
    viaje_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_PLANIFICACION)),
):
    return listar_ruta_recogida(db, viaje_id)


@router.put("/{viaje_id}/ruta-recogida")
def guardar_ruta_recogida_endpoint(
    viaje_id: int,
    datos: DatosRutaRecogidaGuardar,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_PLANIFICACION)),
):
    resultado = guardar_ruta_recogida(db, viaje_id, datos.paradas)

    registrar_evento(
        db,
        modulo="viajes",
        accion="UPDATE",
        resumen=f"Ruta de recogida actualizada en viaje {viaje_id} ({len(datos.paradas)} paradas)",
        usuario_id=usuario_actual["id"],
        tabla_afectada="viajes_ruta_recogida",
        registro_id=viaje_id,
        detalle={"paradas": len(datos.paradas)},
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Ruta de recogida guardada",
        **resultado,
    }


@router.get("/{viaje_id}/costos")
def listar_costos_endpoint(
    viaje_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_PLANIFICACION)),
):
    return listar_costos(db, viaje_id)


@router.get("/{viaje_id}/costos/resumen")
def resumen_costos_endpoint(
    viaje_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_PLANIFICACION)),
):
    return resumen_costos(db, viaje_id)


@router.post("/{viaje_id}/costos")
def crear_costo_endpoint(
    viaje_id: int,
    datos: DatosCostoCrear,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_PLANIFICACION)),
):
    nuevo_costo = crear_costo(
        db,
        viaje_id,
        categoria=datos.categoria,
        monto_eur=datos.monto_eur,
        descripcion=datos.descripcion,
    )

    registrar_evento(
        db,
        modulo="viajes",
        accion="INSERT",
        resumen=f"Costo creado en viaje {viaje_id} ({datos.categoria})",
        usuario_id=usuario_actual["id"],
        tabla_afectada="costos_operativos",
        registro_id=nuevo_costo.id,
        detalle={"viaje_id": viaje_id, "categoria": datos.categoria, "monto_eur": str(datos.monto_eur)},
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Costo operativo registrado con éxito",
        "costo": costo_a_dict(nuevo_costo, incluir_viaje_id=True),
    }


@router.put("/{viaje_id}/costos/{costo_id}")
def actualizar_costo_endpoint(
    viaje_id: int,
    costo_id: int,
    datos: DatosCostoActualizar,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_PLANIFICACION)),
):
    costo = actualizar_costo(
        db,
        viaje_id,
        costo_id,
        categoria=datos.categoria,
        monto_eur=datos.monto_eur,
        descripcion=datos.descripcion,
    )

    registrar_evento(
        db,
        modulo="viajes",
        accion="UPDATE",
        resumen=f"Costo actualizado en viaje {viaje_id} (id {costo_id})",
        usuario_id=usuario_actual["id"],
        tabla_afectada="costos_operativos",
        registro_id=costo_id,
        detalle=datos.model_dump(exclude_none=True),
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Costo operativo actualizado con éxito",
        "costo": costo_a_dict(costo, incluir_viaje_id=True),
    }


@router.delete("/{viaje_id}/costos/{costo_id}")
def eliminar_costo_endpoint(
    viaje_id: int,
    costo_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_PLANIFICACION)),
):
    eliminar_costo(db, viaje_id, costo_id)

    registrar_evento(
        db,
        modulo="viajes",
        accion="DELETE",
        resumen=f"Costo eliminado en viaje {viaje_id} (id {costo_id})",
        usuario_id=usuario_actual["id"],
        tabla_afectada="costos_operativos",
        registro_id=costo_id,
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Costo operativo eliminado con éxito",
        "costo_id": costo_id,
    }


@router.get("/{viaje_id}/asientos-disponibles")
def listar_asientos_viaje_endpoint(
    viaje_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_RESERVAS)),
):
    return asientos_disponibles(db, viaje_id)
