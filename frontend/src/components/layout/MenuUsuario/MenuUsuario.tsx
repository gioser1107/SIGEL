import { useEffect, useRef, useState, type ReactNode } from 'react';
import ModalCambiarContrasena from './ModalCambiarContrasena';
import './MenuUsuario.css';

interface MenuUsuarioProps {
  children: ReactNode;
  triggerClassName?: string;
}

export default function MenuUsuario({ children, triggerClassName = '' }: MenuUsuarioProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuAbierto) return;

    function cerrarAlClickExterno(evento: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target as Node)) {
        setMenuAbierto(false);
      }
    }

    function cerrarConEscape(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setMenuAbierto(false);
    }

    document.addEventListener('mousedown', cerrarAlClickExterno);
    document.addEventListener('keydown', cerrarConEscape);
    return () => {
      document.removeEventListener('mousedown', cerrarAlClickExterno);
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, [menuAbierto]);

  return (
    <div className="menu-usuario" ref={contenedorRef}>
      <button
        type="button"
        className={`menu-usuario__disparador ${triggerClassName}`.trim()}
        aria-label="Menú de usuario"
        aria-haspopup="menu"
        aria-expanded={menuAbierto}
        onClick={() => setMenuAbierto((abierto) => !abierto)}
      >
        {children}
      </button>

      {menuAbierto && (
        <div className="menu-usuario__panel" role="menu">
          <button
            type="button"
            role="menuitem"
            className="menu-usuario__opcion"
            onClick={() => {
              setMenuAbierto(false);
              setModalAbierto(true);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Cambiar contraseña
          </button>
        </div>
      )}

      <ModalCambiarContrasena abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} />
    </div>
  );
}
