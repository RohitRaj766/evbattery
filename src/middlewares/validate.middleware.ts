/**
 * validate.middleware.ts
 * ──────────────────────
 * Reusable Zod validation middleware factory.
 * Validates request body, query parameters, and URL params against Zod schemas.
 */

import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

interface ValidationSchemas {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

/**
 * Creates a middleware that validates request against the provided Zod schemas.
 * On failure, passes ZodError to the global error handler.
 * On success, replaces request fields with the parsed (type-coerced) values.
 */
export const validate = (schemas: ValidationSchemas) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(err);
      } else {
        next(err);
      }
    }
  };
};
