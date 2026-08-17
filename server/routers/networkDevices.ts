import { z } from "zod";
import * as db from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";

const macAddressSchema = z
  .string()
  .trim()
  .regex(/^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/, "Ingresa una dirección MAC válida.")
  .transform((value) => value.replace(/-/g, ":").toUpperCase());

const deviceTypeSchema = z.enum(["unknown", "computer", "phone", "tablet", "iot", "printer", "router", "camera", "server"]);
const deviceStatusSchema = z.enum(["online", "offline", "unknown"]);
const sourceSchema = z.enum(["manual", "router_dhcp", "router_arp", "esp32"]);

export const networkDeviceInputSchema = z.object({
  displayName: z.string().trim().min(1, "Ingresa un nombre para el dispositivo.").max(160),
  ipAddress: z.string().trim().regex(/^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/, "Ingresa una dirección IPv4 válida.").optional().or(z.literal("")),
  macAddress: macAddressSchema,
  vendor: z.string().trim().max(160).optional().or(z.literal("")),
  deviceType: deviceTypeSchema.default("unknown"),
  status: deviceStatusSchema.default("unknown"),
  isTrusted: z.boolean().default(false),
  source: sourceSchema.default("manual"),
});

export const networkDevicesRouter = router({
  list: protectedProcedure.query(({ ctx }) => db.getNetworkDevices(ctx.user.id)),

  summary: protectedProcedure.query(async ({ ctx }) => {
    const devices = await db.getNetworkDevices(ctx.user.id);
    return {
      total: devices.length,
      online: devices.filter((device) => device.status === "online").length,
      untrusted: devices.filter((device) => !device.isTrusted).length,
    };
  }),

  upsert: adminProcedure.input(networkDeviceInputSchema).mutation(async ({ ctx, input }) => {
    return db.upsertNetworkDevice({
      ownerId: ctx.user.id,
      displayName: input.displayName,
      ipAddress: input.ipAddress || null,
      macAddress: input.macAddress,
      vendor: input.vendor || null,
      deviceType: input.deviceType,
      status: input.status,
      isTrusted: input.isTrusted,
      source: input.source,
    });
  }),

  setTrusted: adminProcedure
    .input(z.object({ id: z.number().int().positive(), isTrusted: z.boolean() }))
    .mutation(({ ctx, input }) => db.updateNetworkDeviceTrust(ctx.user.id, input.id, input.isTrusted)),
});
