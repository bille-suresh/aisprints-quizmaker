import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function McqsPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="flex w-full max-w-lg flex-col gap-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">MCQ Workspace</h1>
        <p className="text-muted-foreground">
          You&apos;ve reached the post-auth destination. Full MCQ creation
          arrives in the next sprint.
        </p>
        <div className="flex justify-center">
          <Link href="/login">
            <Button variant="outline" type="button">
              Back to login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
