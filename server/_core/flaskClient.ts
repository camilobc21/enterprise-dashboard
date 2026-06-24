/**
 * Flask API Client
 * Cliente para comunicarse con la API Flask (app.py)
 * Maneja todas las llamadas a los endpoints de WiFi
 */

const FLASK_API_URL = process.env.FLASK_API_URL || 'https://wolverine-punctual-immorally.ngrok-free.dev';

interface FlaskResponse<T> {
  ok: boolean;
  error?: string;
  [key: string]: any;
}

/**
 * Realizar llamada GET a Flask
 */
export async function flaskGet<T = any>(endpoint: string): Promise<T | null> {
  try {
    const response = await fetch(`${FLASK_API_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '69420',
      },
    });

    if (!response.ok) {
      console.error(`[Flask] GET ${endpoint} failed:`, response.status);
      return null;
    }

    const data: T = await response.json();
    return data;
  } catch (error) {
    console.error(`[Flask] GET ${endpoint} error:`, error);
    return null;
  }
}

/**
 * Realizar llamada POST a Flask
 */
export async function flaskPost<T = any>(endpoint: string, payload: any): Promise<T | null> {
  try {
    const response = await fetch(`${FLASK_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '69420',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`[Flask] POST ${endpoint} failed:`, response.status);
      return null;
    }

    const data: T = await response.json();
    return data;
  } catch (error) {
    console.error(`[Flask] POST ${endpoint} error:`, error);
    return null;
  }
}

/**
 * Obtener datos del dashboard desde Flask
 */
export async function getDashboardData(): Promise<any> {
  return flaskGet('/api/dashboard');
}

/**
 * Obtener último escaneo
 */
export async function getLastScan(): Promise<any> {
  const data = await getDashboardData();
  if (data && data.ultimo_escaneo) {
    return data.ultimo_escaneo;
  }
  return null;
}

/**
 * Obtener canales del último escaneo
 */
export async function getChannels(): Promise<any[]> {
  const data = await getDashboardData();
  if (data && data.canales) {
    return data.canales;
  }
  return [];
}

/**
 * Obtener alertas
 */
export async function getAlerts(): Promise<any[]> {
  const data = await getDashboardData();
  if (data && data.alertas) {
    return data.alertas;
  }
  return [];
}

/**
 * Obtener predicciones
 */
export async function getPredictions(): Promise<any> {
  const data = await getDashboardData();
  if (data && data.prediccion) {
    return data.prediccion;
  }
  return null;
}

/**
 * Obtener histórico
 */
export async function getHistory(): Promise<any[]> {
  const data = await getDashboardData();
  if (data && data.historico) {
    return data.historico;
  }
  return [];
}

/**
 * Obtener anomalías futuras
 */
export async function getFutureAnomalies(): Promise<any[]> {
  const data = await getDashboardData();
  if (data && data.anomalias_futuras) {
    return data.anomalias_futuras;
  }
  return [];
}

/**
 * Obtener redes detectadas
 */
export async function getDetectedNetworks(): Promise<any[]> {
  const data = await getDashboardData();
  if (data && (data as any).redes) {
    return (data as any).redes;
  }
  return [];
}

/**
 * Verificar si hay datos disponibles
 */
export async function hasData(): Promise<boolean> {
  const data = await getDashboardData();
  return !!(data && !(data as any).sin_datos);
}
