vi.mock("server-only", () => ({}));

import { beforeEach, describe, expect, it } from "vitest";
import { createInMemoryD1 } from "../helpers/in-memory-d1";
import {
  createUser,
  deleteUser,
  DuplicateEmailError,
  getUserByEmail,
  getUserById,
  updateUser,
  UserNotFoundError,
  verifyCredentials,
} from "@/lib/services/user-service";

describe("Phase 2: User Service", () => {
  let db: D1Database;

  beforeEach(() => {
    db = createInMemoryD1();
  });

  describe("createUser", () => {
    it("creates a user and returns public fields without password_hash", async () => {
      const user = await createUser(db, {
        email: "Teacher@School.edu",
        passwordHash: "hashed-password",
        firstName: "Jane",
        lastName: "Doe",
      });

      expect(user).toMatchObject({
        email: "teacher@school.edu",
        firstName: "Jane",
        lastName: "Doe",
      });
      expect(user.id).toBeTruthy();
      expect(user.createdAt).toBeTruthy();
      expect(user.updatedAt).toBeTruthy();
      expect(user).not.toHaveProperty("passwordHash");
      expect(user).not.toHaveProperty("password_hash");
    });

    it("throws DuplicateEmailError when email already exists", async () => {
      await createUser(db, {
        email: "teacher@school.edu",
        passwordHash: "hash-one",
        firstName: "Jane",
        lastName: "Doe",
      });

      await expect(
        createUser(db, {
          email: "Teacher@School.edu",
          passwordHash: "hash-two",
          firstName: "John",
          lastName: "Smith",
        }),
      ).rejects.toBeInstanceOf(DuplicateEmailError);
    });
  });

  describe("getUserById", () => {
    it("returns a user when the id exists", async () => {
      const created = await createUser(db, {
        email: "teacher@school.edu",
        passwordHash: "hash",
        firstName: "Jane",
        lastName: "Doe",
      });

      const found = await getUserById(db, created.id);

      expect(found).toEqual(created);
    });

    it("returns null when the id does not exist", async () => {
      const found = await getUserById(db, "missing-id");

      expect(found).toBeNull();
    });
  });

  describe("getUserByEmail", () => {
    it("finds a user by email case-insensitively", async () => {
      await createUser(db, {
        email: "teacher@school.edu",
        passwordHash: "hash",
        firstName: "Jane",
        lastName: "Doe",
      });

      const found = await getUserByEmail(db, "Teacher@School.edu");

      expect(found?.email).toBe("teacher@school.edu");
    });

    it("returns null when the email does not exist", async () => {
      const found = await getUserByEmail(db, "missing@school.edu");

      expect(found).toBeNull();
    });
  });

  describe("updateUser", () => {
    it("updates allowed fields and refreshes updated_at", async () => {
      const created = await createUser(db, {
        email: "teacher@school.edu",
        passwordHash: "old-hash",
        firstName: "Jane",
        lastName: "Doe",
      });

      const updated = await updateUser(db, created.id, {
        firstName: "Janet",
        lastName: "Smith",
        passwordHash: "new-hash",
      });

      expect(updated.firstName).toBe("Janet");
      expect(updated.lastName).toBe("Smith");
      expect(updated.email).toBe("teacher@school.edu");
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(created.updatedAt).getTime(),
      );
      expect(updated).not.toHaveProperty("passwordHash");
      expect(updated).not.toHaveProperty("password_hash");
    });

    it("normalizes email to lowercase on update", async () => {
      const created = await createUser(db, {
        email: "teacher@school.edu",
        passwordHash: "hash",
        firstName: "Jane",
        lastName: "Doe",
      });

      const updated = await updateUser(db, created.id, {
        email: "New.Email@School.edu",
      });

      expect(updated.email).toBe("new.email@school.edu");
    });

    it("throws UserNotFoundError when the user does not exist", async () => {
      await expect(
        updateUser(db, "missing-id", { firstName: "Nobody" }),
      ).rejects.toBeInstanceOf(UserNotFoundError);
    });
  });

  describe("deleteUser", () => {
    it("returns true when a user is deleted", async () => {
      const created = await createUser(db, {
        email: "teacher@school.edu",
        passwordHash: "hash",
        firstName: "Jane",
        lastName: "Doe",
      });

      const deleted = await deleteUser(db, created.id);

      expect(deleted).toBe(true);
      expect(await getUserById(db, created.id)).toBeNull();
    });

    it("returns false when the user does not exist", async () => {
      const deleted = await deleteUser(db, "missing-id");

      expect(deleted).toBe(false);
    });
  });

  describe("verifyCredentials", () => {
    it("returns the user when email and password hash match", async () => {
      const created = await createUser(db, {
        email: "teacher@school.edu",
        passwordHash: "correct-hash",
        firstName: "Jane",
        lastName: "Doe",
      });

      const verified = await verifyCredentials(
        db,
        "Teacher@School.edu",
        "correct-hash",
      );

      expect(verified).toEqual(created);
    });

    it("returns null when the password hash does not match", async () => {
      await createUser(db, {
        email: "teacher@school.edu",
        passwordHash: "correct-hash",
        firstName: "Jane",
        lastName: "Doe",
      });

      const verified = await verifyCredentials(
        db,
        "teacher@school.edu",
        "wrong-hash",
      );

      expect(verified).toBeNull();
    });

    it("returns null when the email does not exist", async () => {
      const verified = await verifyCredentials(
        db,
        "missing@school.edu",
        "any-hash",
      );

      expect(verified).toBeNull();
    });
  });
});
