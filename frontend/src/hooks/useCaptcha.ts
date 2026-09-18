import { useCallback, useEffect, useState } from 'react';
import { obtenerCaptcha } from '../services/autenticacion';

export default function useCaptcha() {
  const [token, setToken] = useState('');
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [cargando, setCargando] = useState(false);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const captcha = await obtenerCaptcha();
      setToken(captcha.token);
      setPregunta(captcha.pregunta);
      setRespuesta('');
    } catch {
      setToken('');
      setPregunta('No se pudo cargar el CAPTCHA');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return { token, pregunta, respuesta, setRespuesta, recargar, cargando };
}
