import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { getAllUsers, getUserById, updateUserRole, deleteUser } from "../db";

export const usersRouter = router({
  getAll: adminProcedure.query(() => getAllUsers()),

  getUser: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getUserById(input.id)),

  getCurrentUser: protectedProcedure.query(({ ctx }) => ctx.user),

  updateRole: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
    .mutation(({ input }) => updateUserRole(input.userId, input.role)),

  deleteUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(({ input, ctx }) => {
      if (input.userId === ctx.user?.id) {
        throw new Error("No puedes eliminar tu propia cuenta");
      }
      return deleteUser(input.userId);
    }),
});
