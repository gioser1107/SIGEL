from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.auth_dependencia import obtener_usuario_actual
from dependencias.permiso_dependencia import requiere_permiso
from modelos.bitacora_modelo import obtener_ip_origen, registrar_evento
from modelos.cliente_modelo import (
    actualizar_cliente,
    buscar_cliente_por_documento_respuesta,
    crear_cliente,
    desactivar_cliente,
    es_rol_cliente,
    listar_clientes,
    obtener_cliente,
)
from modelos.permiso_modelo import (
    PERMISO_BORRAR_CLIENTES,
    PERMISO_CREAR_CLIENTES,
    PERMISO_EDITAR_CLIENTES,
    PERMISO_LEER_CLIENTES,
)
from modelos.punto_recogida_modelo import (
    actualizar_punto_domicilio_cliente,
    crear_punto_para_cliente,
    desvincular_punto_de_cliente,
    listar_puntos_por_cliente,
    marcar_punto_predeterminado_cliente,
    vincular_punto_existente_a_cliente,
)

router = APIRouter(prefix="/clientes", tags=["Clientes"])


class DatosPuntoRecogidaInline(BaseModel):
    nombre: str
    direccion: str
    ciudad: str
    estado: str
    notas_referencia: str
    es_predeterminado: bool = False


class DatosPuntoRecogidaActualizarCliente(BaseModel):
    nombre: str | None = None
    direccion: str | None = None
    ciudad: str | None = None
    estado: str | None = None
    notas_referencia: str | None = None


class DatosClienteNuevo(BaseModel):
    nombre: str
    apellido: str
    tipo_cliente: str = "natural"
    tipo_documento: str
    numero_documento: str
    razon_social: str | None = None
    telefono: str | None = None
    telefono_secundario: str | None = None
    direccion: str | None = None
    estado_id: int | None = None
    ciudad_id: int | None = None
    notas: str | None = None
    punto_recogida_ids: list[int] | None = None
    puntos_recogida: list[DatosPuntoRecogidaInline] | None = None


class DatosClienteActualizar(BaseModel):
    nombre: str | None = None
    apellido: str | None = None
    tipo_cliente: str | None = None
    tipo_documento: str | None = None
    numero_documento: str | None = None
    razon_social: str | None = None
    telefono: str | None = None
    telefono_secundario: str | None = None
    direccion: str | None = None
    estado_id: int | None = None
    ciudad_id: int | None = None
    notas: str | None = None
    punto_recogida_ids: list[int] | None = None
    puntos_recogida: list[DatosPuntoRecogidaInline] | None = None


class DatosPuntoRecogidaCliente(BaseModel):
    nombre: str | None = None
    direccion: str | None = None
    ciudad: str | None = None
    estado: str | None = None
    notas_referencia: str | None = None
    punto_recogida_id: int | None = None
    es_predeterminado: bool = False


def _requiere_cliente_sesion(usuario_actual: dict) -> int:
    cliente_id = usuario_actual.get("cliente_id")
    if cliente_id is None or not es_rol_cliente(usuario_actual.get("rol", "")):
        raise HTTPException(status_code=403, detail="Solo clientes con perfil activo pueden usar este recurso")
    return cliente_id


@router.get("/domicilios-recogida/buscar")
def buscar_domicilios_recogida_por_documento(
    tipo_documento: str = Query(...),
    numero_documento: str = Query(...),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_CLIENTES)),
):
    resultado = buscar_cliente_por_documento_respuesta(db, tipo_documento, numero_documento)
    if resultado is None:
        raise HTTPException(status_code=404, detail="No hay un cliente registrado con ese documento")
    cliente = resultado["cliente"]
    return {
        "cliente": {
            "id": cliente["id"],
            "nombre": cliente["nombre"],
            "apellido": cliente["apellido"],
            "tipo_documento": cliente["tipo_documento"],
            "numero_documento": cliente["numero_documento"],
            "telefono": cliente["telefono"],
            "correo": cliente.get("correo"),
        },
        "domicilios": cliente.get("puntos_recogida", []),
    }


