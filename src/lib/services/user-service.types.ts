import { z } from "zod";

export const createUserInputSchema = z.object({
  email: z.string().email(),
  passwordHash: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export const updateUserInputSchema = z
  .object({
    email: z.string().email().optional(),
    passwordHash: z.string().min(1).optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
  })
  .refine(
    (input) =>
      input.email !== undefined ||
      input.passwordHash !== undefined ||
      input.firstName !== undefined ||
      input.lastName !== undefined,
    { message: "At least one field must be provided to update a user" },
  );

export type CreateUserInput = z.infer<typeof createUserInputSchema>;
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
};

export type UserRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
};

export type UserRowWithPassword = UserRow & {
  password_hash: string;
};
