"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { validateMcqForm } from "@/lib/mcq/mcq-form-validation";
import type { Mcq, McqChoiceInput } from "@/lib/services/mcq-service.types";
import { cn } from "@/lib/utils";
import { MinusIcon, PlusIcon } from "lucide-react";

type ChoiceFormValue = McqChoiceInput;

type McqFormProps = {
  mode: "create" | "edit";
  mcqId?: string;
  initialValues?: {
    name: string;
    question: string;
    choices: ChoiceFormValue[];
  };
};

const defaultChoices = (): ChoiceFormValue[] => [
  { choiceText: "", isCorrect: false },
  { choiceText: "", isCorrect: false },
];

export function McqForm({ mode, mcqId, initialValues }: McqFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialValues?.name ?? "");
  const [question, setQuestion] = useState(initialValues?.question ?? "");
  const [choices, setChoices] = useState<ChoiceFormValue[]>(
    initialValues?.choices ?? defaultChoices(),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setCorrectChoice(index: number) {
    setChoices((current) =>
      current.map((choice, choiceIndex) => ({
        ...choice,
        isCorrect: choiceIndex === index,
      })),
    );
  }

  function updateChoiceText(index: number, choiceText: string) {
    setChoices((current) =>
      current.map((choice, choiceIndex) =>
        choiceIndex === index ? { ...choice, choiceText } : choice,
      ),
    );
  }

  function addChoice() {
    if (choices.length >= 6) {
      return;
    }

    setChoices((current) => [...current, { choiceText: "", isCorrect: false }]);
  }

  function removeChoice(index: number) {
    if (choices.length <= 2) {
      return;
    }

    setChoices((current) => {
      const next = current.filter((_, choiceIndex) => choiceIndex !== index);
      if (!next.some((choice) => choice.isCorrect) && next.length > 0) {
        next[0] = { ...next[0]!, isCorrect: true };
      }
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload = { name, question, choices };
    const validationError = validateMcqForm(payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const url = mode === "create" ? "/api/mcqs" : `/api/mcqs/${mcqId}`;
      const method = mode === "create" ? "POST" : "PUT";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Unable to save MCQ. Please try again.");
        return;
      }

      router.push("/mcqs");
      router.refresh();
    } catch {
      setError("Unable to save MCQ. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "create" ? "Create MCQ" : "Edit MCQ"}</CardTitle>
        <CardDescription>
          Add a name, question, and between two and six answer choices. Mark
          exactly one choice as correct.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="mcq-name">Name</FieldLabel>
              <Input
                id="mcq-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Photosynthesis basics"
                disabled={isSubmitting}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="mcq-question">Question</FieldLabel>
              <textarea
                id="mcq-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Which organelle performs photosynthesis?"
                disabled={isSubmitting}
                required
                rows={4}
                className={cn(
                  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30",
                )}
              />
            </Field>
            <Field>
              <FieldLabel>Choices</FieldLabel>
              <div className="flex flex-col gap-3">
                {choices.map((choice, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-lg border border-border p-2"
                  >
                    <input
                      type="radio"
                      name="correctChoice"
                      checked={choice.isCorrect}
                      onChange={() => setCorrectChoice(index)}
                      disabled={isSubmitting}
                      aria-label={`Mark choice ${index + 1} as correct`}
                      className="size-4 shrink-0 accent-primary"
                    />
                    <Input
                      value={choice.choiceText}
                      onChange={(event) =>
                        updateChoiceText(index, event.target.value)
                      }
                      placeholder={`Choice ${index + 1}`}
                      disabled={isSubmitting}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => removeChoice(index)}
                      disabled={isSubmitting || choices.length <= 2}
                      aria-label={`Remove choice ${index + 1}`}
                    >
                      <MinusIcon />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={addChoice}
                disabled={isSubmitting || choices.length >= 6}
              >
                <PlusIcon />
                Add choice
              </Button>
            </Field>
            {error ? (
              <Field>
                <FieldError>{error}</FieldError>
              </Field>
            ) : null}
            <Field className="flex flex-row gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
              <Button
                nativeButton={false}
                variant="outline"
                render={<Link href="/mcqs" />}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

export function mcqToFormValues(mcq: Mcq) {
  return {
    name: mcq.name,
    question: mcq.question,
    choices: mcq.choices.map((choice) => ({
      choiceText: choice.choiceText,
      isCorrect: choice.isCorrect,
    })),
  };
}
