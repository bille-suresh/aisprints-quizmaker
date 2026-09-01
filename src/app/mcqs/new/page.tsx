import Link from "next/link";
import { McqForm } from "@/components/mcq-form";
import { Button } from "@/components/ui/button";

export default function NewMcqPage() {
  return (
    <div className="min-h-svh w-full p-6 md:p-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">New MCQ</h1>
            <p className="text-muted-foreground">
              Create a new multiple-choice question.
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
        <McqForm mode="create" />
      </div>
    </div>
  );
}
