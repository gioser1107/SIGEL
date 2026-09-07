from pathlib import Path
from typing import Optional
from contextlib import asynccontextmanager
import asyncio
import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from modelos.destino_imagen_modelo import UPLOAD_ROOT, asegurar_carpeta_uploads

from controladores.auth_controlador import router as router_auth
from controladores.bitacora_controlador import router as router_bitacora
from controladores.catalogo_controlador import router as router_catalogo
from controladores.destino_controlador import router as router_destinos
from controladores.cliente_controlador import router as router_clientes
from controladores.cotizacion_controlador import router as router_cotizaciones
from controladores.permiso_controlador import router as router_permisos
from controladores.rol_controlador import router as router_roles
from controladores.ubicacion_controlador import router as router_ubicaciones
from controladores.usuario_controlador import router as router_usuarios
from controladores.viaje_controlador import router as router_viajes
from controladores.reservas_controlador import router as router_reservas
from controladores.asiento_controlador import router as router_asientos
from controladores.unidad_transporte_controlador import router as router_unidades
from controladores.puntos_recogida_controlador import router as router_puntos_recogida
from controladores.pago_controlador import router as router_pagos
from controladores.moneda_controlador import router as router_monedas
from controladores.metodo_pago_controlador import router as router_metodos_pago
from controladores.tasa_controlador import router as router_tasas
from controladores.banco_controlador import router as router_bancos
from controladores.punto_venta_controlador import router as router_puntos_venta
from controladores.abordaje_controlador import router as router_abordajes
from controladores.resena_controlador import router as router_resenas
from controladores.reporte_estadistico_controlador import router as router_reportes

logger = logging.getLogger("sigel")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    from utilidades.tasa_bcv_programada import (
        bucle_tasa_bcv_diaria,
        ejecutar_sincronizacion_bcv,
        tasa_bcv_auto_activa,
        tasa_bcv_diaria_activa,
    )

    tarea_bcv = None
    if tasa_bcv_auto_activa():
        ejecutar_sincronizacion_bcv(solo_si_falta=True)
    if tasa_bcv_diaria_activa():
        tarea_bcv = asyncio.create_task(bucle_tasa_bcv_diaria())
    yield
    if tarea_bcv is not None:
        tarea_bcv.cancel()
        try:
            await tarea_bcv
        except asyncio.CancelledError:
            pass


app = FastAPI(title="API Travel BQTO", version="1.3.0", lifespan=lifespan)

asegurar_carpeta_uploads()
app.mount("/api/archivos", StaticFiles(directory=Path(UPLOAD_ROOT)), name="archivos")

def _cuerpo_error(mensaje: str) -> dict:
    """Mismo texto en `detalle` (API del proyecto) y `detail` (FastAPI / cliente)."""
    return {"detalle": mensaje, "detail": mensaje}


@app.exception_handler(IntegrityError)
def manejar_conflicto_integridad(request: Request, error: IntegrityError):
    return JSONResponse(
        status_code=409,
        content=_cuerpo_error(
            "Conflicto de concurrencia: el cupo, asiento o registro ya fue tomado"
        ),
    )


@app.exception_handler(SQLAlchemyError)
def manejar_error_base_de_datos(request: Request, error: SQLAlchemyError):
    logger.exception("Fallo de base de datos: %s", error)
    return JSONResponse(
        status_code=503,
        content=_cuerpo_error(
            "El servicio no puede completar la operación. Intente de nuevo más tarde."
        ),
    )


@app.exception_handler(Exception)
def manejar_error_general(request: Request, error: Exception):
    logger.exception("Error interno no controlado: %s", error)
    return JSONResponse(
        status_code=500,
        content=_cuerpo_error("Error interno del servidor"),
    )


ORIGENES_DESARROLLO = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
]


def _origenes_cors() -> list[str]:
    extra = os.getenv("CORS_ORIGENES", "")
    origenes = list(ORIGENES_DESARROLLO)
    for parte in extra.split(","):
        url = parte.strip()
        if url and url not in origenes:
            origenes.append(url)
    return origenes


