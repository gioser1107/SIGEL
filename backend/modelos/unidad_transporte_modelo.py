from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, DateTime, Integer, JSON, String
from sqlalchemy.orm import Session

from database import Base
from utilidades.paginacion import paginar_consulta, respuesta_paginada
from utilidades.validaciones import ValidadorEntrada


class UnidadTransporte(Base):
    __tablename__ = "unidades_transporte"

    id = Column(BigInteger, primary_key=True, index=True)
    placa = Column(String(16), unique=True, nullable=False)
    modelo = Column(String(80), nullable=True)
    capacidad = Column(Integer, nullable=False)
    croquis_filas = Column(Integer, nullable=True)
    croquis_columnas = Column(Integer, nullable=True)
    croquis_celdas = Column(JSON, nullable=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


def unidad_a_dict(unidad: UnidadTransporte) -> dict:
    return {
        "id": unidad.id,
        "placa": unidad.placa,
        "modelo": unidad.modelo,
        "capacidad": unidad.capacidad,
        "croquis": croquis_unidad_a_dict(unidad),
        "creado_en": unidad.creado_en,
        "actualizado_en": unidad.actualizado_en,
    }


def croquis_unidad_a_dict(unidad: UnidadTransporte) -> dict:
    return {
        "filas": unidad.croquis_filas,
        "columnas": unidad.croquis_columnas,
        "celdas": unidad.croquis_celdas or [],
    }


def _ampliar_croquis_si_hace_falta(
    unidad: UnidadTransporte,
    fila: int | None,
    columna: int | None,
) -> None:
    if fila is None or columna is None:
        return
    if unidad.croquis_filas is None:
        unidad.croquis_filas = 9
    if unidad.croquis_columnas is None:
        unidad.croquis_columnas = 5
    filas_necesarias = fila + 1
    columnas_necesarias = columna + 1
    if unidad.croquis_filas < filas_necesarias:
        unidad.croquis_filas = filas_necesarias
    if unidad.croquis_columnas < columnas_necesarias:
        unidad.croquis_columnas = columnas_necesarias


def _normalizar_celdas_croquis(celdas: list | None) -> list[dict]:
    from modelos.croquis_plantillas import CROQUIS_COLUMNAS_MAX, CROQUIS_FILAS_MAX, TIPOS_CELDA_CROQUIS

    if celdas is None:
        return []
    if not isinstance(celdas, list):
        raise HTTPException(status_code=400, detail="croquis_celdas debe ser una lista")

    normalizadas = []
    vistas = set()
    for celda in celdas:
        if not isinstance(celda, dict):
            raise HTTPException(status_code=400, detail="Cada celda del croquis debe ser un objeto")
        fila = ValidadorEntrada.coordenada_croquis(celda.get("fila"), "fila", obligatorio=True, maximo=CROQUIS_FILAS_MAX - 1)
        columna = ValidadorEntrada.coordenada_croquis(
            celda.get("columna"), "columna", obligatorio=True, maximo=CROQUIS_COLUMNAS_MAX - 1
        )
        tipo = ValidadorEntrada.tipo_celda_croquis(celda.get("tipo"))
        clave = (fila, columna)
        if clave in vistas:
            raise HTTPException(status_code=400, detail="Hay celdas especiales repetidas en el croquis")
        if tipo not in TIPOS_CELDA_CROQUIS:
            raise HTTPException(status_code=400, detail="Tipo de celda de croquis no válido")
        vistas.add(clave)
        normalizadas.append({"fila": fila, "columna": columna, "tipo": tipo})
    return normalizadas


def actualizar_croquis(
    db: Session,
    unidad_id: int,
    filas: int,
    columnas: int,
    celdas: list | None,
) -> UnidadTransporte:
    from modelos.asiento_modelo import Asiento
    from modelos.croquis_plantillas import CROQUIS_COLUMNAS_MAX, CROQUIS_FILAS_MAX

    unidad = obtener_unidad_activa(db, unidad_id)
    filas_limpias = ValidadorEntrada.dimension_croquis(filas, "filas", 1, CROQUIS_FILAS_MAX)
    columnas_limpias = ValidadorEntrada.dimension_croquis(columnas, "columnas", 1, CROQUIS_COLUMNAS_MAX)
    celdas_limpias = _normalizar_celdas_croquis(celdas)

    for celda in celdas_limpias:
        if celda["fila"] >= filas_limpias or celda["columna"] >= columnas_limpias:
            raise HTTPException(
                status_code=400,
                detail="Hay celdas especiales fuera de los límites del croquis",
            )

    asientos = db.query(Asiento).filter(
        Asiento.unidad_id == unidad_id,
        Asiento.eliminado_en.is_(None),
        Asiento.fila.isnot(None),
        Asiento.columna.isnot(None),
    ).all()
    ocupadas = {(c["fila"], c["columna"]) for c in celdas_limpias}
    for asiento in asientos:
        if asiento.fila >= filas_limpias or asiento.columna >= columnas_limpias:
            raise HTTPException(
                status_code=400,
                detail="Hay asientos fuera de los nuevos límites del croquis. Muévelos o elimínalos primero.",
            )
        if (asiento.fila, asiento.columna) in ocupadas:
            raise HTTPException(
                status_code=400,
                detail=f"La celda del asiento {asiento.numero} choca con una celda especial del croquis",
            )

    unidad.croquis_filas = filas_limpias
    unidad.croquis_columnas = columnas_limpias
    unidad.croquis_celdas = celdas_limpias
    unidad.actualizado_en = datetime.now()
    db.commit()
    return unidad


def obtener_unidad_activa(db: Session, unidad_id: int) -> UnidadTransporte:
    unidad = db.query(UnidadTransporte).filter(
        UnidadTransporte.id == unidad_id,
        UnidadTransporte.eliminado_en.is_(None),
    ).first()
    if not unidad:
        raise HTTPException(status_code=404, detail="Unidad de transporte no encontrada")
    return unidad


def _validar_placa_no_repetida(db: Session, placa: str, unidad_id_actual: int | None = None) -> None:
    existente = db.query(UnidadTransporte).filter(
        UnidadTransporte.placa == placa,
        UnidadTransporte.eliminado_en.is_(None),
    ).first()
    if existente and existente.id != unidad_id_actual:
        raise HTTPException(
            status_code=400,
            detail="Ya existe una unidad de transporte activa con esta placa",
        )


def listar_unidades(db: Session, pagina: int = 1, limite: int = 10) -> dict:
    consulta = (
        db.query(UnidadTransporte)
        .filter(UnidadTransporte.eliminado_en.is_(None))
        .order_by(UnidadTransporte.id)
    )
    unidades, total = paginar_consulta(consulta, pagina, limite)
    items = [unidad_a_dict(u) for u in unidades]
    return respuesta_paginada(items, total, pagina, limite)


def crear_unidad(
    db: Session,
    placa: str,
    modelo: Optional[str],
    capacidad: int,
) -> UnidadTransporte:
    placa_limpia = ValidadorEntrada.placa(placa)
    modelo_limpio = ValidadorEntrada.nombre_entidad(modelo, "modelo", obligatorio=False) or None
    if modelo_limpio and len(modelo_limpio) > 80:
        raise HTTPException(status_code=422, detail="modelo: no puede superar 80 caracteres")
    capacidad_limpia = ValidadorEntrada.capacidad_pasajeros(capacidad)
    _validar_placa_no_repetida(db, placa_limpia)

    ahora = datetime.now()
    nueva_unidad = UnidadTransporte(
        placa=placa_limpia,
        modelo=modelo_limpio,
        capacidad=capacidad_limpia,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nueva_unidad)
    db.commit()
    db.refresh(nueva_unidad)
    return nueva_unidad


def actualizar_unidad(
    db: Session,
    unidad_id: int,
    placa: Optional[str],
    modelo: Optional[str],
    capacidad: Optional[int],
) -> UnidadTransporte:
    unidad = obtener_unidad_activa(db, unidad_id)

    if placa is not None:
        placa_limpia = ValidadorEntrada.placa(placa)
        if placa_limpia != unidad.placa:
            _validar_placa_no_repetida(db, placa_limpia, unidad_id)
        unidad.placa = placa_limpia

    if modelo is not None:
        modelo_limpio = ValidadorEntrada.nombre_entidad(modelo, "modelo", obligatorio=False) or None
        if modelo_limpio and len(modelo_limpio) > 80:
            raise HTTPException(status_code=422, detail="modelo: no puede superar 80 caracteres")
        unidad.modelo = modelo_limpio

    if capacidad is not None:
        unidad.capacidad = ValidadorEntrada.capacidad_pasajeros(capacidad)

    unidad.actualizado_en = datetime.now()
    db.commit()
    return unidad


def eliminar_unidad(db: Session, unidad_id: int) -> None:
    from modelos.viaje_modelo import Viaje, sincronizar_viajes_vencidos

    unidad = obtener_unidad_activa(db, unidad_id)
    sincronizar_viajes_vencidos(db)

    viajes_activos = db.query(Viaje).filter(
        Viaje.unidad_id == unidad_id,
        Viaje.eliminado_en.is_(None),
        Viaje.estado.in_(["planificado", "en_curso"]),
    ).first()

    if viajes_activos:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar la unidad de transporte porque tiene viajes activos o planificados asociados.",
        )

    ahora = datetime.now()
    unidad.eliminado_en = ahora
    unidad.actualizado_en = ahora
    db.commit()
