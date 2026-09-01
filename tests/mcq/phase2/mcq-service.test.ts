vi.mock("server-only", () => ({}));

import { beforeEach, describe, expect, it } from "vitest";
import { createInMemoryMcqD1 } from "../../helpers/in-memory-d1";
import {
  createMcq,
  deleteMcq,
  getMcqById,
  InvalidChoiceError,
  listMcqs,
  McqNotFoundError,
  McqValidationError,
  recordAttempt,
  updateMcq,
} from "@/lib/services/mcq-service";

const validInput = {
  name: "Photosynthesis basics",
  question: "Which organelle performs photosynthesis?",
  choices: [
    { choiceText: "Mitochondria", isCorrect: false },
    { choiceText: "Chloroplast", isCorrect: true },
  ],
};

describe("MCQ Phase 2: MCQ Service", () => {
  let db: D1Database;

  beforeEach(() => {
    db = createInMemoryMcqD1();
  });

  describe("createMcq", () => {
    it("creates an MCQ with 2 choices and returns generated IDs", async () => {
      const mcq = await createMcq(db, validInput);

      expect(mcq).toMatchObject({
        name: validInput.name,
        question: validInput.question,
      });
      expect(mcq.id).toBeTruthy();
      expect(mcq.choices).toHaveLength(2);
      expect(mcq.choices[0]?.choiceText).toBe("Mitochondria");
      expect(mcq.choices[0]?.isCorrect).toBe(false);
      expect(mcq.choices[1]?.choiceText).toBe("Chloroplast");
      expect(mcq.choices[1]?.isCorrect).toBe(true);
      expect(mcq.choices.every((choice) => choice.id)).toBe(true);
      expect(mcq.createdAt).toBeTruthy();
      expect(mcq.updatedAt).toBeTruthy();
    });

    it("rejects fewer than 2 choices", async () => {
      await expect(
        createMcq(db, {
          ...validInput,
          choices: [{ choiceText: "Only one", isCorrect: true }],
        }),
      ).rejects.toBeInstanceOf(McqValidationError);
    });

    it("rejects more than 6 choices", async () => {
      await expect(
        createMcq(db, {
          ...validInput,
          choices: [
            { choiceText: "A", isCorrect: true },
            { choiceText: "B", isCorrect: false },
            { choiceText: "C", isCorrect: false },
            { choiceText: "D", isCorrect: false },
            { choiceText: "E", isCorrect: false },
            { choiceText: "F", isCorrect: false },
            { choiceText: "G", isCorrect: false },
          ],
        }),
      ).rejects.toBeInstanceOf(McqValidationError);
    });

    it("rejects when no choice is marked correct", async () => {
      await expect(
        createMcq(db, {
          ...validInput,
          choices: [
            { choiceText: "A", isCorrect: false },
            { choiceText: "B", isCorrect: false },
          ],
        }),
      ).rejects.toBeInstanceOf(McqValidationError);
    });

    it("rejects when multiple choices are marked correct", async () => {
      await expect(
        createMcq(db, {
          ...validInput,
          choices: [
            { choiceText: "A", isCorrect: true },
            { choiceText: "B", isCorrect: true },
          ],
        }),
      ).rejects.toBeInstanceOf(McqValidationError);
    });
  });

  describe("listMcqs", () => {
    it("returns summaries without choice arrays ordered by updated_at DESC", async () => {
      const first = await createMcq(db, {
        ...validInput,
        name: "First question",
      });
      const second = await createMcq(db, {
        ...validInput,
        name: "Second question",
      });

      await updateMcq(db, first.id, {
        ...validInput,
        name: "First question updated",
      });

      const summaries = await listMcqs(db);

      expect(summaries).toHaveLength(2);
      expect(summaries[0]?.id).toBe(first.id);
      expect(summaries[1]?.id).toBe(second.id);
      expect(summaries[0]).toMatchObject({
        name: "First question updated",
        question: validInput.question,
      });
      expect(summaries[0]).not.toHaveProperty("choices");
      expect(summaries[1]?.name).toBe("Second question");
    });
  });

  describe("getMcqById", () => {
    it("returns null for an unknown id", async () => {
      const found = await getMcqById(db, "missing-id");

      expect(found).toBeNull();
    });

    it("returns choices ordered by sort_order", async () => {
      const created = await createMcq(db, validInput);

      const found = await getMcqById(db, created.id);

      expect(found?.choices.map((choice) => choice.choiceText)).toEqual([
        "Mitochondria",
        "Chloroplast",
      ]);
    });
  });

  describe("updateMcq", () => {
    it("replaces choices atomically", async () => {
      const created = await createMcq(db, validInput);
      const originalChoiceIds = created.choices.map((choice) => choice.id);

      const updated = await updateMcq(db, created.id, {
        name: "Updated name",
        question: "Updated question?",
        choices: [
          { choiceText: "New A", isCorrect: false },
          { choiceText: "New B", isCorrect: false },
          { choiceText: "New C", isCorrect: true },
        ],
      });

      expect(updated.name).toBe("Updated name");
      expect(updated.question).toBe("Updated question?");
      expect(updated.choices).toHaveLength(3);
      expect(updated.choices.map((choice) => choice.choiceText)).toEqual([
        "New A",
        "New B",
        "New C",
      ]);
      expect(updated.choices.some((choice) => choice.isCorrect)).toBe(true);
      expect(
        updated.choices.some((choice) => originalChoiceIds.includes(choice.id)),
      ).toBe(false);
    });

    it("throws McqNotFoundError when the MCQ does not exist", async () => {
      await expect(
        updateMcq(db, "missing-id", validInput),
      ).rejects.toBeInstanceOf(McqNotFoundError);
    });
  });

  describe("deleteMcq", () => {
    it("returns true and removes the MCQ when it exists", async () => {
      const created = await createMcq(db, validInput);

      const deleted = await deleteMcq(db, created.id);

      expect(deleted).toBe(true);
      expect(await getMcqById(db, created.id)).toBeNull();
    });

    it("returns false when the MCQ does not exist", async () => {
      const deleted = await deleteMcq(db, "missing-id");

      expect(deleted).toBe(false);
    });
  });

  describe("recordAttempt", () => {
    it("stores isCorrect based on the selected choice", async () => {
      const created = await createMcq(db, validInput);
      const correctChoice = created.choices.find((choice) => choice.isCorrect)!;
      const incorrectChoice = created.choices.find((choice) => !choice.isCorrect)!;

      const correctAttempt = await recordAttempt(
        db,
        created.id,
        correctChoice.id,
      );
      const incorrectAttempt = await recordAttempt(
        db,
        created.id,
        incorrectChoice.id,
      );

      expect(correctAttempt.isCorrect).toBe(true);
      expect(incorrectAttempt.isCorrect).toBe(false);
      expect(correctAttempt.mcqId).toBe(created.id);
      expect(correctAttempt.choiceId).toBe(correctChoice.id);
    });

    it("throws InvalidChoiceError when the choice does not belong to the MCQ", async () => {
      const first = await createMcq(db, validInput);
      const second = await createMcq(db, {
        ...validInput,
        name: "Another question",
      });

      await expect(
        recordAttempt(db, first.id, second.choices[0]!.id),
      ).rejects.toBeInstanceOf(InvalidChoiceError);
    });

    it("throws McqNotFoundError when the MCQ does not exist", async () => {
      await expect(
        recordAttempt(db, "missing-id", "missing-choice"),
      ).rejects.toBeInstanceOf(McqNotFoundError);
    });
  });
});
