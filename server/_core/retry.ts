import { logger } from './logging';

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
}

const defaultConfig: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true
};

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
  attempt: number,
  config: Required<RetryConfig>
): number {
  let delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  
  // Cap at maxDelayMs
  delay = Math.min(delay, config.maxDelayMs);
  
  // Add jitter (random 0-25% of delay)
  if (config.jitter) {
    const jitterAmount = delay * 0.25 * Math.random();
    delay += jitterAmount;
  }
  
  return Math.floor(delay);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  operationName: string,
  userConfig: RetryConfig = {}
): Promise<T> {
  const config = { ...defaultConfig, ...userConfig };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      logger.debug(`Attempting ${operationName}`, { attempt: attempt + 1, maxRetries: config.maxRetries + 1 });
      const result = await fn();
      
      if (attempt > 0) {
        logger.info(`${operationName} succeeded after ${attempt} retries`);
      }
      
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < config.maxRetries) {
        const delay = calculateDelay(attempt, config);
        logger.warn(`${operationName} failed, retrying in ${delay}ms`, {
          attempt: attempt + 1,
          error: lastError.message,
          delay
        });
        
        await sleep(delay);
      } else {
        logger.error(`${operationName} failed after ${config.maxRetries + 1} attempts`, {
          error: lastError.message
        });
      }
    }
  }

  throw lastError || new Error(`${operationName} failed`);
}

/**
 * Retry with custom error handler
 */
export async function retryWithHandler<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: Error, attempt: number) => boolean,
  operationName: string,
  userConfig: RetryConfig = {}
): Promise<T> {
  const config = { ...defaultConfig, ...userConfig };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry
      if (!shouldRetry(lastError, attempt)) {
        logger.error(`${operationName} failed with non-retryable error`, {
          error: lastError.message
        });
        throw lastError;
      }
      
      if (attempt < config.maxRetries) {
        const delay = calculateDelay(attempt, config);
        logger.warn(`${operationName} failed, retrying in ${delay}ms`, {
          attempt: attempt + 1,
          error: lastError.message
        });
        
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error(`${operationName} failed`);
}

/**
 * Batch retry - retry multiple operations with shared state
 */
export async function batchRetry<T>(
  operations: Array<{ name: string; fn: () => Promise<T> }>,
  userConfig: RetryConfig = {}
): Promise<T[]> {
  const config = { ...defaultConfig, ...userConfig };
  const results: T[] = [];
  const failed: string[] = [];

  for (const operation of operations) {
    try {
      const result = await retryWithBackoff(operation.fn, operation.name, config);
      results.push(result);
    } catch (error) {
      failed.push(operation.name);
      logger.error(`Batch operation failed: ${operation.name}`, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  if (failed.length > 0) {
    logger.warn(`Batch retry completed with failures`, {
      total: operations.length,
      failed: failed.length,
      failedOperations: failed
    });
  }

  return results;
}
