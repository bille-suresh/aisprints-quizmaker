import { z } from "zod";

export const mcqChoiceInputSchema = z.object({
  choiceText: z.string().trim().min(1, "Choice text is required").max(500),
  isCorrect: z.boolean(),
});

export const mcqChoicesInputSchema = z
  .array(mcqChoiceInputSchema)
  .min(2, "MCQ must have at least 2 choices")
  .max(6, "MCQ must have at most 6 choices")
  .refine((choices) => choices.filter((choice) => choice.isCorrect).length === 1, {
    message: "Exactly one choice must be marked as correct",
  });

export const createMcqInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  question: z.string().trim().min(1, "Question is required").max(2000),
  choices: mcqChoicesInputSchema,
});

export const updateMcqInputSchema = createMcqInputSchema;

export type McqChoiceInput = z.infer<typeof mcqChoiceInputSchema>;
export type CreateMcqInput = z.infer<typeof createMcqInputSchema>;
export type UpdateMcqInput = z.infer<typeof updateMcqInputSchema>;

export type McqChoice = {
  id: string;
  choiceText: string;
  isCorrect: boolean;
  sortOrder: number;
};

export type Mcq = {
  id: string;
  name: string;
  question: string;
  choices: McqChoice[];
  createdAt: string;
  updatedAt: string;
};

export type McqSummary = Omit<Mcq, "choices">;

export type McqAttempt = {
  id: string;
  mcqId: string;
  choiceId: string;
  isCorrect: boolean;
  createdAt: string;
};

export type McqRow = {
  id: string;
  name: string;
  question: string;
  created_at: string;
  updated_at: string;
};

export type McqChoiceRow = {
  id: string;
  mcq_id: string;
  choice_text: string;
  is_correct: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type McqAttemptRow = {
  id: string;
  mcq_id: string;
  choice_id: string;
  is_correct: number;
  created_at: string;
};
