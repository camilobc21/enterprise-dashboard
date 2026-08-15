import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { dashboardRouter } from "./routers/dashboard";
import { notificationsRouter } from "./routers/notifications";
import { documentsRouter } from "./routers/documents";
import { aiRouter } from "./routers/ai";
import { crudRouter } from "./routers/crud";
import { auditRouter } from "./routers/audit";
import { usersRouter } from "./routers/users";
import { wifiRouter } from "./routers/wifi";
import { exportRouter } from "./routers/export";
import { alertsRouter } from "./routers/alerts";
import { authRouter } from "./routers/auth";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: authRouter,
  dashboard: dashboardRouter,
  notifications: notificationsRouter,
  documents: documentsRouter,
  ai: aiRouter,
  crud: crudRouter,
  audit: auditRouter,
  users: usersRouter,
  wifi: wifiRouter,
  export: exportRouter,
  alerts: alertsRouter,
});

export type AppRouter = typeof appRouter;
