import "server-only";

import {
  createUserInputSchema,
  updateUserInputSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type User,
  type UserRow,
  type UserRowWithPassword,
} from "./user-service.types";

export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`An account with email ${email} already exists`);
    this.name = "DuplicateEmailError";
  }
}

export class UserNotFoundError extends Error {
  constructor(id: string) {
    super(`User ${id} not found`);
    this.name = "UserNotFoundError";
  }
}

function normalizeEmail(email: string): string {
  return email.toLowerCase();
}

function mapRowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("unique constraint failed")
  );
}

async function fetchUserRowById(
  db: D1Database,
  id: string,
): Promise<UserRowWithPassword | null> {
  const { results } = await db
    .prepare(
      `SELECT id, email, password_hash, first_name, last_name, created_at, updated_at
       FROM users
       WHERE id = ?1`,
    )
    .bind(id)
    .all<UserRowWithPassword>();

  return results[0] ?? null;
}

export async function createUser(
  db: D1Database,
  input: CreateUserInput,
): Promise<User> {
  const validated = createUserInputSchema.parse(input);
  const email = normalizeEmail(validated.email);

  try {
    await db
      .prepare(
        `INSERT INTO users (email, password_hash, first_name, last_name)
         VALUES (?1, ?2, ?3, ?4)`,
      )
      .bind(
        email,
        validated.passwordHash,
        validated.firstName,
        validated.lastName,
      )
      .run();
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new DuplicateEmailError(email);
    }
    throw error;
  }

  const user = await getUserByEmail(db, email);
  if (!user) {
    throw new Error("Failed to load user after creation");
  }

  return user;
}

export async function getUserById(
  db: D1Database,
  id: string,
): Promise<User | null> {
  const { results } = await db
    .prepare(
      `SELECT id, email, first_name, last_name, created_at, updated_at
       FROM users
       WHERE id = ?1`,
    )
    .bind(id)
    .all<UserRow>();

  const row = results[0];
  return row ? mapRowToUser(row) : null;
}

export async function getUserByEmail(
  db: D1Database,
  email: string,
): Promise<User | null> {
  const { results } = await db
    .prepare(
      `SELECT id, email, first_name, last_name, created_at, updated_at
       FROM users
       WHERE email = ?1`,
    )
    .bind(normalizeEmail(email))
    .all<UserRow>();

  const row = results[0];
  return row ? mapRowToUser(row) : null;
}

export async function updateUser(
  db: D1Database,
  id: string,
  input: UpdateUserInput,
): Promise<User> {
  const validated = updateUserInputSchema.parse(input);
  const existing = await fetchUserRowById(db, id);

  if (!existing) {
    throw new UserNotFoundError(id);
  }

  const email = normalizeEmail(validated.email ?? existing.email);
  const passwordHash = validated.passwordHash ?? existing.password_hash;
  const firstName = validated.firstName ?? existing.first_name;
  const lastName = validated.lastName ?? existing.last_name;

  try {
    await db
      .prepare(
        `UPDATE users
         SET email = ?1, password_hash = ?2, first_name = ?3, last_name = ?4, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?5`,
      )
      .bind(email, passwordHash, firstName, lastName, id)
      .run();
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new DuplicateEmailError(email);
    }
    throw error;
  }

  const updated = await getUserById(db, id);
  if (!updated) {
    throw new UserNotFoundError(id);
  }

  return updated;
}

export async function deleteUser(db: D1Database, id: string): Promise<boolean> {
  const result = await db
    .prepare(`DELETE FROM users WHERE id = ?1`)
    .bind(id)
    .run();

  return (result.meta.changes ?? 0) > 0;
}

export async function verifyCredentials(
  db: D1Database,
  email: string,
  passwordHash: string,
): Promise<User | null> {
  const { results } = await db
    .prepare(
      `SELECT id, email, password_hash, first_name, last_name, created_at, updated_at
       FROM users
       WHERE email = ?1`,
    )
    .bind(normalizeEmail(email))
    .all<UserRowWithPassword>();

  const row = results[0];
  if (!row || row.password_hash !== passwordHash) {
    return null;
  }

  return mapRowToUser(row);
}

export {
  createUserInputSchema,
  updateUserInputSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type User,
} from "./user-service.types";
