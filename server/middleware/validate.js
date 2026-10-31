import AppError from "../utils/appError.js";

export const validate = (schema, source = "body") => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    return next(new AppError(`Validation failed: ${issues.join(", ")}`, 400));
  }
  req[source] = result.data;
  return next();
};

