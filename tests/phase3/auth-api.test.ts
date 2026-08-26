vi.mock("server-only", () => ({}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn(),
}));

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as loginPost } from "@/app/api/auth/login/route";
import { POST as logoutPost } from "@/app/api/auth/logout/route";
import { POST as registerPost } from "@/app/api/auth/register/route";
import { createUser } from "@/lib/services/user-service";
import { createInMemoryD1 } from "../helpers/in-memory-d1";

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Phase 3: Auth API Endpoints", () => {
  let db: D1Database;

  beforeEach(() => {
    db = createInMemoryD1();
    vi.mocked(getCloudflareContext).mockReturnValue({
      env: { DB: db },
    } as ReturnType<typeof getCloudflareContext>);
  });

  describe("POST /api/auth/register", () => {
    it("returns 201 with a user object without password fields", async () => {
      const response = await registerPost(
        jsonRequest("http://localhost/api/auth/register", {
          email: "teacher@school.edu",
          passwordHash: "hashed-password",
          firstName: "Jane",
          lastName: "Doe",
        }),
      );

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.user).toMatchObject({
        email: "teacher@school.edu",
        firstName: "Jane",
        lastName: "Doe",
      });
      expect(body.user.id).toBeTruthy();
      expect(body.user).not.toHaveProperty("passwordHash");
      expect(body.user).not.toHaveProperty("password_hash");
    });

    it("returns 400 for invalid request payloads", async () => {
      const response = await registerPost(
        jsonRequest("http://localhost/api/auth/register", {
          email: "not-an-email",
          passwordHash: "",
          firstName: "",
          lastName: "Doe",
        }),
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBeTruthy();
    });

    it("returns 409 when the email already exists", async () => {
      await createUser(db, {
        email: "teacher@school.edu",
        passwordHash: "existing-hash",
        firstName: "Existing",
        lastName: "User",
      });

      const response = await registerPost(
        jsonRequest("http://localhost/api/auth/register", {
          email: "teacher@school.edu",
          passwordHash: "new-hash",
          firstName: "Jane",
          lastName: "Doe",
        }),
      );

      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.error).toBe("An account with this email already exists");
    });
  });

  describe("POST /api/auth/login", () => {
    it("returns 200 with a user object when credentials are valid", async () => {
      const created = await createUser(db, {
        email: "teacher@school.edu",
        passwordHash: "correct-hash",
        firstName: "Jane",
        lastName: "Doe",
      });

      const response = await loginPost(
        jsonRequest("http://localhost/api/auth/login", {
          email: "teacher@school.edu",
          passwordHash: "correct-hash",
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.user).toEqual(created);
      expect(body.user).not.toHaveProperty("passwordHash");
      expect(body.user).not.toHaveProperty("password_hash");
    });

    it("returns 400 for invalid request payloads", async () => {
      const response = await loginPost(
        jsonRequest("http://localhost/api/auth/login", {
          email: "not-an-email",
          passwordHash: "",
        }),
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBeTruthy();
    });

    it("returns 401 when credentials are invalid", async () => {
      await createUser(db, {
        email: "teacher@school.edu",
        passwordHash: "correct-hash",
        firstName: "Jane",
        lastName: "Doe",
      });

      const response = await loginPost(
        jsonRequest("http://localhost/api/auth/login", {
          email: "teacher@school.edu",
          passwordHash: "wrong-hash",
        }),
      );

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Invalid email or password");
    });
  });

  describe("POST /api/auth/logout", () => {
    it("returns 200 with a logout acknowledgment message", async () => {
      const response = await logoutPost(
        new Request("http://localhost/api/auth/logout", { method: "POST" }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("Logged out");
    });

    it("accepts an empty JSON body", async () => {
      const response = await logoutPost(
        jsonRequest("http://localhost/api/auth/logout", {}),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("Logged out");
    });
  });
});
