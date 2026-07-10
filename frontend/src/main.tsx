import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/main.css'
import App from './App.tsx'
import { ReservasProvider } from './context/Reservas';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReservasProvider>
      <App />
    </ReservasProvider>
  </StrictMode>,
)
