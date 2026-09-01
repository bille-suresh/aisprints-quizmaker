"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { McqForm, mcqToFormValues } from "@/components/mcq-form";
import { Button } from "@/components/ui/button";
import type { Mcq } from "@/lib/services/mcq-service.types";

export default function EditMcqPage() {
  const params = useParams<{ id: string }>();
  const [mcq, setMcq] = useState<Mcq | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="min-h-svh w-full p-6 md:p-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Edit MCQ</h1>
            <p className="text-muted-foreground">
              Update the question and answer choices.
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
          <McqForm
            mode="edit"
            mcqId={mcq.id}
            initialValues={mcqToFormValues(mcq)}
          />
        ) : null}
      </div>
    </div>
  );
}
