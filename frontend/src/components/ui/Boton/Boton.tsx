import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './Boton.css';

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'primario' | 'secundario' | 'fantasma' | 'peligro';
  tamano?: 'sm' | 'md' | 'lg';
  anchoCompleto?: boolean;
  children: ReactNode;
}

/**
 * Boton — Componente atómico reutilizable.
 * Se usa tanto en el lado público como en el admin.
 */
export default function Boton({
  variante = 'primario',
  tamano = 'md',
  anchoCompleto = false,
  children,
  className = '',
  ...props
}: BotonProps) {
  const classes = [
    'boton',
    `boton--${variante}`,
    `boton--${tamano}`,
    anchoCompleto ? 'boton--ancho-completo' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