@router.get("/buscar-por-documento")
def buscar_cliente_por_documento_endpoint(
    tipo_documento: str = Query(...),
    numero_documento: str = Query(...),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    resultado = buscar_cliente_por_documento_respuesta(db, tipo_documento, numero_documento)
    if resultado is None:
        raise HTTPException(status_code=404, detail="No hay un cliente registrado con ese documento")
    return resultado


@router.get("/mi-perfil/puntos-recogida")
def listar_mis_puntos_recogida(
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    cliente_id = _requiere_cliente_sesion(usuario_actual)
    return listar_puntos_por_cliente(db, cliente_id)


@router.post("/mi-perfil/puntos-recogida")
def agregar_mi_punto_recogida(
    datos: DatosPuntoRecogidaCliente,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    cliente_id = _requiere_cliente_sesion(usuario_actual)

    if datos.punto_recogida_id is not None:
        punto = vincular_punto_existente_a_cliente(
            db,
            cliente_id,
            datos.punto_recogida_id,
            es_predeterminado=datos.es_predeterminado,
        )
    elif datos.nombre:
        punto = crear_punto_para_cliente(
            db,
            cliente_id,
            nombre=datos.nombre,
            direccion=datos.direccion,
            ciudad=datos.ciudad,
            estado=datos.estado,
            notas_referencia=datos.notas_referencia,
            es_predeterminado=datos.es_predeterminado,
            creado_por_usuario_id=usuario_actual["id"],
        )
    else:
        raise HTTPException(
            status_code=422,
            detail="Indica punto_recogida_id o los datos de un punto nuevo (nombre)",
        )

    registrar_evento(
        db,
        modulo="catalogo",
        accion="INSERT",
        resumen=f"Punto de recogida vinculado al cliente {cliente_id}",
        usuario_id=usuario_actual["id"],
        tabla_afectada="clientes_puntos_recogida",
        registro_id=punto["id"],
        ip_origen=obtener_ip_origen(request),
    )

    return {"mensaje": "Punto de recogida agregado al perfil", "punto_recogida": punto}


@router.put("/mi-perfil/puntos-recogida/{punto_recogida_id}")
def actualizar_mi_punto_recogida(
    punto_recogida_id: int,
    datos: DatosPuntoRecogidaActualizarCliente,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    cliente_id = _requiere_cliente_sesion(usuario_actual)
    punto = actualizar_punto_domicilio_cliente(
        db,
        cliente_id,
        punto_recogida_id,
        nombre=datos.nombre,
        direccion=datos.direccion,
        ciudad=datos.ciudad,
        estado=datos.estado,
        notas_referencia=datos.notas_referencia,
    )

    registrar_evento(
        db,
        modulo="catalogo",
        accion="UPDATE",
        resumen=f"Domicilio de recogida {punto_recogida_id} actualizado por cliente {cliente_id}",
        usuario_id=usuario_actual["id"],
        tabla_afectada="puntos_recogida",
        registro_id=punto_recogida_id,
        ip_origen=obtener_ip_origen(request),
    )

    return {"mensaje": "Domicilio de recogida actualizado", "punto_recogida": punto}


@router.put("/mi-perfil/puntos-recogida/{punto_recogida_id}/predeterminado")
def marcar_mi_punto_predeterminado(
    punto_recogida_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    cliente_id = _requiere_cliente_sesion(usuario_actual)
    punto = marcar_punto_predeterminado_cliente(db, cliente_id, punto_recogida_id)

    registrar_evento(
        db,
        modulo="catalogo",
        accion="UPDATE",
        resumen=f"Punto predeterminado del cliente {cliente_id}: {punto_recogida_id}",
        usuario_id=usuario_actual["id"],
        tabla_afectada="clientes_puntos_recogida",
        registro_id=punto_recogida_id,
        ip_origen=obtener_ip_origen(request),
    )

    return {"mensaje": "Punto predeterminado actualizado", "punto_recogida": punto}


@router.delete("/mi-perfil/puntos-recogida/{punto_recogida_id}")
def quitar_mi_punto_recogida(
    punto_recogida_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual),
):
    cliente_id = _requiere_cliente_sesion(usuario_actual)
    resultado = desvincular_punto_de_cliente(db, cliente_id, punto_recogida_id)

    registrar_evento(
        db,
        modulo="catalogo",
        accion="DELETE",
        resumen=f"Punto {punto_recogida_id} desvinculado del cliente {cliente_id}",
        usuario_id=usuario_actual["id"],
        tabla_afectada="clientes_puntos_recogida",
        registro_id=punto_recogida_id,
        ip_origen=obtener_ip_origen(request),
    )

    return resultado


@router.get("/{cliente_id}/puntos-recogida")
def listar_puntos_recogida_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_CLIENTES)),
):
    return {
        "cliente_id": cliente_id,
        "domicilios": listar_puntos_por_cliente(db, cliente_id),
    }


@router.post("/{cliente_id}/puntos-recogida")
def agregar_punto_recogida_cliente(
    cliente_id: int,
    datos: DatosPuntoRecogidaCliente,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_CLIENTES)),
):
    if datos.punto_recogida_id is not None:
        raise HTTPException(
            status_code=422,
            detail="No se vinculan domicilios existentes. Registra los datos completos del domicilio",
        )
    if not datos.nombre:
        raise HTTPException(status_code=422, detail="El nombre del domicilio es requerido")
    if not all([datos.direccion, datos.ciudad, datos.estado, datos.notas_referencia]):
        raise HTTPException(
            status_code=422,
            detail="Se requiere nombre, direccion, ciudad, estado y referencia del domicilio",
        )
    punto = crear_punto_para_cliente(
        db,
        cliente_id,
        nombre=datos.nombre,
        direccion=datos.direccion,
        ciudad=datos.ciudad,
        estado=datos.estado,
        notas_referencia=datos.notas_referencia,
        es_predeterminado=datos.es_predeterminado,
        creado_por_usuario_id=usuario_actual["id"],
    )

    registrar_evento(
        db,
        modulo="catalogo",
        accion="INSERT",
        resumen=f"Admin registro domicilio de recogida para cliente {cliente_id}",
        usuario_id=usuario_actual["id"],
        tabla_afectada="clientes_puntos_recogida",
        registro_id=punto["id"],
        ip_origen=obtener_ip_origen(request),
    )

    return {"mensaje": "Domicilio de recogida agregado al cliente", "punto_recogida": punto}


