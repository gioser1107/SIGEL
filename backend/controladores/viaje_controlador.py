from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from dependencias.auth_dependencia import obtener_usuario_actual
from modelos.costo_operativo_modelo import CostoOperativo
from modelos.destino_modelo import Destino
from modelos.punto_recogida_modelo import PuntoRecogida
from modelos.unidad_transporte_modelo import UnidadTransporte
from modelos.usuario_modelo import Usuario
from modelos.viaje_modelo import Viaje
from modelos.viaje_parada_modelo import ViajeParadaRecogida
from utilidades.bitacora_utilidad import obtener_ip_origen, registrar_evento

router = APIRouter(prefix="/viajes", tags=["Planificación - Viajes"])


class DatosViajeCrear(BaseModel):
    destino_id: int
    unidad_id: int
    guia_id: int | None = None
    fecha_salida: datetime
    fecha_regreso: datetime | None = None
    estado: str = "planificado"


class DatosViajeActualizar(BaseModel):
    destino_id: int | None = None
    unidad_id: int | None = None
    guia_id: int | None = None
    fecha_salida: datetime | None = None
    fecha_regreso: datetime | None = None
    estado: str | None = None


class DatosParadaCrear(BaseModel):
    punto_recogida_id: int
    orden: int = Field(gt=0)
    hora_programada: datetime | None = None
    notas: str | None = None


class DatosParadaActualizar(BaseModel):
    punto_recogida_id: int | None = None
    hora_programada: datetime | None = None
    notas: str | None = None


class DatosCostoCrear(BaseModel):
    categoria: str = "otro"
    monto_eur: Decimal = Field(ge=0)
    descripcion: str | None = None


class DatosCostoActualizar(BaseModel):
    categoria: str | None = None
    monto_eur: Decimal | None = Field(default=None, ge=0)
    descripcion: str | None = None


def _obtener_destino_activo(db: Session, destino_id: int) -> Destino:
    consulta = db.query(Destino).filter(
        Destino.id == destino_id,
        Destino.eliminado_en.is_(None),
    )
    destino = consulta.first()
    if destino is None:
        raise HTTPException(status_code=404, detail="Destino no encontrado")
    return destino


def _obtener_unidad_activa(db: Session, unidad_id: int) -> UnidadTransporte:
    consulta = db.query(UnidadTransporte).filter(
        UnidadTransporte.id == unidad_id,
        UnidadTransporte.eliminado_en.is_(None),
    )
    unidad = consulta.first()
    if unidad is None:
        raise HTTPException(status_code=404, detail="Unidad de transporte no encontrada")
    return unidad


def _validar_guia_opcional(db: Session, guia_id: int | None) -> None:
    if guia_id is None:
        return
    consulta = db.query(Usuario).filter(
        Usuario.id == guia_id,
        Usuario.eliminado_en.is_(None),
    )
    guia = consulta.first()
    if guia is None:
        raise HTTPException(status_code=404, detail="Guía no encontrado")


def _validar_fechas_viaje(fecha_salida: datetime, fecha_regreso: datetime | None) -> None:
    if fecha_regreso is not None and fecha_regreso < fecha_salida:
        raise HTTPException(
            status_code=400,
            detail="La fecha de regreso no puede ser anterior a la fecha de salida",
        )


def _obtener_viaje_activo(db: Session, viaje_id: int) -> Viaje:
    consulta = db.query(Viaje).filter(
        Viaje.id == viaje_id,
        Viaje.eliminado_en.is_(None),
    )
    viaje = consulta.first()
    if viaje is None:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    return viaje


def _viaje_a_dict(db: Session, viaje: Viaje) -> dict:
    destino = db.query(Destino).filter(Destino.id == viaje.destino_id).first()
    unidad = db.query(UnidadTransporte).filter(UnidadTransporte.id == viaje.unidad_id).first()
    guia = None
    if viaje.guia_id is not None:
        guia = db.query(Usuario).filter(Usuario.id == viaje.guia_id).first()

    return {
        "id": viaje.id,
        "destino_id": viaje.destino_id,
        "destino_nombre": destino.nombre if destino is not None else None,
        "unidad_id": viaje.unidad_id,
        "unidad_placa": unidad.placa if unidad is not None else None,
        "guia_id": viaje.guia_id,
        "guia_nombre": guia.nombre_completo if guia is not None else None,
        "fecha_salida": viaje.fecha_salida,
        "fecha_regreso": viaje.fecha_regreso,
        "estado": viaje.estado,
        "creado_en": viaje.creado_en,
        "actualizado_en": viaje.actualizado_en,
    }


