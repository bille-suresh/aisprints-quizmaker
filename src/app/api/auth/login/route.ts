import { getCloudflareContext } from "@opennextjs/cloudflare";
import { loginRequestSchema } from "@/lib/auth/auth-schemas";
import { readJsonBody, validationErrorMessage } from "@/lib/auth/auth-utils";
import { verifyCredentials } from "@/lib/services/user-service";

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    if (body === null) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = loginRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: validationErrorMessage(parsed.error) },
        { status: 400 },
      );
    }

    const { env } = getCloudflareContext();
    const user = await verifyCredentials(
      env.DB,
      parsed.data.email,
      parsed.data.passwordHash,
    );

    if (!user) {
      return Response.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    return Response.json({ user }, { status: 200 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
