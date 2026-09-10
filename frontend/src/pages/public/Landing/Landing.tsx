import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './Landing.css';
import CalendarioViajes from './components/CalendarioViajes/CalendarioViajes';
import HeroCarousel from './components/HeroCarousel/HeroCarousel';
import SeccionBeneficios from './components/SeccionBeneficios/SeccionBeneficios';
import SeccionViajes from './components/SeccionViajes/SeccionViajes';
import SeccionComentarios from './components/SeccionComentarios/SeccionComentarios';
import SeccionNosotros from './components/SeccionNosotros/SeccionNosotros';
import SeccionContacto from './components/SeccionContacto/SeccionContacto';

/**
 * Landing — Página principal del catálogo turístico.
 */
export default function Landing() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = hash.replace('#', '');
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [hash]);

  return (
    <div className="landing">
      <HeroCarousel />
      <CalendarioViajes />

      <SeccionBeneficios />

      <SeccionViajes />

      <SeccionComentarios />

      <SeccionNosotros />

      <SeccionContacto />
    </div>
  );
}