def _obtener_punto_recogida_activo(db: Session, punto_id: int) -> PuntoRecogida:
    consulta = db.query(PuntoRecogida).filter(
        PuntoRecogida.id == punto_id,
        PuntoRecogida.eliminado_en.is_(None),
    )
    punto = consulta.first()
    if punto is None:
        raise HTTPException(status_code=404, detail="Punto de recogida no encontrado")
    return punto


@router.get("")
def listar_viajes(
    estado: str | None = Query(default=None),
    destino_id: int | None = Query(default=None),
    fecha_desde: datetime | None = Query(default=None),
    fecha_hasta: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    consulta = db.query(Viaje).filter(Viaje.eliminado_en.is_(None))

    if estado is not None:
        consulta = consulta.filter(Viaje.estado == estado)
    if destino_id is not None:
        consulta = consulta.filter(Viaje.destino_id == destino_id)
    if fecha_desde is not None:
        consulta = consulta.filter(Viaje.fecha_salida >= fecha_desde)
    if fecha_hasta is not None:
        consulta = consulta.filter(Viaje.fecha_salida <= fecha_hasta)

    consulta = consulta.order_by(Viaje.fecha_salida.desc())
    lista_viajes = consulta.all()

    resultado = []
    for viaje in lista_viajes:
        resultado.append(_viaje_a_dict(db, viaje))

    return resultado


@router.get("/{viaje_id}")
def obtener_viaje(
    viaje_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    viaje = _obtener_viaje_activo(db, viaje_id)
    detalle = _viaje_a_dict(db, viaje)

    consulta_paradas = db.query(ViajeParadaRecogida).filter(
        ViajeParadaRecogida.viaje_id == viaje_id,
        ViajeParadaRecogida.eliminado_en.is_(None),
    ).order_by(ViajeParadaRecogida.orden)

    paradas = []
    for parada in consulta_paradas.all():
        punto = db.query(PuntoRecogida).filter(PuntoRecogida.id == parada.punto_recogida_id).first()
        paradas.append({
            "viaje_id": parada.viaje_id,
            "orden": parada.orden,
            "punto_recogida_id": parada.punto_recogida_id,
            "punto_nombre": punto.nombre if punto is not None else None,
            "hora_programada": parada.hora_programada,
            "notas": parada.notas,
        })

    consulta_costos = db.query(CostoOperativo).filter(
        CostoOperativo.viaje_id == viaje_id,
        CostoOperativo.eliminado_en.is_(None),
    )
    costos = []
    for costo in consulta_costos.all():
        costos.append({
            "id": costo.id,
            "categoria": costo.categoria,
            "monto_eur": float(costo.monto_eur),
            "descripcion": costo.descripcion,
        })

    detalle["paradas"] = paradas
    detalle["costos"] = costos
    return detalle


@router.post("")
def crear_viaje(
    datos: DatosViajeCrear,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    _obtener_destino_activo(db, datos.destino_id)
    _obtener_unidad_activa(db, datos.unidad_id)
    _validar_guia_opcional(db, datos.guia_id)
    _validar_fechas_viaje(datos.fecha_salida, datos.fecha_regreso)

    ahora = datetime.now()
    nuevo_viaje = Viaje(
        destino_id=datos.destino_id,
        unidad_id=datos.unidad_id,
        guia_id=datos.guia_id,
        fecha_salida=datos.fecha_salida,
        fecha_regreso=datos.fecha_regreso,
        estado=datos.estado,
        creado_en=ahora,
        actualizado_en=ahora,
    )

    db.add(nuevo_viaje)
    db.commit()
    db.refresh(nuevo_viaje)

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
        "viaje": _viaje_a_dict(db, nuevo_viaje),
    }


@router.put("/{viaje_id}")
def actualizar_viaje(
    viaje_id: int,
    datos: DatosViajeActualizar,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    viaje = _obtener_viaje_activo(db, viaje_id)

    if viaje.estado in ("finalizado", "cancelado"):
        raise HTTPException(
            status_code=400,
            detail="No se puede modificar un viaje finalizado o cancelado",
        )

    if datos.destino_id is not None:
        _obtener_destino_activo(db, datos.destino_id)
        viaje.destino_id = datos.destino_id
    if datos.unidad_id is not None:
        _obtener_unidad_activa(db, datos.unidad_id)
        viaje.unidad_id = datos.unidad_id
    if datos.guia_id is not None:
        _validar_guia_opcional(db, datos.guia_id)
        viaje.guia_id = datos.guia_id
    if datos.fecha_salida is not None:
        viaje.fecha_salida = datos.fecha_salida
    if datos.fecha_regreso is not None:
        viaje.fecha_regreso = datos.fecha_regreso
    if datos.estado is not None:
        viaje.estado = datos.estado

    _validar_fechas_viaje(viaje.fecha_salida, viaje.fecha_regreso)

    viaje.actualizado_en = datetime.now()
    db.commit()
    db.refresh(viaje)

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
        "viaje": _viaje_a_dict(db, viaje),
    }


@router.delete("/{viaje_id}")
def eliminar_viaje(
    viaje_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    viaje = _obtener_viaje_activo(db, viaje_id)
    ahora = datetime.now()
    viaje.eliminado_en = ahora
    viaje.actualizado_en = ahora
    db.commit()

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


@router.get("/{viaje_id}/paradas")
def listar_paradas(
    viaje_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    _obtener_viaje_activo(db, viaje_id)

    consulta = db.query(ViajeParadaRecogida).filter(
        ViajeParadaRecogida.viaje_id == viaje_id,
        ViajeParadaRecogida.eliminado_en.is_(None),
    ).order_by(ViajeParadaRecogida.orden)

    resultado = []
    for parada in consulta.all():
        punto = db.query(PuntoRecogida).filter(PuntoRecogida.id == parada.punto_recogida_id).first()
        resultado.append({
            "viaje_id": parada.viaje_id,
            "orden": parada.orden,
            "punto_recogida_id": parada.punto_recogida_id,
            "punto_nombre": punto.nombre if punto is not None else None,
            "hora_programada": parada.hora_programada,
            "notas": parada.notas,
        })

    return resultado


@router.post("/{viaje_id}/paradas")
def crear_parada(
    viaje_id: int,
    datos: DatosParadaCrear,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    _obtener_viaje_activo(db, viaje_id)
    _obtener_punto_recogida_activo(db, datos.punto_recogida_id)

    consulta_orden = db.query(ViajeParadaRecogida).filter(
        ViajeParadaRecogida.viaje_id == viaje_id,
        ViajeParadaRecogida.orden == datos.orden,
        ViajeParadaRecogida.eliminado_en.is_(None),
    )
    if consulta_orden.first() is not None:
        raise HTTPException(status_code=400, detail="Ya existe una parada con ese orden en el viaje")

    consulta_punto = db.query(ViajeParadaRecogida).filter(
        ViajeParadaRecogida.viaje_id == viaje_id,
        ViajeParadaRecogida.punto_recogida_id == datos.punto_recogida_id,
        ViajeParadaRecogida.eliminado_en.is_(None),
    )
    if consulta_punto.first() is not None:
        raise HTTPException(status_code=400, detail="Ese punto de recogida ya está en la ruta del viaje")

    ahora = datetime.now()
    nueva_parada = ViajeParadaRecogida(
        viaje_id=viaje_id,
        orden=datos.orden,
        punto_recogida_id=datos.punto_recogida_id,
        hora_programada=datos.hora_programada,
        notas=datos.notas,
        creado_en=ahora,
        actualizado_en=ahora,
    )

    db.add(nueva_parada)
    db.commit()

    registrar_evento(
        db,
        modulo="viajes",
        accion="INSERT",
        resumen=f"Parada creada en viaje {viaje_id} (orden {datos.orden})",
        usuario_id=usuario_actual["id"],
        tabla_afectada="viajes_paradas_recogida",
        registro_id=f"{viaje_id}-{datos.orden}",
        detalle={"viaje_id": viaje_id, "orden": datos.orden, "punto_recogida_id": datos.punto_recogida_id},
        ip_origen=obtener_ip_origen(request),
    )

    punto = db.query(PuntoRecogida).filter(PuntoRecogida.id == datos.punto_recogida_id).first()

    return {
        "mensaje": "Parada de recogida registrada con éxito",
        "parada": {
            "viaje_id": viaje_id,
            "orden": datos.orden,
            "punto_recogida_id": datos.punto_recogida_id,
            "punto_nombre": punto.nombre if punto is not None else None,
            "hora_programada": datos.hora_programada,
            "notas": datos.notas,
        },
    }


@router.put("/{viaje_id}/paradas/{orden}")
def actualizar_parada(
    viaje_id: int,
    orden: int,
    datos: DatosParadaActualizar,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    _obtener_viaje_activo(db, viaje_id)

    consulta = db.query(ViajeParadaRecogida).filter(
        ViajeParadaRecogida.viaje_id == viaje_id,
        ViajeParadaRecogida.orden == orden,
        ViajeParadaRecogida.eliminado_en.is_(None),
    )
    parada = consulta.first()
    if parada is None:
        raise HTTPException(status_code=404, detail="Parada no encontrada")

    if datos.punto_recogida_id is not None:
        _obtener_punto_recogida_activo(db, datos.punto_recogida_id)
        consulta_duplicado = db.query(ViajeParadaRecogida).filter(
            ViajeParadaRecogida.viaje_id == viaje_id,
            ViajeParadaRecogida.punto_recogida_id == datos.punto_recogida_id,
            ViajeParadaRecogida.orden != orden,
            ViajeParadaRecogida.eliminado_en.is_(None),
        )
        if consulta_duplicado.first() is not None:
            raise HTTPException(status_code=400, detail="Ese punto ya está en la ruta del viaje")
        parada.punto_recogida_id = datos.punto_recogida_id

    if datos.hora_programada is not None:
        parada.hora_programada = datos.hora_programada
    if datos.notas is not None:
        parada.notas = datos.notas

    parada.actualizado_en = datetime.now()
    db.commit()

    registrar_evento(
        db,
        modulo="viajes",
        accion="UPDATE",
        resumen=f"Parada actualizada en viaje {viaje_id} (orden {orden})",
        usuario_id=usuario_actual["id"],
        tabla_afectada="viajes_paradas_recogida",
        registro_id=f"{viaje_id}-{orden}",
        detalle=datos.model_dump(exclude_none=True),
        ip_origen=obtener_ip_origen(request),
    )

    punto = db.query(PuntoRecogida).filter(PuntoRecogida.id == parada.punto_recogida_id).first()

    return {
        "mensaje": "Parada actualizada con éxito",
        "parada": {
            "viaje_id": parada.viaje_id,
            "orden": parada.orden,
            "punto_recogida_id": parada.punto_recogida_id,
            "punto_nombre": punto.nombre if punto is not None else None,
            "hora_programada": parada.hora_programada,
            "notas": parada.notas,
        },
    }


@router.delete("/{viaje_id}/paradas/{orden}")
def eliminar_parada(
    viaje_id: int,
    orden: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    _obtener_viaje_activo(db, viaje_id)

    consulta = db.query(ViajeParadaRecogida).filter(
        ViajeParadaRecogida.viaje_id == viaje_id,
        ViajeParadaRecogida.orden == orden,
        ViajeParadaRecogida.eliminado_en.is_(None),
    )
    parada = consulta.first()
    if parada is None:
        raise HTTPException(status_code=404, detail="Parada no encontrada")

    ahora = datetime.now()
    parada.eliminado_en = ahora
    parada.actualizado_en = ahora
    db.commit()

    registrar_evento(
        db,
        modulo="viajes",
        accion="DELETE",
        resumen=f"Parada eliminada en viaje {viaje_id} (orden {orden})",
        usuario_id=usuario_actual["id"],
        tabla_afectada="viajes_paradas_recogida",
        registro_id=f"{viaje_id}-{orden}",
        ip_origen=obtener_ip_origen(request),
    )

    return {
        "mensaje": "Parada eliminada con éxito",
        "viaje_id": viaje_id,
        "orden": orden,
    }


@router.get("/{viaje_id}/costos")
def listar_costos(
    viaje_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    _obtener_viaje_activo(db, viaje_id)

    consulta = db.query(CostoOperativo).filter(
        CostoOperativo.viaje_id == viaje_id,
        CostoOperativo.eliminado_en.is_(None),
    )

    resultado = []
    for costo in consulta.all():
        resultado.append({
            "id": costo.id,
            "viaje_id": costo.viaje_id,
            "categoria": costo.categoria,
            "monto_eur": float(costo.monto_eur),
            "descripcion": costo.descripcion,
        })

    return resultado


@router.get("/{viaje_id}/costos/resumen")
def resumen_costos(
    viaje_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    _obtener_viaje_activo(db, viaje_id)

    consulta = db.query(CostoOperativo).filter(
        CostoOperativo.viaje_id == viaje_id,
        CostoOperativo.eliminado_en.is_(None),
    )
    costos = consulta.all()

    resumen_por_categoria = {}
    total_eur = Decimal("0")

    for costo in costos:
        categoria = costo.categoria
        monto = Decimal(str(costo.monto_eur))
        if categoria not in resumen_por_categoria:
            resumen_por_categoria[categoria] = Decimal("0")
        resumen_por_categoria[categoria] += monto
        total_eur += monto

    detalle = []
    for categoria, monto in resumen_por_categoria.items():
        detalle.append({
            "categoria": categoria,
            "monto_eur": float(monto),
        })

    return {
        "viaje_id": viaje_id,
        "total_eur": float(total_eur),
        "por_categoria": detalle,
    }


@router.post("/{viaje_id}/costos")
def crear_costo(
    viaje_id: int,
    datos: DatosCostoCrear,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    _obtener_viaje_activo(db, viaje_id)

    ahora = datetime.now()
    nuevo_costo = CostoOperativo(
        viaje_id=viaje_id,
        categoria=datos.categoria,
        monto_eur=datos.monto_eur,
        descripcion=datos.descripcion,
        creado_en=ahora,
        actualizado_en=ahora,
    )

    db.add(nuevo_costo)
    db.commit()
    db.refresh(nuevo_costo)

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
        "costo": {
            "id": nuevo_costo.id,
            "viaje_id": nuevo_costo.viaje_id,
            "categoria": nuevo_costo.categoria,
            "monto_eur": float(nuevo_costo.monto_eur),
            "descripcion": nuevo_costo.descripcion,
        },
    }


@router.put("/{viaje_id}/costos/{costo_id}")
def actualizar_costo(
    viaje_id: int,
    costo_id: int,
    datos: DatosCostoActualizar,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    _obtener_viaje_activo(db, viaje_id)

    consulta = db.query(CostoOperativo).filter(
        CostoOperativo.id == costo_id,
        CostoOperativo.viaje_id == viaje_id,
        CostoOperativo.eliminado_en.is_(None),
    )
    costo = consulta.first()
    if costo is None:
        raise HTTPException(status_code=404, detail="Costo operativo no encontrado")

    if datos.categoria is not None:
        costo.categoria = datos.categoria
    if datos.monto_eur is not None:
        costo.monto_eur = datos.monto_eur
    if datos.descripcion is not None:
        costo.descripcion = datos.descripcion

    costo.actualizado_en = datetime.now()
    db.commit()
    db.refresh(costo)

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
        "costo": {
            "id": costo.id,
            "viaje_id": costo.viaje_id,
            "categoria": costo.categoria,
            "monto_eur": float(costo.monto_eur),
            "descripcion": costo.descripcion,
        },
    }


@router.delete("/{viaje_id}/costos/{costo_id}")
def eliminar_costo(
    viaje_id: int,
    costo_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    _obtener_viaje_activo(db, viaje_id)

    consulta = db.query(CostoOperativo).filter(
        CostoOperativo.id == costo_id,
        CostoOperativo.viaje_id == viaje_id,
        CostoOperativo.eliminado_en.is_(None),
    )
    costo = consulta.first()
    if costo is None:
        raise HTTPException(status_code=404, detail="Costo operativo no encontrado")

    ahora = datetime.now()
    costo.eliminado_en = ahora
    costo.actualizado_en = ahora
    db.commit()

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
