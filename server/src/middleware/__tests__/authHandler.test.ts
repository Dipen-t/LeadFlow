import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, requireRole } from '../authHandler';
import { UnauthorizedError, ForbiddenError } from '../../utils/errors';
import { env } from '../../config/env';

vi.mock('jsonwebtoken');

describe('authHandler', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { headers: {} };
    res = {};
    next = vi.fn();
    vi.resetAllMocks();
  });

  describe('authenticate', () => {
    it('should throw UnauthorizedError if no authorization header is present', () => {
      authenticate(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('should throw UnauthorizedError if token format is invalid', () => {
      req.headers = { authorization: 'Basic token123' };
      authenticate(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('should attach user to request if token is valid', () => {
      const payload = { userId: '1', role: 'ADVISOR', brokerageId: 'b1' };
      req.headers = { authorization: 'Bearer valid_token' };
      vi.mocked(jwt.verify).mockReturnValue(payload as any);

      authenticate(req as Request, res as Response, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid_token', env.JWT_SECRET);
      expect(req.user).toEqual(payload);
      expect(next).toHaveBeenCalledWith(); // Called without error
    });

    it('should throw UnauthorizedError if token is invalid or expired', () => {
      req.headers = { authorization: 'Bearer invalid_token' };
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('invalid token');
      });

      authenticate(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });
  });

  describe('requireRole', () => {
    it('should throw UnauthorizedError if req.user is undefined', () => {
      const middleware = requireRole(['PLATFORM_ADMIN']);
      middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('should throw ForbiddenError if user does not have required role', () => {
      req.user = { userId: '1', role: 'CLIENT', brokerageId: 'b1' };
      const middleware = requireRole(['PLATFORM_ADMIN', 'BROKERAGE_ADMIN']);
      
      middleware(req as Request, res as Response, next);
      
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('should call next() if user has required role', () => {
      req.user = { userId: '1', role: 'BROKERAGE_ADMIN', brokerageId: 'b1' };
      const middleware = requireRole(['PLATFORM_ADMIN', 'BROKERAGE_ADMIN']);
      
      middleware(req as Request, res as Response, next);
      
      expect(next).toHaveBeenCalledWith();
    });
  });
});
