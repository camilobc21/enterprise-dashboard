import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { dashboardRouter } from "./routers/dashboard";
import { notificationsRouter } from "./routers/notifications";
import { documentsRouter } from "./routers/documents";
import { aiRouter } from "./routers/ai";
import { crudRouter } from "./routers/crud";
import { auditRouter } from "./routers/audit";
import { usersRouter } from "./routers/users";
import { wifiRouter } from "./routers/wifi";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  dashboard: dashboardRouter,
  notifications: notificationsRouter,
  documents: documentsRouter,
  ai: aiRouter,
  crud: crudRouter,
  audit: auditRouter,
  users: usersRouter,
  wifi: wifiRouter,
});

export type AppRouter = typeof appRouter;
