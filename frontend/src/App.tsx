import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import LayoutPublico from './components/layout/LayoutPublico/LayoutPublico';
import LayoutAdmin from './components/layout/LayoutAdmin/LayoutAdmin';
import LayoutCliente from './components/layout/LayoutCliente/LayoutCliente';
import RutaPrivada from './components/rutas/RutaPrivada';

// Páginas Públicas
import Landing from './pages/public/Landing/Landing';
import Detalle from './pages/public/Detalle/Detalle';
import Agenda from './pages/public/Agenda/Agenda';
import InicioSesion from './pages/public/InicioSesion/InicioSesion';
import Registro from './pages/public/Registro/Registro';

// Páginas Admin
import Dashboard from './pages/admin/Dashboard/Dashboard';
import Destinos from './pages/admin/Destinos/Destinos';
import Reservas from './pages/admin/Reservas/Reservas';
import CrearReserva from './pages/admin/Reservas/CrearReserva/CrearReserva';
import Planificacion from './pages/admin/Planificacion/Planificacion';
import Cotizaciones from './pages/admin/Cotizaciones/Cotizaciones';
import Flota from './pages/admin/Flota/Flota';
import UsuariosRoles from './pages/admin/UsuariosRoles/UsuariosRoles';
import Clientes from './pages/admin/Clientes/Clientes';
import PuntosRecogidaAdmin from './pages/admin/PuntosRecogida/PuntosRecogida';
import Pagos from './pages/admin/Pagos/Pagos';
import Bitacora from './pages/admin/Bitacora/Bitacora';
import ModuloResenas from './pages/admin/Resenas/Resenas';
import Abordaje from './pages/admin/Abordaje/Abordaje';
import ReporteViaje from './pages/admin/ReporteViaje/ReporteViaje';
import ReportesEstadisticos from './pages/admin/ReportesEstadisticos/ReportesEstadisticos';

// Páginas Cliente
import MisViajes from './pages/client/MisViajes/MisViajes';
import RegistrarPago from './pages/client/RegistrarPago/RegistrarPago';
import AbonarReserva from './pages/client/AbonarReserva/AbonarReserva';
import MisResenas from './pages/client/MisResenas/MisResenas';

import { AutenticacionProvider } from './context/Autenticacion';
import MisSolicitudes from './pages/client/MisSolicitudes/MisSolicitudes';
import MisPuntosRecogida from './pages/client/MisPuntosRecogida/MisPuntosRecogida';

/**
 * App — Componente raíz con el sistema de rutas.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AutenticacionProvider>
        <Routes>
          {/* RUTAS PÚBLICAS (con Navbar + Footer) */}
          <Route element={<LayoutPublico />}>
            <Route path="/" element={<Landing />} />
            <Route path="/destino/:id" element={<Detalle />} />
            <Route path="/agenda" element={<Agenda />} />
          </Route>

          {/* LOGIN (pantalla completa, sin layout) */}
          <Route path="/iniciar-sesion" element={<InicioSesion />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/admin/inciar-sesion" element={<Navigate to="/iniciar-sesion" replace />} />

          {/* RUTAS ADMIN (con Sidebar, requiere sesión) */}
          <Route
            path="/admin"
            element={
              <RutaPrivada>
                <LayoutAdmin />
              </RutaPrivada>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route
              path="destinos"
              element={
                <RutaPrivada modulo="destinos">
                  <Destinos />
                </RutaPrivada>
              }
            />
            <Route
              path="reservas"
              element={
                <RutaPrivada modulo="reservas">
                  <Reservas />
                </RutaPrivada>
              }
            />
            <Route
              path="reservas/crear"
              element={
                <RutaPrivada modulo="reservas">
                  <CrearReserva />
                </RutaPrivada>
              }
            />
            <Route
              path="planificacion"
              element={
                <RutaPrivada modulo="planificacion">
                  <Planificacion />
                </RutaPrivada>
              }
            />
            <Route
              path="flota"
              element={
                <RutaPrivada modulo="transporte_flota">
                  <Flota />
                </RutaPrivada>
              }
            />
            <Route
              path="cotizaciones"
              element={
                <RutaPrivada modulo="cotizaciones">
                  <Cotizaciones />
                </RutaPrivada>
              }
            />
            <Route
              path="clientes"
              element={
                <RutaPrivada modulo="clientes">
                  <Clientes />
                </RutaPrivada>
              }
            />
            <Route
              path="puntos-recogida"
              element={
                <RutaPrivada modulo="puntos_recogida">
                  <PuntosRecogidaAdmin />
                </RutaPrivada>
              }
            />
            <Route
              path="pagos"
              element={
                <RutaPrivada modulo="reportes_pago">
                  <Pagos />
                </RutaPrivada>
              }
            />
            <Route
              path="bitacora"
              element={
                <RutaPrivada modulo="bitacora">
                  <Bitacora />
                </RutaPrivada>
              }
            />
            <Route
              path="reporte-viaje"
              element={
                <RutaPrivada modulo="planificacion">
                  <ReporteViaje />
                </RutaPrivada>
              }
            />
            <Route
              path="reportes"
              element={
                <RutaPrivada modulos={['reservas', 'reportes_pago', 'clientes']}>
                  <ReportesEstadisticos />
                </RutaPrivada>
              }
            />
            <Route
              path="abordaje"
              element={
                <RutaPrivada modulo="abordaje">
                  <Abordaje />
                </RutaPrivada>
              }
            />
            <Route
              path="resenas"
              element={
                <RutaPrivada modulo="resenas">
                  <ModuloResenas />
                </RutaPrivada>
              }
            />
            <Route
              path="usuarios-roles"
              element={
                <RutaPrivada modulos={['usuarios', 'roles', 'permisos']}>
                  <UsuariosRoles />
                </RutaPrivada>
              }
            />
            <Route path="usuarios" element={<Navigate to="/admin/usuarios-roles" replace />} />
            <Route path="roles" element={<Navigate to="/admin/usuarios-roles" replace />} />
            <Route path="permisos" element={<Navigate to="/admin/usuarios-roles" replace />} />
          </Route>

          {/* RUTAS CLIENTE (con Header del cliente) */}
          <Route
            path="/client"
            element={
              <RutaPrivada requiereCliente>
                <LayoutCliente />
              </RutaPrivada>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<MisViajes />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="reservas/:reservaId/abonar" element={<AbonarReserva />} />
            <Route path="registrar-pago" element={<RegistrarPago />} />
            <Route path="solicitudes" element={<MisSolicitudes />} />
            <Route path="puntos-recogida" element={<MisPuntosRecogida />} />
            <Route path="resenas" element={<MisResenas />} />
          </Route>
        </Routes>
      </AutenticacionProvider>
    </BrowserRouter>
  );
}
