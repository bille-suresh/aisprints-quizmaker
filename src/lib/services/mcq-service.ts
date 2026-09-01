import "server-only";

import { z } from "zod";
import {
  createMcqInputSchema,
  updateMcqInputSchema,
  type CreateMcqInput,
  type Mcq,
  type McqAttempt,
  type McqChoice,
  type McqChoiceRow,
  type McqRow,
  type McqSummary,
  type UpdateMcqInput,
} from "./mcq-service.types";

export class McqNotFoundError extends Error {
  constructor(id: string) {
    super(`MCQ ${id} not found`);
    this.name = "McqNotFoundError";
  }
}

export class InvalidChoiceError extends Error {
  constructor(mcqId: string, choiceId: string) {
    super(`Choice ${choiceId} is not valid for MCQ ${mcqId}`);
    this.name = "InvalidChoiceError";
  }
}

export class McqValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "McqValidationError";
  }
}

function validationErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Validation error";
}

function parseCreateInput(input: CreateMcqInput): CreateMcqInput {
  const result = createMcqInputSchema.safeParse(input);
  if (!result.success) {
    throw new McqValidationError(validationErrorMessage(result.error));
  }
  return result.data;
}

function parseUpdateInput(input: UpdateMcqInput): UpdateMcqInput {
  const result = updateMcqInputSchema.safeParse(input);
  if (!result.success) {
    throw new McqValidationError(validationErrorMessage(result.error));
  }
  return result.data;
}

function generateId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function mapRowToChoice(row: McqChoiceRow): McqChoice {
  return {
    id: row.id,
    choiceText: row.choice_text,
    isCorrect: row.is_correct === 1,
    sortOrder: row.sort_order,
  };
}

function mapRowToSummary(row: McqRow): McqSummary {
  return {
    id: row.id,
    name: row.name,
    question: row.question,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchChoicesForMcq(
  db: D1Database,
  mcqId: string,
): Promise<McqChoice[]> {
  const { results } = await db
    .prepare(
      `SELECT id, mcq_id, choice_text, is_correct, sort_order, created_at, updated_at
       FROM mcq_choices
       WHERE mcq_id = ?1
       ORDER BY sort_order ASC`,
    )
    .bind(mcqId)
    .all<McqChoiceRow>();

  return results.map(mapRowToChoice);
}

async function fetchMcqRowById(
  db: D1Database,
  id: string,
): Promise<McqRow | null> {
  const { results } = await db
    .prepare(
      `SELECT id, name, question, created_at, updated_at
       FROM mcqs
       WHERE id = ?1`,
    )
    .bind(id)
    .all<McqRow>();

  return results[0] ?? null;
}

async function buildMcq(db: D1Database, row: McqRow): Promise<Mcq> {
  const choices = await fetchChoicesForMcq(db, row.id);

  return {
    ...mapRowToSummary(row),
    choices,
  };
}

function buildChoiceInsertStatements(
  db: D1Database,
  mcqId: string,
  choices: CreateMcqInput["choices"],
  timestamp: string,
) {
  return choices.map((choice, index) =>
    db
      .prepare(
        `INSERT INTO mcq_choices (id, mcq_id, choice_text, is_correct, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
      )
      .bind(
        generateId(),
        mcqId,
        choice.choiceText,
        choice.isCorrect ? 1 : 0,
        index,
        timestamp,
        timestamp,
      ),
  );
}

export async function createMcq(
  db: D1Database,
  input: CreateMcqInput,
): Promise<Mcq> {
  const validated = parseCreateInput(input);
  const mcqId = generateId();
  const timestamp = new Date().toISOString();

  await db.batch([
    db
      .prepare(
        `INSERT INTO mcqs (id, name, question, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5)`,
      )
      .bind(
        mcqId,
        validated.name,
        validated.question,
        timestamp,
        timestamp,
      ),
    ...buildChoiceInsertStatements(db, mcqId, validated.choices, timestamp),
  ]);

  const mcq = await getMcqById(db, mcqId);
  if (!mcq) {
    throw new Error("Failed to load MCQ after creation");
  }

  return mcq;
}

export async function listMcqs(db: D1Database): Promise<McqSummary[]> {
  const { results } = await db
    .prepare(
      `SELECT id, name, question, created_at, updated_at
       FROM mcqs
       ORDER BY updated_at DESC`,
    )
    .all<McqRow>();

  return results.map(mapRowToSummary);
}

export async function getMcqById(
  db: D1Database,
  id: string,
): Promise<Mcq | null> {
  const row = await fetchMcqRowById(db, id);
  if (!row) {
    return null;
  }

  return buildMcq(db, row);
}

export async function updateMcq(
  db: D1Database,
  id: string,
  input: UpdateMcqInput,
): Promise<Mcq> {
  const validated = parseUpdateInput(input);
  const existing = await fetchMcqRowById(db, id);

  if (!existing) {
    throw new McqNotFoundError(id);
  }

  const timestamp = new Date().toISOString();

  await db.batch([
    db
      .prepare(
        `UPDATE mcqs
         SET name = ?1, question = ?2, updated_at = ?3
         WHERE id = ?4`,
      )
      .bind(validated.name, validated.question, timestamp, id),
    db
      .prepare(`DELETE FROM mcq_choices WHERE mcq_id = ?1`)
      .bind(id),
    ...buildChoiceInsertStatements(db, id, validated.choices, timestamp),
  ]);

  const updated = await getMcqById(db, id);
  if (!updated) {
    throw new McqNotFoundError(id);
  }

  return updated;
}

export async function deleteMcq(db: D1Database, id: string): Promise<boolean> {
  const result = await db
    .prepare(`DELETE FROM mcqs WHERE id = ?1`)
    .bind(id)
    .run();

  return (result.meta.changes ?? 0) > 0;
}

export async function recordAttempt(
  db: D1Database,
  mcqId: string,
  choiceId: string,
): Promise<McqAttempt> {
  const mcq = await getMcqById(db, mcqId);
  if (!mcq) {
    throw new McqNotFoundError(mcqId);
  }

  const selectedChoice = mcq.choices.find((choice) => choice.id === choiceId);
  if (!selectedChoice) {
    throw new InvalidChoiceError(mcqId, choiceId);
  }

  const attemptId = generateId();
  const timestamp = new Date().toISOString();
  const isCorrect = selectedChoice.isCorrect ? 1 : 0;

  await db
    .prepare(
      `INSERT INTO mcq_attempts (id, mcq_id, choice_id, is_correct, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5)`,
    )
    .bind(attemptId, mcqId, choiceId, isCorrect, timestamp)
    .run();

  return {
    id: attemptId,
    mcqId,
    choiceId,
    isCorrect: selectedChoice.isCorrect,
    createdAt: timestamp,
  };
}

export {
  createMcqInputSchema,
  updateMcqInputSchema,
  type CreateMcqInput,
  type Mcq,
  type McqAttempt,
  type McqChoice,
  type McqSummary,
  type UpdateMcqInput,
} from "./mcq-service.types";