@router.put("/{cliente_id}/puntos-recogida/{punto_recogida_id}")
def actualizar_domicilio_recogida_cliente(
    cliente_id: int,
    punto_recogida_id: int,
    datos: DatosPuntoRecogidaActualizarCliente,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_CLIENTES)),
):
    punto = actualizar_punto_domicilio_cliente(
        db,
        cliente_id,
        punto_recogida_id,
        nombre=datos.nombre,
        direccion=datos.direccion,
        ciudad=datos.ciudad,
        estado=datos.estado,
        notas_referencia=datos.notas_referencia,
    )

    registrar_evento(
        db,
        modulo="catalogo",
        accion="UPDATE",
        resumen=f"Admin actualizo domicilio {punto_recogida_id} del cliente {cliente_id}",
        usuario_id=usuario_actual["id"],
        tabla_afectada="puntos_recogida",
        registro_id=punto_recogida_id,
        ip_origen=obtener_ip_origen(request),
    )

    return {"mensaje": "Domicilio de recogida actualizado", "punto_recogida": punto}


@router.put("/{cliente_id}/puntos-recogida/{punto_recogida_id}/predeterminado")
def marcar_domicilio_predeterminado_cliente(
    cliente_id: int,
    punto_recogida_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_CLIENTES)),
):
    punto = marcar_punto_predeterminado_cliente(db, cliente_id, punto_recogida_id)

    registrar_evento(
        db,
        modulo="catalogo",
        accion="UPDATE",
        resumen=f"Domicilio predeterminado del cliente {cliente_id}: {punto_recogida_id}",
        usuario_id=usuario_actual["id"],
        tabla_afectada="clientes_puntos_recogida",
        registro_id=punto_recogida_id,
        ip_origen=obtener_ip_origen(request),
    )

    return {"mensaje": "Domicilio predeterminado actualizado", "punto_recogida": punto}


@router.delete("/{cliente_id}/puntos-recogida/{punto_recogida_id}")
def quitar_domicilio_recogida_cliente(
    cliente_id: int,
    punto_recogida_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_CLIENTES)),
):
    resultado = desvincular_punto_de_cliente(db, cliente_id, punto_recogida_id)

    registrar_evento(
        db,
        modulo="catalogo",
        accion="DELETE",
        resumen=f"Admin desvinculo domicilio {punto_recogida_id} del cliente {cliente_id}",
        usuario_id=usuario_actual["id"],
        tabla_afectada="clientes_puntos_recogida",
        registro_id=punto_recogida_id,
        ip_origen=obtener_ip_origen(request),
    )

    return resultado


@router.get("")
def listar_clientes_endpoint(
    pagina: int = Query(default=1, ge=1),
    limite: int = Query(default=10, ge=1, le=200),
    buscar: str | None = Query(default=None, description="Nombre, apellido, documento, teléfono"),
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_CLIENTES)),
):
    return listar_clientes(db, pagina=pagina, limite=limite, buscar=buscar)


@router.get("/{cliente_id}")
def obtener_cliente_endpoint(
    cliente_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_LEER_CLIENTES)),
):
    return obtener_cliente(db, cliente_id)


@router.post("/")
def crear_cliente_desde_admin(
    datos: DatosClienteNuevo,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_CREAR_CLIENTES)),
):
    return crear_cliente(db, datos, usuario_actual["id"])


@router.put("/{cliente_id}")
def actualizar_cliente_endpoint(
    cliente_id: int,
    datos: DatosClienteActualizar,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_EDITAR_CLIENTES)),
):
    return actualizar_cliente(db, cliente_id, datos, usuario_actual["id"])


@router.delete("/{cliente_id}")
def desactivar_cliente_endpoint(
    cliente_id: int,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(requiere_permiso(PERMISO_BORRAR_CLIENTES)),
):
    return desactivar_cliente(db, cliente_id, usuario_actual["id"])
