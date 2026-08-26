import { z } from "zod";

export function validationErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Validation error";
}

export async function readJsonBody(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
