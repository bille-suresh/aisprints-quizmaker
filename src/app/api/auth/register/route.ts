import { getCloudflareContext } from "@opennextjs/cloudflare";
import { registerRequestSchema } from "@/lib/auth/auth-schemas";
import { readJsonBody, validationErrorMessage } from "@/lib/auth/auth-utils";
import {
  createUser,
  DuplicateEmailError,
} from "@/lib/services/user-service";

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    if (body === null) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = registerRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: validationErrorMessage(parsed.error) },
        { status: 400 },
      );
    }

    const { env } = getCloudflareContext();
    const user = await createUser(env.DB, parsed.data);

    return Response.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return Response.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
