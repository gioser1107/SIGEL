import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import { numeroDesdeMonto, textoMontoVisible } from '../../../utils/formatoMoneda';

type PropsCampoMonto = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: number | string;
  onValorNumerico?: (n: number) => void;
  onTexto?: (texto: string) => void;
};

/**
 * Precio/monto sin el 0 inicial: en el teléfono el cursor queda delante y 45 acaba en 450.
 * El texto se guarda tal cual mientras se escribe (permite 0.50).
 */
export default function CampoMonto({
  value,
  onValorNumerico,
  onTexto,
  className = '',
  ...rest
}: PropsCampoMonto) {
  const enfocado = useRef(false);
  const [texto, setTexto] = useState(() => textoMontoVisible(value));

  useEffect(() => {
    if (!enfocado.current) {
      setTexto(textoMontoVisible(value));
    }
  }, [value]);

  return (
    <input
      {...rest}
      className={className}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={texto}
      onFocus={(e) => {
        enfocado.current = true;
        rest.onFocus?.(e);
      }}
      onBlur={(e) => {
        enfocado.current = false;
        setTexto(textoMontoVisible(numeroDesdeMonto(texto)));
        rest.onBlur?.(e);
      }}
      onChange={(e) => {
        const bruto = e.target.value.replace(',', '.').replace(/[^\d.]/g, '');
        const partes = bruto.split('.');
        const normalizado =
          partes.length > 2 ? `${partes[0]}.${partes.slice(1).join('')}` : bruto;
        const [entero = '', decimales = ''] = normalizado.split('.');
        const conDecimales =
          normalizado.includes('.') ? `${entero}.${decimales.slice(0, 2)}` : entero;
        setTexto(conDecimales);
        onTexto?.(conDecimales);
        onValorNumerico?.(numeroDesdeMonto(conDecimales));
      }}
    />
  );
}
