import compression from 'compression';
import rateLimit from 'express-rate-limit';
import csrf from 'csurf';
import { Express, Request, Response, NextFunction } from 'express';
import { logger } from './logging';

/**
 * Configure all security and performance middleware
 */
export function configureMiddleware(app: Express) {
  // 1. Compression - Reduce response size
  app.use(compression({
    // @ts-ignore
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));

  // 2. Security Headers
  app.use((req: any, res: any, next: any) => {
    // @ts-ignore
    // HSTS - Force HTTPS
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    
    // CSP - Content Security Policy
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'");
    
    // X-Frame-Options - Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // X-Content-Type-Options - Prevent MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // X-XSS-Protection - Enable XSS filter
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer-Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    logger.debug('Security headers applied', { path: req.path });
    next();
  });

  // 3. Rate Limiting - Prevent abuse
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    skip: (req: any) => {
      // Skip rate limiting for health checks
      return req.path === '/health';
    },
    handler: (req: any, res: Response) => {
      logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path });
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: req.rateLimit?.resetTime
      });
    }
  });

  // @ts-ignore
  app.use('/api/', limiter);

  // 4. Stricter rate limiting for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // 5 attempts per 15 minutes
    skipSuccessfulRequests: true,
    message: 'Too many login attempts, please try again later.'
  });

  app.use('/api/auth/login', authLimiter);
  app.use('/api/oauth/callback', authLimiter);

  // 5. CSRF Protection
  const csrfProtection = csrf({ cookie: false });
  app.use(csrfProtection);

  // 6. CSRF token endpoint
  app.get('/api/csrf-token', (req: any, res: Response) => {
    res.json({ csrfToken: req.csrfToken() });
  });

  logger.info('Middleware configured successfully');
}

/**
 * Error handling middleware
 */
export function errorHandler(err: any, req: any, res: Response, next: NextFunction) {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  // CSRF errors
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  // Rate limit errors (already handled above)
  if (err.status === 429) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

/**
 * Request logging middleware
 */
export function requestLogger(req: any, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[logLevel as keyof typeof logger]('HTTP request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });

  next();
}
