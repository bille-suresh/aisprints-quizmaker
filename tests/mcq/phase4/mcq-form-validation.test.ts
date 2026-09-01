import { describe, expect, it } from "vitest";
import { validateMcqForm } from "@/lib/mcq/mcq-form-validation";

const validForm = {
  name: "Photosynthesis basics",
  question: "Which organelle performs photosynthesis?",
  choices: [
    { choiceText: "Mitochondria", isCorrect: false },
    { choiceText: "Chloroplast", isCorrect: true },
  ],
};

describe("MCQ Phase 4: Mcq form validation", () => {
  it("returns null for a valid form", () => {
    expect(validateMcqForm(validForm)).toBeNull();
  });

  it("returns an error when name is empty", () => {
    expect(validateMcqForm({ ...validForm, name: "" })).toBeTruthy();
  });

  it("returns an error when question is empty", () => {
    expect(validateMcqForm({ ...validForm, question: "   " })).toBeTruthy();
  });

  it("returns an error when there are fewer than 2 choices", () => {
    expect(
      validateMcqForm({
        ...validForm,
        choices: [{ choiceText: "Only one", isCorrect: true }],
      }),
    ).toBeTruthy();
  });

  it("returns an error when there are more than 6 choices", () => {
    expect(
      validateMcqForm({
        ...validForm,
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
    ).toBeTruthy();
  });

  it("returns an error when no choice is marked correct", () => {
    expect(
      validateMcqForm({
        ...validForm,
        choices: [
          { choiceText: "A", isCorrect: false },
          { choiceText: "B", isCorrect: false },
        ],
      }),
    ).toBeTruthy();
  });

  it("returns an error when multiple choices are marked correct", () => {
    expect(
      validateMcqForm({
        ...validForm,
        choices: [
          { choiceText: "A", isCorrect: true },
          { choiceText: "B", isCorrect: true },
        ],
      }),
    ).toBeTruthy();
  });
});
