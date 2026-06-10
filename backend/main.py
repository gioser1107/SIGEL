from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import SQLAlchemyError

from utilidades.archivo_imagen_utilidad import UPLOAD_ROOT, asegurar_carpeta_uploads

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

app = FastAPI(title="API Travel BQTO", version="1.1.0")

asegurar_carpeta_uploads()
app.mount("/api/archivos", StaticFiles(directory=Path(UPLOAD_ROOT)), name="archivos")


@app.exception_handler(SQLAlchemyError)
def manejar_error_base_de_datos(request: Request, error: SQLAlchemyError):
    return JSONResponse(
        status_code=503,
        content={
            "detalle": "No se pudo conectar o consultar la base de datos MySQL",
            "error": str(error.orig) if hasattr(error, "orig") else str(error),
            "sugerencia": "Revisa backend/.env con usuario y contraseña correctos de MySQL",
        },
    )


@app.exception_handler(Exception)
def manejar_error_general(request: Request, error: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "detalle": "Error interno del servidor",
            "error": str(error),
            "tipo": type(error).__name__,
        },
    )


# Permite que React (Vite) consuma la API desde el navegador
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000",
    ],
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
        },
    }
