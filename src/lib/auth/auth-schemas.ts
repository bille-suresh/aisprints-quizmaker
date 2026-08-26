import { z } from "zod";

export const registerRequestSchema = z.object({
  email: z.string().email(),
  passwordHash: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export const loginRequestSchema = z.object({
  email: z.string().email(),
  passwordHash: z.string().min(1),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
