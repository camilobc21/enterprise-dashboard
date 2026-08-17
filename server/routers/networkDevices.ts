import * as db from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { collectLocalArpDevices } from "../network/arpDiscovery";
import { z } from "zod";

export const networkDevicesRouter = router({
  list: protectedProcedure.query(() => db.getNetworkDevices()),

  summary: protectedProcedure.query(async () => {
    const devices = await db.getNetworkDevices();
    return {
      total: devices.length,
      online: devices.filter((device) => device.status === "online").length,
      untrusted: devices.filter((device) => !device.isTrusted).length,
    };
  }),

  refreshLocalArp: adminProcedure.mutation(async ({ ctx }) => {
    const devices = await collectLocalArpDevices();
    const detected = await db.upsertDetectedNetworkDevices(ctx.user.id, devices);
    return { detected, scannedAt: new Date() };
  }),

  setTrusted: adminProcedure
    .input(z.object({ id: z.number().int().positive(), isTrusted: z.boolean() }))
    .mutation(({ input }) => db.updateNetworkDeviceTrust(input.id, input.isTrusted)),
});
