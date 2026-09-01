import { z } from "zod";
import { createMcqInputSchema } from "@/lib/services/mcq-service.types";

export const createMcqRequestSchema = createMcqInputSchema;
export const updateMcqRequestSchema = createMcqInputSchema;

export const recordAttemptRequestSchema = z.object({
  choiceId: z.string().trim().min(1, "Choice ID is required"),
});

export type CreateMcqRequest = z.infer<typeof createMcqRequestSchema>;
export type UpdateMcqRequest = z.infer<typeof updateMcqRequestSchema>;
export type RecordAttemptRequest = z.infer<typeof recordAttemptRequestSchema>;
