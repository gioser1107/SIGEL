import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/main.css'
import App from './App.tsx'
import { ReservasProvider } from './context/Reservas';

function bloquearGestosDeZoom() {
  const evitar = (evento: Event) => {
    evento.preventDefault();
  };
  document.addEventListener('gesturestart', evitar, { passive: false });
  document.addEventListener('gesturechange', evitar, { passive: false });
  document.addEventListener('gestureend', evitar, { passive: false });
}

bloquearGestosDeZoom();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReservasProvider>
      <App />
    </ReservasProvider>
  </StrictMode>,
)
