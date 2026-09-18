import { useCallback, useEffect, useState } from 'react';
import { obtenerCaptcha } from '../services/autenticacion';

export default function useCaptcha() {
  const [token, setToken] = useState('');
  const [pregunta, setPregunta] = useState('');
  const [imagen, setImagen] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [cargando, setCargando] = useState(false);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const captcha = await obtenerCaptcha();
      setToken(captcha.token);
      setPregunta(captcha.pregunta);
      setImagen(captcha.imagen ?? '');
      setRespuesta('');
    } catch {
      setToken('');
      setImagen('');
      setPregunta('No se pudo cargar el CAPTCHA');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return { token, pregunta, imagen, respuesta, setRespuesta, recargar, cargando };
}
