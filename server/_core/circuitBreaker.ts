// @ts-ignore
import CircuitBreaker from 'opossum';
import { logger } from './logging';

/**
 * Circuit breaker configuration for external service calls
 */
const breakerOptions = {
  timeout: 5000, // 5 second timeout
  errorThresholdPercentage: 50, // Open circuit after 50% failures
  resetTimeout: 30000, // Try again after 30 seconds
  name: 'Flask Backend',
  rollingCountBuckets: 10,
  rollingCountTimeout: 10000,
  volumeThreshold: 10 // Minimum requests before evaluating
};

/**
 * Create circuit breaker for Flask API calls
 */
export const flaskBreaker = new CircuitBreaker(
  async (method: string, url: string, options: any = {}) => {
    logger.debug('Circuit breaker calling Flask', { method, url });
    
    const response = await fetch(url, {
      method,
      timeout: 5000,
      ...options
    });

    if (!response.ok) {
      throw new Error(`Flask API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },
  breakerOptions
);

/**
 * Event handlers for circuit breaker
 */
flaskBreaker.on('open', () => {
  logger.warn('Circuit breaker opened - Flask backend unavailable');
});

flaskBreaker.on('halfOpen', () => {
  logger.info('Circuit breaker half-open - Testing Flask backend');
});

flaskBreaker.on('close', () => {
  logger.info('Circuit breaker closed - Flask backend recovered');
});

flaskBreaker.on('failure', (error: Error) => {
  logger.error('Circuit breaker failure', { error: error.message });
});

/**
 * Safe wrapper for Flask API calls with fallback
 */
export async function callFlaskAPI(
  method: string,
  url: string,
  options: any = {},
  fallback: any = null
) {
  try {
    return await flaskBreaker.fire(method, url, options);
  } catch (error) {
    logger.error('Flask API call failed', {
      error: error instanceof Error ? error.message : String(error),
      url,
      method
    });
    
    // Return fallback value if circuit is open
    if (flaskBreaker.opened) {
      logger.warn('Returning fallback data - circuit breaker is open');
      return fallback;
    }
    
    throw error;
  }
}

/**
 * Get circuit breaker status
 */
export function getCircuitBreakerStatus() {
  return {
    name: 'Flask Backend',
    state: flaskBreaker.opened ? 'OPEN' : flaskBreaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
    stats: {
      fires: flaskBreaker.stats.fires,
      successes: flaskBreaker.stats.successes,
      failures: flaskBreaker.stats.failures,
      timeouts: flaskBreaker.stats.timeouts,
      rejects: flaskBreaker.stats.rejects,
      fallbacks: flaskBreaker.stats.fallbacks
    }
  };
}
