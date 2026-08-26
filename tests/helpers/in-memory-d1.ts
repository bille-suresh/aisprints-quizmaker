type StoredUser = {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
};

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim().toLowerCase();
}

export function createInMemoryD1(initialUsers: StoredUser[] = []): D1Database {
  const users = initialUsers.map((user) => ({
    ...user,
    email: user.email.toLowerCase(),
  }));

  return {
    prepare(sql: string) {
      const normalized = normalizeSql(sql);

      return {
        bind(...args: unknown[]) {
          return {
            async all<T>() {
              if (
                normalized.includes("from users") &&
                normalized.includes("where email = ?1")
              ) {
                const email = String(args[0]).toLowerCase();
                const includePassword = normalized.includes("password_hash");
                const results = users
                  .filter((user) => user.email === email)
                  .map((user) =>
                    includePassword ? user : omitPasswordHash(user),
                  );
                return { results: results as T[] };
              }

              if (
                normalized.includes("from users") &&
                normalized.includes("where id = ?1")
              ) {
                const id = String(args[0]);
                const results = users
                  .filter((user) => user.id === id)
                  .map((user) => omitPasswordHash(user));
                return { results: results as T[] };
              }

              return { results: [] as T[] };
            },

            async run() {
              if (normalized.startsWith("insert into users")) {
                const [email, passwordHash, firstName, lastName] = args as [
                  string,
                  string,
                  string,
                  string,
                ];
                const normalizedEmail = email.toLowerCase();

                if (users.some((user) => user.email === normalizedEmail)) {
                  const error = new Error(
                    "D1_ERROR: UNIQUE constraint failed: users.email",
                  );
                  throw error;
                }

                const timestamp = new Date().toISOString();
                users.push({
                  id: crypto.randomUUID(),
                  email: normalizedEmail,
                  password_hash: passwordHash,
                  first_name: firstName,
                  last_name: lastName,
                  created_at: timestamp,
                  updated_at: timestamp,
                });

                return { success: true, meta: { changes: 1 } };
              }

              if (normalized.startsWith("update users set")) {
                const id = String(args[args.length - 1]);
                const user = users.find((entry) => entry.id === id);

                if (!user) {
                  return { success: true, meta: { changes: 0 } };
                }

                if (normalized.includes("email = ?1")) {
                  user.email = String(args[0]).toLowerCase();
                  user.password_hash = String(args[1]);
                  user.first_name = String(args[2]);
                  user.last_name = String(args[3]);
                  user.updated_at = new Date().toISOString();
                }

                return { success: true, meta: { changes: 1 } };
              }

              if (normalized.startsWith("delete from users")) {
                const id = String(args[0]);
                const index = users.findIndex((user) => user.id === id);

                if (index === -1) {
                  return { success: true, meta: { changes: 0 } };
                }

                users.splice(index, 1);
                return { success: true, meta: { changes: 1 } };
              }

              return { success: true, meta: { changes: 0 } };
            },
          };
        },
      };
    },
  } as unknown as D1Database;
}

function omitPasswordHash(user: StoredUser): Omit<StoredUser, "password_hash"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured to omit password_hash
  const { password_hash, ...publicUser } = user;
  return publicUser;
}
