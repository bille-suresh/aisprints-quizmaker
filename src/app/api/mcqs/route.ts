import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  createMcqRequestSchema,
} from "@/lib/mcq/mcq-schemas";
import { readJsonBody, validationErrorMessage } from "@/lib/mcq/mcq-utils";
import {
  createMcq,
  listMcqs,
  McqValidationError,
} from "@/lib/services/mcq-service";

export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const mcqs = await listMcqs(env.DB);

    return Response.json({ mcqs });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    if (body === null) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = createMcqRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: validationErrorMessage(parsed.error) },
        { status: 400 },
      );
    }

    const { env } = getCloudflareContext();
    const mcq = await createMcq(env.DB, parsed.data);

    return Response.json({ mcq }, { status: 201 });
  } catch (error) {
    if (error instanceof McqValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
