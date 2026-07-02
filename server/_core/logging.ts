import winston from 'winston';
import path from 'path';

const logsDir = path.join(process.cwd(), '.manus-logs');

/**
 * Configure Winston logger with multiple transports
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'enterprise-dashboard' },
  transports: [
    // Console output in development
    ...(process.env.NODE_ENV !== 'production' ? [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ level, message, timestamp, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
            return `${timestamp} [${level}] ${message} ${metaStr}`;
          })
        )
      })
    ] : []),
    
    // Error logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Combined logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // API request logs
    new winston.transports.File({
      filename: path.join(logsDir, 'api.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

/**
 * Log levels:
 * - error: 0
 * - warn: 1
 * - info: 2
 * - http: 3
 * - debug: 4
 */

export const logLevels = {
  error: 'error',
  warn: 'warn',
  info: 'info',
  http: 'http',
  debug: 'debug'
} as const;

export type LogLevel = typeof logLevels[keyof typeof logLevels];
