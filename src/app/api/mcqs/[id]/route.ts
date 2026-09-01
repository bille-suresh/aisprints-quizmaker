import { getCloudflareContext } from "@opennextjs/cloudflare";
import { updateMcqRequestSchema } from "@/lib/mcq/mcq-schemas";
import { readJsonBody, validationErrorMessage } from "@/lib/mcq/mcq-utils";
import {
  deleteMcq,
  getMcqById,
  McqNotFoundError,
  McqValidationError,
  updateMcq,
} from "@/lib/services/mcq-service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { env } = getCloudflareContext();
    const mcq = await getMcqById(env.DB, id);

    if (!mcq) {
      return Response.json({ error: "MCQ not found" }, { status: 404 });
    }

    return Response.json({ mcq });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await readJsonBody(request);
    if (body === null) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = updateMcqRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: validationErrorMessage(parsed.error) },
        { status: 400 },
      );
    }

    const { env } = getCloudflareContext();
    const mcq = await updateMcq(env.DB, id, parsed.data);

    return Response.json({ mcq });
  } catch (error) {
    if (error instanceof McqNotFoundError) {
      return Response.json({ error: "MCQ not found" }, { status: 404 });
    }

    if (error instanceof McqValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { env } = getCloudflareContext();
    const deleted = await deleteMcq(env.DB, id);

    if (!deleted) {
      return Response.json({ error: "MCQ not found" }, { status: 404 });
    }

    return Response.json({ message: "MCQ deleted" });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
