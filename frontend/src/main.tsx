import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/main.css'
import App from './App.tsx'
import { ReservasProvider } from './context/Reservas';

function bloquearZoomMovil() {
  const evitar = (evento: Event) => {
    evento.preventDefault();
  };
  document.addEventListener('gesturestart', evitar, { passive: false });
  document.addEventListener('gesturechange', evitar, { passive: false });
  document.addEventListener('gestureend', evitar, { passive: false });

  document.addEventListener(
    'touchmove',
    (evento: TouchEvent) => {
      if (evento.touches.length > 1) {
        evento.preventDefault();
      }
    },
    { passive: false },
  );

  let ultimoToque = 0;
  document.addEventListener(
    'touchend',
    (evento: TouchEvent) => {
      const destino = evento.target;
      if (
        destino instanceof Element &&
        destino.closest('button, a, input, select, textarea, label, [role="button"]')
      ) {
        ultimoToque = Date.now();
        return;
      }
      const ahora = Date.now();
      if (ahora - ultimoToque <= 350) {
        evento.preventDefault();
      }
      ultimoToque = ahora;
    },
    { passive: false },
  );
}

bloquearZoomMovil();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReservasProvider>
      <App />
    </ReservasProvider>
  </StrictMode>,
)
