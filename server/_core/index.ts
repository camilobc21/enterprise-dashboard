import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import compression from "compression";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { setupSocketIO } from "./socket";
import { configureMiddleware, errorHandler, requestLogger } from "./middleware";
import { initializeCache } from "./cache";
import { logger } from "./logging";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Initialize cache
  await initializeCache();
  
  // Setup Socket.io
  const io = setupSocketIO(server);
  app.locals.io = io;
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Configure security and performance middleware (includes compression)
  configureMiddleware(app);
  
  // Request logging
  app.use(requestLogger);
  
  logger.info('Express server initialized with robustness middleware');
  // Health check endpoint
  app.get('/health', (req: any, res: any) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV
    });
  });
  
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  
  // Hacer io accesible en contexto de tRPC
  app.use((req, res, next) => {
    (req as any).io = io;
    next();
  });
  
  // Error handling middleware (must be last)
  app.use(errorHandler);

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    logger.info(`Server running on http://localhost:${port}/`);
    logger.info('Robustness features enabled', {
      middleware: 'configured',
      logging: 'centralized',
      circuitBreaker: 'active',
      caching: 'enabled',
      rateLimiting: 'active'
    });
  });
}

startServer().catch((error) => {
  logger.error('Server startup failed', { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
