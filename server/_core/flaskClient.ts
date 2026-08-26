/**
 * Flask API Client - Robust Implementation
 * Cliente para comunicarse con la API Flask robusta
 * Incluye: reintentos, timeouts, logging, health checks
 */

const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:5000';
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // ms
const REQUEST_TIMEOUT = 10000; // ms

interface FlaskResponse<T> {
  ok: boolean;
  error?: string;
  [key: string]: any;
}

/**
 * Realizar llamada GET a Flask con reintentos
 */
export async function flaskGet<T = any>(endpoint: string, attempt = 1): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(`${FLASK_API_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[Flask] GET ${endpoint} failed: ${response.status}`);
      if (response.status >= 500 && attempt < RETRY_ATTEMPTS) {
        console.log(`[Flask] Reintentando (${attempt}/${RETRY_ATTEMPTS}) en ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return flaskGet<T>(endpoint, attempt + 1);
      }
      return null;
    }

    const data: T = await response.json();
    console.debug(`[Flask] GET ${endpoint} success`);
    return data;
  } catch (error) {
    console.error(`[Flask] GET ${endpoint} error (attempt ${attempt}/${RETRY_ATTEMPTS}):`, error);
    if (attempt < RETRY_ATTEMPTS) {
      console.log(`[Flask] Reintentando (${attempt}/${RETRY_ATTEMPTS}) en ${RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return flaskGet<T>(endpoint, attempt + 1);
    }
    return null;
  }
}

/**
 * Realizar llamada POST a Flask con reintentos
 */
export async function flaskPost<T = any>(endpoint: string, payload: any, attempt = 1): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(`${FLASK_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[Flask] POST ${endpoint} failed: ${response.status}`);
      if (response.status >= 500 && attempt < RETRY_ATTEMPTS) {
        console.log(`[Flask] Reintentando (${attempt}/${RETRY_ATTEMPTS}) en ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return flaskPost<T>(endpoint, payload, attempt + 1);
      }
      return null;
    }

    const data: T = await response.json();
    console.debug(`[Flask] POST ${endpoint} success`);
    return data;
  } catch (error) {
    console.error(`[Flask] POST ${endpoint} error (attempt ${attempt}/${RETRY_ATTEMPTS}):`, error);
    if (attempt < RETRY_ATTEMPTS) {
      console.log(`[Flask] Reintentando (${attempt}/${RETRY_ATTEMPTS}) en ${RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return flaskPost<T>(endpoint, payload, attempt + 1);
    }
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

/**
 * Health check de Flask
 */
export async function healthCheck(): Promise<{ ok: boolean; connected: boolean; status?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${FLASK_API_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[Flask] Health check failed: ${response.status}`);
      return { ok: false, connected: false };
    }

    const data = await response.json();
    console.debug('[Flask] Health check OK');
    return {
      ok: data.ok,
      connected: data.db === 'connected',
      status: data.status,
    };
  } catch (error) {
    console.error('[Flask] Health check error:', error);
    return { ok: false, connected: false };
  }
}

/**
 * Obtener métricas del sistema
 */
export async function getMetrics(): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(`${FLASK_API_URL}/api/metrics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[Flask] Metrics failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.debug('[Flask] Metrics retrieved');
    return data.metrics;
  } catch (error) {
    console.error('[Flask] Metrics error:', error);
    return null;
  }
}
