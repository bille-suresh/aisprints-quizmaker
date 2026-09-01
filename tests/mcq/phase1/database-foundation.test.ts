import { execSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "../../..");
const MIGRATIONS_DIR = join(ROOT, "migrations");
const DATABASE_NAME = "aisprint-quizmaker-db";

function readMcqMigrationSql(): string {
  const migrationFiles = readdirSync(MIGRATIONS_DIR).filter((file) =>
    file.endsWith(".sql"),
  );

  const mcqMigration = migrationFiles.find((file) =>
    readFileSync(join(MIGRATIONS_DIR, file), "utf8")
      .toLowerCase()
      .includes("create table mcqs"),
  );
  expect(mcqMigration).toBeDefined();

  return readFileSync(join(MIGRATIONS_DIR, mcqMigration!), "utf8");
}

function tableColumns(tableName: string): string[] {
  const output = execSync(
    `npx wrangler d1 execute ${DATABASE_NAME} --local --json --command "PRAGMA table_info(${tableName});"`,
    { cwd: ROOT, stdio: "pipe", encoding: "utf8" },
  );

  const parsed = JSON.parse(output) as Array<{
    results: Array<{ name: string }>;
  }>;

  return parsed[0]?.results.map((row) => row.name.toLowerCase()) ?? [];
}

describe("MCQ Phase 1: Database Foundation", () => {
  describe("mcq tables migration", () => {
    it("exists under migrations/ with all three CREATE TABLE statements", () => {
      const sql = readMcqMigrationSql().toLowerCase();

      expect(sql).toContain("create table mcqs");
      expect(sql).toContain("create table mcq_choices");
      expect(sql).toContain("create table mcq_attempts");
    });

    it("defines the mcqs table with required columns", () => {
      const sql = readMcqMigrationSql().toLowerCase();

      expect(sql).toContain("id text primary key");
      expect(sql).toContain("name text not null");
      expect(sql).toContain("question text not null");
      expect(sql).toContain("created_at datetime");
      expect(sql).toContain("updated_at datetime");
    });

    it("defines mcq_choices with foreign key and index", () => {
      const sql = readMcqMigrationSql().toLowerCase();

      expect(sql).toContain("mcq_id text not null");
      expect(sql).toContain("choice_text text not null");
      expect(sql).toContain("is_correct integer not null");
      expect(sql).toContain("sort_order integer not null");
      expect(sql).toContain(
        "foreign key (mcq_id) references mcqs(id) on delete cascade",
      );
      expect(sql).toContain(
        "create index idx_mcq_choices_mcq_id on mcq_choices(mcq_id)",
      );
    });

    it("defines mcq_attempts with foreign keys and index", () => {
      const sql = readMcqMigrationSql().toLowerCase();

      expect(sql).toContain("choice_id text not null");
      expect(sql).toContain(
        "foreign key (mcq_id) references mcqs(id) on delete cascade",
      );
      expect(sql).toContain(
        "foreign key (choice_id) references mcq_choices(id) on delete cascade",
      );
      expect(sql).toContain(
        "create index idx_mcq_attempts_mcq_id on mcq_attempts(mcq_id)",
      );
    });
  });

  describe("local D1 migration apply", () => {
    it("applies MCQ migrations locally without error", () => {
      execSync(
        `npx wrangler d1 migrations apply ${DATABASE_NAME} --local`,
        { cwd: ROOT, stdio: "pipe", encoding: "utf8" },
      );
    });

    it("creates the mcqs table with expected columns in local D1", () => {
      const columns = tableColumns("mcqs");

      expect(columns).toEqual(
        expect.arrayContaining([
          "id",
          "name",
          "question",
          "created_at",
          "updated_at",
        ]),
      );
    });

    it("creates the mcq_choices table with expected columns in local D1", () => {
      const columns = tableColumns("mcq_choices");

      expect(columns).toEqual(
        expect.arrayContaining([
          "id",
          "mcq_id",
          "choice_text",
          "is_correct",
          "sort_order",
          "created_at",
          "updated_at",
        ]),
      );
    });

    it("creates the mcq_attempts table with expected columns in local D1", () => {
      const columns = tableColumns("mcq_attempts");

      expect(columns).toEqual(
        expect.arrayContaining([
          "id",
          "mcq_id",
          "choice_id",
          "is_correct",
          "created_at",
        ]),
      );
    });
  });
});
