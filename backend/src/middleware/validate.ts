import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';

interface ValidationSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

const formatIssues = (error: ZodError) =>
  error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    message: issue.message,
  }));

/**
 * Parses and *replaces* the request payloads with their validated, coerced versions,
 * so controllers never see unvalidated input. Express 5 exposes req.query through a
 * getter, so the validated query is written to res.locals.query instead.
 */
export const validate =
  (schemas: ValidationSchemas): RequestHandler =>
  (req, res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.params) Object.assign(req.params, schemas.params.parse(req.params));
      if (schemas.query) res.locals.query = schemas.query.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(AppError.badRequest('The submitted data is invalid', formatIssues(error)));
        return;
      }
      next(error);
    }
  };
