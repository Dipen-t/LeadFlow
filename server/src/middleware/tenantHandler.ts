import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors';

export const requireBrokerage = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new UnauthorizedError());
  }

  if (!req.user.brokerageId && req.user.role !== 'PLATFORM_ADMIN') {
    return next(new UnauthorizedError('User does not belong to a brokerage'));
  }

  // Ensure normal users are confined to their brokerage
  // We can attach the active brokerageId to the request for easy access
  req.body.brokerageId = req.user.brokerageId;
  
  next();
};
