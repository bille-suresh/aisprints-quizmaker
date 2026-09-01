vi.mock("server-only", () => ({}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn(),
}));

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listGet, POST as createPost } from "@/app/api/mcqs/route";
import {
  DELETE as deleteMcq,
  GET as getById,
  PUT as updatePut,
} from "@/app/api/mcqs/[id]/route";
import { POST as attemptPost } from "@/app/api/mcqs/[id]/attempt/route";
import { createMcq } from "@/lib/services/mcq-service";
import { createInMemoryMcqD1 } from "../../helpers/in-memory-d1";

const validMcqBody = {
  name: "Photosynthesis basics",
  question: "Which organelle performs photosynthesis?",
  choices: [
    { choiceText: "Mitochondria", isCorrect: false },
    { choiceText: "Chloroplast", isCorrect: true },
  ],
};

function jsonRequest(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("MCQ Phase 3: MCQ API Endpoints", () => {
  let db: D1Database;

  beforeEach(() => {
    db = createInMemoryMcqD1();
    vi.mocked(getCloudflareContext).mockReturnValue({
      env: { DB: db },
    } as ReturnType<typeof getCloudflareContext>);
  });

  describe("POST /api/mcqs", () => {
    it("returns 201 with an MCQ object including choices", async () => {
      const response = await createPost(
        jsonRequest("http://localhost/api/mcqs", "POST", validMcqBody),
      );

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.mcq).toMatchObject({
        name: validMcqBody.name,
        question: validMcqBody.question,
      });
      expect(body.mcq.id).toBeTruthy();
      expect(body.mcq.choices).toHaveLength(2);
    });

    it("returns 400 for invalid request payloads", async () => {
      const response = await createPost(
        jsonRequest("http://localhost/api/mcqs", "POST", {
          name: "",
          question: "",
          choices: [],
        }),
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBeTruthy();
    });
  });

  describe("GET /api/mcqs", () => {
    it("returns 200 with an array of MCQ summaries", async () => {
      await createMcq(db, validMcqBody);

      const response = await listGet(
        jsonRequest("http://localhost/api/mcqs", "GET"),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.mcqs).toHaveLength(1);
      expect(body.mcqs[0]).toMatchObject({
        name: validMcqBody.name,
        question: validMcqBody.question,
      });
      expect(body.mcqs[0]).not.toHaveProperty("choices");
    });
  });

  describe("GET /api/mcqs/:id", () => {
    it("returns 200 with the MCQ when it exists", async () => {
      const created = await createMcq(db, validMcqBody);

      const response = await getById(
        jsonRequest(`http://localhost/api/mcqs/${created.id}`, "GET"),
        routeParams(created.id),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.mcq.id).toBe(created.id);
      expect(body.mcq.choices).toHaveLength(2);
    });

    it("returns 404 when the MCQ does not exist", async () => {
      const response = await getById(
        jsonRequest("http://localhost/api/mcqs/missing-id", "GET"),
        routeParams("missing-id"),
      );

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("MCQ not found");
    });
  });

  describe("PUT /api/mcqs/:id", () => {
    it("returns 200 with the updated MCQ", async () => {
      const created = await createMcq(db, validMcqBody);

      const response = await updatePut(
        jsonRequest(`http://localhost/api/mcqs/${created.id}`, "PUT", {
          ...validMcqBody,
          name: "Updated name",
        }),
        routeParams(created.id),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.mcq.name).toBe("Updated name");
    });

    it("returns 400 for invalid request payloads", async () => {
      const created = await createMcq(db, validMcqBody);

      const response = await updatePut(
        jsonRequest(`http://localhost/api/mcqs/${created.id}`, "PUT", {
          name: "",
          question: "",
          choices: [{ choiceText: "Only one", isCorrect: true }],
        }),
        routeParams(created.id),
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBeTruthy();
    });

    it("returns 404 when the MCQ does not exist", async () => {
      const response = await updatePut(
        jsonRequest("http://localhost/api/mcqs/missing-id", "PUT", validMcqBody),
        routeParams("missing-id"),
      );

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("MCQ not found");
    });
  });

  describe("DELETE /api/mcqs/:id", () => {
    it("returns 200 when the MCQ is deleted", async () => {
      const created = await createMcq(db, validMcqBody);

      const response = await deleteMcq(
        jsonRequest(`http://localhost/api/mcqs/${created.id}`, "DELETE"),
        routeParams(created.id),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("MCQ deleted");
    });

    it("returns 404 when the MCQ does not exist", async () => {
      const response = await deleteMcq(
        jsonRequest("http://localhost/api/mcqs/missing-id", "DELETE"),
        routeParams("missing-id"),
      );

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("MCQ not found");
    });
  });

  describe("POST /api/mcqs/:id/attempt", () => {
    it("returns 201 with attempt details including isCorrect", async () => {
      const created = await createMcq(db, validMcqBody);
      const correctChoice = created.choices.find((choice) => choice.isCorrect)!;

      const response = await attemptPost(
        jsonRequest(
          `http://localhost/api/mcqs/${created.id}/attempt`,
          "POST",
          { choiceId: correctChoice.id },
        ),
        routeParams(created.id),
      );

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.attempt).toMatchObject({
        mcqId: created.id,
        choiceId: correctChoice.id,
        isCorrect: true,
      });
      expect(body.attempt.id).toBeTruthy();
    });

    it("returns 400 when the choice does not belong to the MCQ", async () => {
      const first = await createMcq(db, validMcqBody);
      const second = await createMcq(db, {
        ...validMcqBody,
        name: "Second question",
      });

      const response = await attemptPost(
        jsonRequest(`http://localhost/api/mcqs/${first.id}/attempt`, "POST", {
          choiceId: second.choices[0]!.id,
        }),
        routeParams(first.id),
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBeTruthy();
    });

    it("returns 404 when the MCQ does not exist", async () => {
      const response = await attemptPost(
        jsonRequest("http://localhost/api/mcqs/missing-id/attempt", "POST", {
          choiceId: "missing-choice",
        }),
        routeParams("missing-id"),
      );

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("MCQ not found");
    });
  });
});
