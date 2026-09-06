import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { isProduction } from '../config/env.js';
import { logger } from '../lib/logger.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`Route ${req.method} ${req.path} does not exist`));
};

const toAppError = (error: unknown): AppError => {
  if (error instanceof AppError) return error;

  if (error instanceof ZodError) {
    return AppError.badRequest(
      'The submitted data is invalid',
      error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return AppError.conflict('That record already exists');
      case 'P2003':
        return AppError.badRequest('Related record does not exist');
      case 'P2025':
        return AppError.notFound('Record not found');
      default:
        break;
    }
  }

  return AppError.internal();
};

// Express 5 forwards rejected promises from async handlers here automatically,
// so route handlers need no try/catch wrapper.
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const appError = toAppError(error);

  if (appError.statusCode >= 500) {
    logger.error({ err: error, reqId: req.id }, 'Unhandled error');
  } else {
    logger.warn({ code: appError.code, msg: appError.message, reqId: req.id }, 'Request rejected');
  }

  res.status(appError.statusCode).json({
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details ? { details: appError.details } : {}),
      ...(isProduction ? {} : { requestId: req.id }),
    },
  });
};
