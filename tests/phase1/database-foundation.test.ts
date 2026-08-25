import { execSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "../..");
const WRANGLER_PATH = join(ROOT, "wrangler.jsonc");
const MIGRATIONS_DIR = join(ROOT, "migrations");
const CLOUDFLARE_ENV_PATH = join(ROOT, "cloudflare-env.d.ts");
const DATABASE_NAME = "aisprint-quizmaker-db";

function parseJsonc(content: string): Record<string, unknown> {
  const stripped = content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  return JSON.parse(stripped) as Record<string, unknown>;
}

function readUsersMigrationSql(): string {
  const migrationFiles = readdirSync(MIGRATIONS_DIR).filter((file) =>
    file.endsWith(".sql"),
  );
  expect(migrationFiles.length).toBeGreaterThan(0);

  const usersMigration = migrationFiles.find((file) =>
    readFileSync(join(MIGRATIONS_DIR, file), "utf8")
      .toLowerCase()
      .includes("create table users"),
  );
  expect(usersMigration).toBeDefined();

  return readFileSync(join(MIGRATIONS_DIR, usersMigration!), "utf8");
}

describe("Phase 1: Database Foundation", () => {
  describe("wrangler.jsonc D1 binding", () => {
    it("configures a D1 database binding named DB", () => {
      const config = parseJsonc(readFileSync(WRANGLER_PATH, "utf8"));
      const d1Databases = config.d1_databases as
        | Array<{ binding: string; database_name: string; database_id: string }>
        | undefined;

      expect(d1Databases).toBeDefined();
      expect(d1Databases!.length).toBeGreaterThan(0);

      const dbBinding = d1Databases!.find((entry) => entry.binding === "DB");
      expect(dbBinding).toBeDefined();
      expect(dbBinding!.database_name).toBe(DATABASE_NAME);
      expect(dbBinding!.database_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe("users table migration", () => {
    it("exists under migrations/ with the required schema", () => {
      const sql = readUsersMigrationSql().toLowerCase();

      expect(sql).toContain("create table users");
      expect(sql).toContain("id text primary key");
      expect(sql).toContain("email text not null unique");
      expect(sql).toContain("password_hash text not null");
      expect(sql).toContain("first_name text not null");
      expect(sql).toContain("last_name text not null");
      expect(sql).toContain("created_at datetime");
      expect(sql).toContain("updated_at datetime");
      expect(sql).toContain("create index idx_users_email on users(email)");
    });
  });

  describe("CloudflareEnv types", () => {
    it("includes a typed DB binding after cf-typegen", () => {
      const envTypes = readFileSync(CLOUDFLARE_ENV_PATH, "utf8");
      const generatedSection = envTypes.slice(
        0,
        envTypes.indexOf("// Begin runtime types") === -1
          ? envTypes.length
          : envTypes.indexOf("// Begin runtime types"),
      );

      expect(generatedSection).toMatch(/DB:\s*D1Database/);
      expect(generatedSection).toMatch(/interface CloudflareEnv/);
    });
  });

  describe("local D1 migration apply", () => {
    it("applies migrations locally without error", () => {
      execSync(
        `npx wrangler d1 migrations apply ${DATABASE_NAME} --local`,
        { cwd: ROOT, stdio: "pipe", encoding: "utf8" },
      );
    });

    it("creates the users table with expected columns in local D1", () => {
      const output = execSync(
        `npx wrangler d1 execute ${DATABASE_NAME} --local --command "PRAGMA table_info(users);"`,
        { cwd: ROOT, stdio: "pipe", encoding: "utf8" },
      );

      const expectedColumns = [
        "id",
        "email",
        "password_hash",
        "first_name",
        "last_name",
        "created_at",
        "updated_at",
      ];

      for (const column of expectedColumns) {
        expect(output.toLowerCase()).toContain(column);
      }
    });
  });
});
