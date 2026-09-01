import { createMcqInputSchema } from "@/lib/services/mcq-service.types";

export function validateMcqForm(input: unknown): string | null {
  const result = createMcqInputSchema.safeParse(input);
  if (!result.success) {
    return result.error.issues[0]?.message ?? "Validation error";
  }

  return null;
}
