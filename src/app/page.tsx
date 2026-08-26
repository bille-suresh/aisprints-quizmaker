import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-8 p-6 md:p-10">
      <div className="flex max-w-lg flex-col items-center gap-3 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Quizmaker</h1>
        <p className="text-muted-foreground">
          Create and collaborate on multiple-choice questions with other
          teachers.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button nativeButton={false} render={<Link href="/register" />}>
          Create account
        </Button>
        <Button
          nativeButton={false}
          variant="outline"
          render={<Link href="/login" />}
        >
          Sign in
        </Button>
      </div>
    </div>
  );
}
