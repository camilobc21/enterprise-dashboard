import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { countRegisteredAdmins, getAllUsers, getUserById, updateUserRole, deleteUser } from "../db";

export const usersRouter = router({
  getAll: adminProcedure.query(() => getAllUsers()),

  getUser: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getUserById(input.id)),

  getCurrentUser: protectedProcedure.query(({ ctx }) => ctx.user),

  updateRole: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
    .mutation(async ({ input, ctx }) => {
      const targetUser = await getUserById(input.userId);
      if (!targetUser || !targetUser.passwordHash) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuario registrado no encontrado" });
      }

      if (targetUser.id === ctx.user.id && input.role !== "admin") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No puedes quitarte el rol de administrador" });
      }

      if (targetUser.role === "admin" && input.role !== "admin") {
        const adminCount = await countRegisteredAdmins();
        if (adminCount <= 1) {
          throw new TRPCError({ code: "CONFLICT", message: "Debe existir al menos un administrador" });
        }
      }

      return updateUserRole(input.userId, input.role);
    }),

  deleteUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user?.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No puedes eliminar tu propia cuenta" });
      }

      const targetUser = await getUserById(input.userId);
      if (!targetUser || !targetUser.passwordHash) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuario registrado no encontrado" });
      }

      if (targetUser.role === "admin" && await countRegisteredAdmins() <= 1) {
        throw new TRPCError({ code: "CONFLICT", message: "No puedes eliminar al último administrador" });
      }

      return deleteUser(input.userId);
    }),
});
