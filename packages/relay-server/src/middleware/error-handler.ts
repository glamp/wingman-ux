import type { Request, Response, NextFunction } from 'express';
import type { RelayError } from '@wingman/shared';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err);

  if (res.headersSent) {
    return next(err);
  }

  const error: RelayError = {
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
  };

  if (process.env.NODE_ENV !== 'production') {
    error.details = err.stack;
  }

  const status = err.status || 500;
  res.status(status).json(error);
}