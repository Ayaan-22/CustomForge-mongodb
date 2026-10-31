import type { ZodSchema } from "zod";

export class ValidationError extends Error {
  constructor(public schema: string, public errors: string[]) {
    super(`Schema validation failed for ${schema}: ${errors.join(", ")}`);
    this.name = "ValidationError";
  }
}

export function validateSchema<T>(
  schema: ZodSchema,
  data: unknown,
  schemaName: string
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map(
      (e) => `${e.path.join(".")}: ${e.message}`
    );
    throw new ValidationError(schemaName, errors);
  }
  return result.data as T;
}

export function isValidSchema(schema: ZodSchema, data: unknown): boolean {
  return schema.safeParse(data).success;
}

export function getValidationErrors(
  schema: ZodSchema,
  data: unknown
): string[] {
  const result = schema.safeParse(data);
  if (!result.success) {
    return result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
  }
  return [];
}
