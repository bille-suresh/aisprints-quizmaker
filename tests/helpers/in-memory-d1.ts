type StoredUser = {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
};

type StoredMcq = {
  id: string;
  name: string;
  question: string;
  created_at: string;
  updated_at: string;
};

type StoredMcqChoice = {
  id: string;
  mcq_id: string;
  choice_text: string;
  is_correct: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type StoredMcqAttempt = {
  id: string;
  mcq_id: string;
  choice_id: string;
  is_correct: number;
  created_at: string;
};

type BoundStatement = {
  run: () => Promise<{ success: boolean; meta: { changes?: number } }>;
  all: <T>() => Promise<{ results: T[] }>;
};

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim().toLowerCase();
}

function createBoundStatement(
  normalized: string,
  args: unknown[],
  context: {
    users?: StoredUser[];
    mcqs?: StoredMcq[];
    mcqChoices?: StoredMcqChoice[];
    mcqAttempts?: StoredMcqAttempt[];
  },
): BoundStatement {
  return {
    async all<T>() {
      const { users, mcqs, mcqChoices } = context;

      if (
        users &&
        normalized.includes("from users") &&
        normalized.includes("where email = ?1")
      ) {
        const email = String(args[0]).toLowerCase();
        const includePassword = normalized.includes("password_hash");
        const results = users
          .filter((user) => user.email === email)
          .map((user) => (includePassword ? user : omitPasswordHash(user)));
        return { results: results as T[] };
      }

      if (
        users &&
        normalized.includes("from users") &&
        normalized.includes("where id = ?1")
      ) {
        const id = String(args[0]);
        const results = users
          .filter((user) => user.id === id)
          .map((user) => omitPasswordHash(user));
        return { results: results as T[] };
      }

      if (mcqs && normalized.includes("from mcqs")) {
        if (normalized.includes("where id = ?1")) {
          const id = String(args[0]);
          const results = mcqs.filter((mcq) => mcq.id === id);
          return { results: results as T[] };
        }

        if (normalized.includes("order by updated_at desc")) {
          const results = [...mcqs].sort(
            (left, right) =>
              new Date(right.updated_at).getTime() -
              new Date(left.updated_at).getTime(),
          );
          return { results: results as T[] };
        }
      }

      if (
        mcqChoices &&
        normalized.includes("from mcq_choices") &&
        normalized.includes("where mcq_id = ?1")
      ) {
        const mcqId = String(args[0]);
        const results = mcqChoices
          .filter((choice) => choice.mcq_id === mcqId)
          .sort((left, right) => left.sort_order - right.sort_order);
        return { results: results as T[] };
      }

      return { results: [] as T[] };
    },

    async run() {
      const { users, mcqs, mcqChoices, mcqAttempts } = context;

      if (users && normalized.startsWith("insert into users")) {
        const [email, passwordHash, firstName, lastName] = args as [
          string,
          string,
          string,
          string,
        ];
        const normalizedEmail = email.toLowerCase();

        if (users.some((user) => user.email === normalizedEmail)) {
          throw new Error("D1_ERROR: UNIQUE constraint failed: users.email");
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

      if (users && normalized.startsWith("update users set")) {
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

      if (users && normalized.startsWith("delete from users")) {
        const id = String(args[0]);
        const index = users.findIndex((user) => user.id === id);

        if (index === -1) {
          return { success: true, meta: { changes: 0 } };
        }

        users.splice(index, 1);
        return { success: true, meta: { changes: 1 } };
      }

      if (mcqs && normalized.startsWith("insert into mcqs")) {
        const [id, name, question, createdAt, updatedAt] = args as [
          string,
          string,
          string,
          string,
          string,
        ];

        mcqs.push({
          id,
          name,
          question,
          created_at: createdAt,
          updated_at: updatedAt,
        });

        return { success: true, meta: { changes: 1 } };
      }

      if (mcqChoices && normalized.startsWith("insert into mcq_choices")) {
        const [
          id,
          mcqId,
          choiceText,
          isCorrect,
          sortOrder,
          createdAt,
          updatedAt,
        ] = args as [string, string, string, number, number, string, string];

        mcqChoices.push({
          id,
          mcq_id: mcqId,
          choice_text: choiceText,
          is_correct: isCorrect,
          sort_order: sortOrder,
          created_at: createdAt,
          updated_at: updatedAt,
        });

        return { success: true, meta: { changes: 1 } };
      }

      if (mcqAttempts && normalized.startsWith("insert into mcq_attempts")) {
        const [id, mcqId, choiceId, isCorrect, createdAt] = args as [
          string,
          string,
          string,
          number,
          string,
        ];

        mcqAttempts.push({
          id,
          mcq_id: mcqId,
          choice_id: choiceId,
          is_correct: isCorrect,
          created_at: createdAt,
        });

        return { success: true, meta: { changes: 1 } };
      }

      if (mcqs && normalized.startsWith("update mcqs set")) {
        const id = String(args[args.length - 1]);
        const mcq = mcqs.find((entry) => entry.id === id);

        if (!mcq) {
          return { success: true, meta: { changes: 0 } };
        }

        mcq.name = String(args[0]);
        mcq.question = String(args[1]);
        mcq.updated_at = String(args[2]);

        return { success: true, meta: { changes: 1 } };
      }

      if (mcqChoices && normalized.startsWith("delete from mcq_choices")) {
        const mcqId = String(args[0]);
        const remaining = mcqChoices.filter((choice) => choice.mcq_id !== mcqId);
        mcqChoices.splice(0, mcqChoices.length, ...remaining);
        return { success: true, meta: { changes: 1 } };
      }

      if (mcqs && normalized.startsWith("delete from mcqs")) {
        const id = String(args[0]);
        const index = mcqs.findIndex((mcq) => mcq.id === id);

        if (index === -1) {
          return { success: true, meta: { changes: 0 } };
        }

        mcqs.splice(index, 1);

        if (mcqChoices) {
          const remainingChoices = mcqChoices.filter(
            (choice) => choice.mcq_id !== id,
          );
          mcqChoices.splice(0, mcqChoices.length, ...remainingChoices);
        }

        if (mcqAttempts) {
          const remainingAttempts = mcqAttempts.filter(
            (attempt) => attempt.mcq_id !== id,
          );
          mcqAttempts.splice(0, mcqAttempts.length, ...remainingAttempts);
        }

        return { success: true, meta: { changes: 1 } };
      }

      return { success: true, meta: { changes: 0 } };
    },
  };
}

function createDatabase(context: {
  users?: StoredUser[];
  mcqs?: StoredMcq[];
  mcqChoices?: StoredMcqChoice[];
  mcqAttempts?: StoredMcqAttempt[];
}): D1Database {
  return {
    prepare(sql: string) {
      const normalized = normalizeSql(sql);

      const unbound = createBoundStatement(normalized, [], context);

      return {
        bind(...args: unknown[]) {
          return createBoundStatement(normalized, args, context);
        },
        all: unbound.all.bind(unbound),
        run: unbound.run.bind(unbound),
      };
    },

    async batch(statements: BoundStatement[]) {
      for (const statement of statements) {
        await statement.run();
      }
      return [];
    },
  } as unknown as D1Database;
}

export function createInMemoryD1(initialUsers: StoredUser[] = []): D1Database {
  const users = initialUsers.map((user) => ({
    ...user,
    email: user.email.toLowerCase(),
  }));

  return createDatabase({ users });
}

export function createInMemoryMcqD1(
  initialMcqs: StoredMcq[] = [],
  initialChoices: StoredMcqChoice[] = [],
  initialAttempts: StoredMcqAttempt[] = [],
): D1Database {
  return createDatabase({
    mcqs: [...initialMcqs],
    mcqChoices: [...initialChoices],
    mcqAttempts: [...initialAttempts],
  });
}

function omitPasswordHash(user: StoredUser): Omit<StoredUser, "password_hash"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured to omit password_hash
  const { password_hash, ...publicUser } = user;
  return publicUser;
}
