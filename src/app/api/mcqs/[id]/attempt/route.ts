import { getCloudflareContext } from "@opennextjs/cloudflare";
import { recordAttemptRequestSchema } from "@/lib/mcq/mcq-schemas";
import { readJsonBody, validationErrorMessage } from "@/lib/mcq/mcq-utils";
import {
  InvalidChoiceError,
  McqNotFoundError,
  recordAttempt,
} from "@/lib/services/mcq-service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await readJsonBody(request);
    if (body === null) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = recordAttemptRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: validationErrorMessage(parsed.error) },
        { status: 400 },
      );
    }

    const { env } = getCloudflareContext();
    const attempt = await recordAttempt(env.DB, id, parsed.data.choiceId);

    return Response.json({ attempt }, { status: 201 });
  } catch (error) {
    if (error instanceof McqNotFoundError) {
      return Response.json({ error: "MCQ not found" }, { status: 404 });
    }

    if (error instanceof InvalidChoiceError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