app.add_middleware(
    CORSMiddleware,
    allow_origins=_origenes_cors(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router_auth, prefix="/api")
app.include_router(router_catalogo, prefix="/api")
app.include_router(router_destinos, prefix="/api")
app.include_router(router_clientes, prefix="/api")
app.include_router(router_permisos, prefix="/api")
app.include_router(router_usuarios, prefix="/api")
app.include_router(router_roles, prefix="/api")
app.include_router(router_ubicaciones, prefix="/api")
app.include_router(router_viajes, prefix="/api")
app.include_router(router_cotizaciones, prefix="/api")
app.include_router(router_bitacora, prefix="/api")
app.include_router(router_reservas, prefix="/api")
app.include_router(router_asientos, prefix="/api")
app.include_router(router_unidades, prefix="/api")
app.include_router(router_puntos_recogida, prefix="/api")
app.include_router(router_pagos, prefix="/api")
app.include_router(router_monedas, prefix="/api")
app.include_router(router_metodos_pago, prefix="/api")
app.include_router(router_tasas, prefix="/api")
app.include_router(router_bancos, prefix="/api")
app.include_router(router_puntos_venta, prefix="/api")
app.include_router(router_abordajes, prefix="/api")
app.include_router(router_resenas, prefix="/api")
app.include_router(router_reportes, prefix="/api")

@app.get("/api")
def ruta_raiz_api():
    return {
        "mensaje": "API Travel BQTO activa",
        "documentacion": "/docs",
        "modulos": {
            "auth": "/api/auth",
            "catalogo": "/api/catalogo",
            "destinos": "/api/destinos",
            "clientes": "/api/clientes",
            "usuarios": "/api/usuarios",
            "roles": "/api/roles",
            "permisos": "/api/permisos",
            "ubicaciones": "/api/ubicaciones",
            "viajes": "/api/viajes",
            "cotizaciones": "/api/cotizaciones",
            "bitacora": "/api/bitacora",
            "reservas": "/api/reservas",
            "asientos": "/api/asientos",
            "unidades": "/api/unidades",
            "puntos_recogida": "/api/puntos-recogida (solo consulta)",
            "pagos": "/api/pagos",
            "monedas": "/api/monedas",
            "metodos_pago": "/api/metodos-pago",
            "tasas": "/api/tasas",
            "bancos": "/api/bancos",
            "puntos_venta": "/api/puntos-venta",
            "abordajes": "/api/abordajes",
            "reportes": "/api/reportes/estadisticos",
        },
    }


DIRECTORIO_INTERFAZ = Path(__file__).resolve().parent.parent / "frontend" / "dist"
PREFIJOS_SIN_SPA = {"api", "docs", "redoc", "openapi.json"}


def _archivo_de_interfaz(ruta_relativa: str) -> Optional[Path]:
    if not DIRECTORIO_INTERFAZ.is_dir():
        return None
    raiz = DIRECTORIO_INTERFAZ.resolve()
    candidato = (DIRECTORIO_INTERFAZ / ruta_relativa).resolve()
    if raiz not in candidato.parents and candidato != raiz:
        return None
    if candidato.is_file():
        return candidato
    return None


@app.get("/")
def servir_inicio():
    index = _archivo_de_interfaz("index.html")
    if index is None:
        return JSONResponse(
            status_code=503,
            content={
                "detalle": "La interfaz no está compilada",
                "sugerencia": "En tu PC de desarrollo ejecuta npm run build en frontend/",
            },
        )
    return FileResponse(index)


@app.get("/{ruta_spa:path}")
def servir_interfaz(ruta_spa: str):
    primera = ruta_spa.split("/", 1)[0]
    if primera in PREFIJOS_SIN_SPA:
        return JSONResponse(status_code=404, content={"detalle": "Ruta no encontrada"})

    archivo = _archivo_de_interfaz(ruta_spa)
    if archivo is not None:
        return FileResponse(archivo)

    index = _archivo_de_interfaz("index.html")
    if index is None:
        return JSONResponse(status_code=404, content={"detalle": "Ruta no encontrada"})
    return FileResponse(index)
