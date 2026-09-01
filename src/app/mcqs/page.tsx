"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { McqTable } from "@/components/mcq-table";
import { Button } from "@/components/ui/button";
import type { McqSummary } from "@/lib/services/mcq-service.types";

async function fetchMcqSummaries(): Promise<McqSummary[]> {
  const response = await fetch("/api/mcqs");
  if (!response.ok) {
    throw new Error("Unable to load MCQs");
  }

  const body = (await response.json()) as { mcqs: McqSummary[] };
  return body.mcqs;
}

export default function McqsPage() {
  const router = useRouter();
  const [mcqs, setMcqs] = useState<McqSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const refreshMcqs = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      setMcqs(await fetchMcqSummaries());
    } catch {
      setError("Unable to load MCQs. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    fetchMcqSummaries()
      .then((summaries) => {
        if (active) {
          setMcqs(summaries);
        }
      })
      .catch(() => {
        if (active) {
          setError("Unable to load MCQs. Please try again.");
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Logout is navigation-based; continue to login even if the stub API fails.
    } finally {
      router.push("/login");
    }
  }

  return (
    <div className="min-h-svh w-full p-6 md:p-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              MCQ Workspace
            </h1>
            <p className="text-muted-foreground">
              Create, edit, preview, and delete multiple-choice questions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button nativeButton={false} render={<Link href="/mcqs/new" />}>
              Create MCQ
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleLogout()}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading MCQs...</p>
        ) : error ? (
          <div className="flex flex-col gap-3">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" onClick={() => void refreshMcqs()}>
              Retry
            </Button>
          </div>
        ) : mcqs.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed p-10 text-center">
            <p className="text-muted-foreground">
              No multiple-choice questions yet. Create your first one to get
              started.
            </p>
            <Button nativeButton={false} render={<Link href="/mcqs/new" />}>
              Create MCQ
            </Button>
          </div>
        ) : (
          <McqTable mcqs={mcqs} onDeleted={() => void refreshMcqs()} />
        )}
      </div>
    </div>
  );
}
