import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireBrokerage } from '../tenantHandler';
import { UnauthorizedError } from '../../utils/errors';

describe('tenantHandler', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { body: {} };
    res = {};
    next = vi.fn();
  });

  it('should throw UnauthorizedError if no user is found', () => {
    requireBrokerage(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('should allow PLATFORM_ADMIN to proceed without a brokerageId', () => {
    req.user = { userId: '1', role: 'PLATFORM_ADMIN', brokerageId: null };
    requireBrokerage(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('should throw UnauthorizedError if a non-PLATFORM_ADMIN lacks a brokerageId', () => {
    req.user = { userId: '2', role: 'ADVISOR', brokerageId: null };
    requireBrokerage(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('should attach brokerageId to req.body for authorized users', () => {
    req.user = { userId: '3', role: 'ADVISOR', brokerageId: 'b123' };
    requireBrokerage(req as Request, res as Response, next);
    
    expect(req.body.brokerageId).toBe('b123');
    expect(next).toHaveBeenCalledWith();
  });
});
