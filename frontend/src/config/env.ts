export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Configuración general de la API
export const apiConfig = {
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
};
