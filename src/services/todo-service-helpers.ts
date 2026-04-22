import type { GetTodosQuery } from "../schemas/todo-schema.js";
import { Prisma, TodoPriority } from "../generated/prisma/client.js";

export type SortField =
  | "createdAt"
  | "updatedAt"
  | "title"
  | "completed"
  | "priority"
  | "dueDate";

export type SortDirection = "asc" | "desc";

export type SortPair = {
  field: SortField;
  direction: SortDirection;
};

export type RawTodoRow = {
  id: string;
  title: string;
  description: string | null;
  priority: TodoPriority;
  completed: boolean;
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
};

export function parseSortPairs(sortValue?: string): SortPair[] {
  const value = sortValue ?? "createdAt_desc";

  const allowedFields: readonly SortField[] = [
    "createdAt",
    "updatedAt",
    "title",
    "completed",
    "priority",
    "dueDate",
  ];

  const allowedDirections: readonly SortDirection[] = ["asc", "desc"];

  return value
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [field, direction] = pair.split("_");

      if (
        field &&
        direction &&
        allowedFields.includes(field as SortField) &&
        allowedDirections.includes(direction as SortDirection)
      ) {
        return {
          field: field as SortField,
          direction: direction as SortDirection,
        };
      }

      return null;
    })
    .filter((pair): pair is SortPair => pair !== null);
}

export function buildPrismaWhere(
  userId: string,
  query: GetTodosQuery,
): Prisma.TodoWhereInput {
  const where: Prisma.TodoWhereInput = { userId };

  if (query.completed !== undefined) {
    where.completed = query.completed;
  }

  if (query.priority !== undefined) {
    where.priority = query.priority;
  }

  if (query.search) {
    where.OR = [
      {
        title: {
          contains: query.search,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: query.search,
          mode: "insensitive",
        },
      },
    ];
  }

  if (query.dueBefore || query.dueAfter) {
    where.dueDate = {
      ...(query.dueBefore ? { lte: query.dueBefore } : {}),
      ...(query.dueAfter ? { gte: query.dueAfter } : {}),
    };
  }

  return where;
}

export function buildPrismaOrderBy(
  sortPairs: SortPair[],
): Prisma.TodoOrderByWithRelationInput[] {
  if (sortPairs.length === 0) {
    return [{ createdAt: Prisma.SortOrder.desc }];
  }

  return sortPairs.map((pair) => ({
    [pair.field]:
      pair.direction === "asc"
        ? Prisma.SortOrder.asc
        : Prisma.SortOrder.desc,
  })) as Prisma.TodoOrderByWithRelationInput[];
}

export function buildRawOrderBy(sortPairs: SortPair[]): Prisma.Sql {
  if (sortPairs.length === 0) {
    return Prisma.raw(`"createdAt" DESC`);
  }

  return Prisma.raw(
    sortPairs
      .map((pair) => `"${pair.field}" ${pair.direction.toUpperCase()}`)
      .join(", "),
  );
}

export function buildRawStatusConditions(
  userId: string,
  query: GetTodosQuery,
  now: Date,
): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [Prisma.sql`"userId" = ${userId}`];

  if (query.priority !== undefined) {
    conditions.push(Prisma.sql`"priority" = ${query.priority}`);
  }

  if (query.search) {
    conditions.push(
      Prisma.sql`("title" ILIKE ${`%${query.search}%`} OR "description" ILIKE ${`%${query.search}%`})`,
    );
  }

  if (query.dueBefore) {
    conditions.push(Prisma.sql`"dueDate" <= ${query.dueBefore}`);
  }

  if (query.dueAfter) {
    conditions.push(Prisma.sql`"dueDate" >= ${query.dueAfter}`);
  }

  if (query.status === "completed_on_time") {
    conditions.push(Prisma.sql`"completed" = true`);
    conditions.push(Prisma.sql`"completedAt" IS NOT NULL`);
    conditions.push(Prisma.sql`"dueDate" IS NOT NULL`);
    conditions.push(Prisma.sql`"completedAt" <= "dueDate"`);
  }

  if (query.status === "completed_late") {
    conditions.push(Prisma.sql`"completed" = true`);
    conditions.push(Prisma.sql`"completedAt" IS NOT NULL`);
    conditions.push(Prisma.sql`"dueDate" IS NOT NULL`);
    conditions.push(Prisma.sql`"completedAt" > "dueDate"`);
  }

  if (query.status === "overdue") {
    conditions.push(Prisma.sql`"completed" = false`);
    conditions.push(Prisma.sql`"dueDate" IS NOT NULL`);
    conditions.push(Prisma.sql`"dueDate" < ${now}`);
  }

  return conditions;
}