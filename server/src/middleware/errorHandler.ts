import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { z } from 'zod';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    logger.warn({ err }, err.message);
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  if (err instanceof z.ZodError) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: (err as any).errors,
    });
  }

  logger.error({ err }, 'Unhandled error');
  return res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
};
