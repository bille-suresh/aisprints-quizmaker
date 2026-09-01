"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
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
import type { Mcq } from "@/lib/services/mcq-service.types";
import { cn } from "@/lib/utils";

export default function PreviewMcqPage() {
  const params = useParams<{ id: string }>();
  const [mcq, setMcq] = useState<Mcq | null>(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [result, setResult] = useState<{
    isCorrect: boolean;
    message: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMcq() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/mcqs/${params.id}`);
        if (response.status === 404) {
          setError("MCQ not found.");
          return;
        }

        if (!response.ok) {
          setError("Unable to load MCQ. Please try again.");
          return;
        }

        const body = (await response.json()) as { mcq: Mcq };
        setMcq(body.mcq);
      } catch {
        setError("Unable to load MCQ. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadMcq();
  }, [params.id]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setResult(null);

    if (!selectedChoiceId) {
      setSubmitError("Select an answer before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/mcqs/${params.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choiceId: selectedChoiceId }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setSubmitError(body.error ?? "Unable to submit answer. Please try again.");
        return;
      }

      const body = (await response.json()) as {
        attempt: { isCorrect: boolean };
      };

      setResult({
        isCorrect: body.attempt.isCorrect,
        message: body.attempt.isCorrect
          ? "Correct! Well done."
          : "Incorrect. Review the question and try again.",
      });
    } catch {
      setSubmitError("Unable to submit answer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-svh w-full p-6 md:p-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Preview MCQ
            </h1>
            <p className="text-muted-foreground">
              Try answering the question as a student would.
            </p>
          </div>
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/mcqs" />}
          >
            Back to list
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading MCQ...</p>
        ) : error ? (
          <div className="flex flex-col gap-3">
            <p className="text-destructive">{error}</p>
            <Button nativeButton={false} variant="outline" render={<Link href="/mcqs" />}>
              Back to list
            </Button>
          </div>
        ) : mcq ? (
          <Card>
            <CardHeader>
              <CardTitle>{mcq.name}</CardTitle>
              <CardDescription>{mcq.question}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <FieldGroup>
                  <Field>
                    <FieldLabel>Select an answer</FieldLabel>
                    <div className="flex flex-col gap-2">
                      {mcq.choices.map((choice) => (
                        <label
                          key={choice.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors",
                            selectedChoiceId === choice.id && "border-primary bg-primary/5",
                            isSubmitting && "pointer-events-none opacity-50",
                          )}
                        >
                          <input
                            type="radio"
                            name="previewChoice"
                            value={choice.id}
                            checked={selectedChoiceId === choice.id}
                            onChange={() => setSelectedChoiceId(choice.id)}
                            disabled={isSubmitting}
                            className="size-4 accent-primary"
                          />
                          <span>{choice.choiceText}</span>
                        </label>
                      ))}
                    </div>
                  </Field>
                  {submitError ? (
                    <Field>
                      <FieldError>{submitError}</FieldError>
                    </Field>
                  ) : null}
                  {result ? (
                    <Field>
                      <p
                        className={cn(
                          "text-sm font-medium",
                          result.isCorrect
                            ? "text-foreground"
                            : "text-destructive",
                        )}
                      >
                        {result.message}
                      </p>
                    </Field>
                  ) : null}
                  <Field>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Submitting..." : "Submit answer"}
                    </Button>
                  </Field>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
