import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { User } from '../../users/user.model';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';

vi.mock('../../users/user.model');

describe('Auth API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 if validation fails', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'not-an-email',
      });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
    });

    it('should return 401 if user is not found', async () => {
      const mockQuery = { select: vi.fn().mockResolvedValue(null) };
      vi.mocked(User.findOne).mockReturnValue(mockQuery as any);

      const res = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid credentials or account inactive');
    });

    it('should return 401 if password does not match', async () => {
      const mockUser = {
        status: 'ACTIVE',
        comparePassword: vi.fn().mockResolvedValue(false),
      };
      const mockQuery = { select: vi.fn().mockResolvedValue(mockUser) };
      vi.mocked(User.findOne).mockReturnValue(mockQuery as any);

      const res = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should return token and user data on successful login', async () => {
      const mockUser = {
        _id: '123456789012345678901234',
        status: 'ACTIVE',
        role: 'ADVISOR',
        name: 'John Doe',
        email: 'test@example.com',
        brokerageId: 'b123',
        comparePassword: vi.fn().mockResolvedValue(true),
      };
      const mockQuery = { select: vi.fn().mockResolvedValue(mockUser) };
      vi.mocked(User.findOne).mockReturnValue(mockQuery as any);
      
      const signSpy = vi.spyOn(jwt, 'sign').mockReturnValue('mocked-token' as any);

      const res = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBe('mocked-token');
      expect(res.body.data.user.email).toBe('test@example.com');
      
      signSpy.mockRestore();
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 if token is missing', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should return user data if token is valid', async () => {
      const mockUser = {
        _id: '123',
        status: 'ACTIVE',
        role: 'ADVISOR',
        name: 'John Doe',
        email: 'test@example.com',
      };
      vi.mocked(User.findById).mockResolvedValue(mockUser as any);
      const token = jwt.sign({ userId: '123', role: 'ADVISOR', brokerageId: null }, env.JWT_SECRET);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('test@example.com');
    });
  });
});
