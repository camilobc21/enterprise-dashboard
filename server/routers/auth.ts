import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";
import { hashPassword, verifyPassword } from "../auth/password";
import { createLocalSession } from "../auth/session";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, router } from "../_core/trpc";
import * as db from "../db";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ingresa un correo válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
});

function setSessionCookie(
  res: Response,
  req: Request,
  token: string
) {
  res.cookie(COOKIE_NAME, token, {
    ...getSessionCookieOptions(req),
    maxAge: ONE_YEAR_MS,
  });
}

export const authRouter = router({
  register: publicProcedure
    .input(
      credentialsSchema.extend({
        name: z.string().trim().min(1, "Ingresa tu nombre.").max(120),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existingUser = await db.getUserByEmail(input.email);
      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ya existe una cuenta con este correo.",
        });
      }

      const user = await db.createLocalUser({
        openId: `local:${randomUUID()}`,
        name: input.name,
        email: input.email,
        passwordHash: hashPassword(input.password),
      });

      const token = await createLocalSession({
        userId: user.id,
        email: user.email,
      });
      setSessionCookie(ctx.res, ctx.req, token);

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }),

  login: publicProcedure.input(credentialsSchema).mutation(async ({ input, ctx }) => {
    const user = await db.getUserByEmail(input.email);
    if (!user || !user.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Correo o contraseña incorrectos.",
      });
    }

    await db.updateUserLastSignedIn(user.id);
    const token = await createLocalSession({
      userId: user.id,
      email: user.email,
    });
    setSessionCookie(ctx.res, ctx.req, token);

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }),

  me: publicProcedure.query(({ ctx }) => ctx.user),

  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie(COOKIE_NAME, {
      ...getSessionCookieOptions(ctx.req),
      maxAge: -1,
    });
    return { success: true } as const;
  }),
});
