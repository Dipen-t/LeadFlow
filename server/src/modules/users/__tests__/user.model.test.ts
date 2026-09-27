import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { User } from '../user.model';

describe('User Model', () => {
  it('should throw validation error if required fields are missing', async () => {
    const user = new User({});
    const err: any = await user.validate().catch(e => e);
    expect(err).toBeDefined();
    expect(err?.errors?.role).toBeDefined();
    expect(err?.errors?.name).toBeDefined();
    expect(err?.errors?.email).toBeDefined();
    expect(err?.errors?.passwordHash).toBeDefined();
  });

  it('should successfully validate a properly formed user', async () => {
    const user = new User({
      role: 'ADVISOR',
      name: 'John Doe',
      email: 'john@example.com',
      passwordHash: 'hashedpassword123',
    });
    const err = await user.validate().catch(e => e);
    expect(err).toBeUndefined(); // No validation errors
  });

  it('should default status to ACTIVE', () => {
    const user = new User({
      role: 'CLIENT',
      name: 'Jane Doe',
      email: 'jane@example.com',
      passwordHash: 'hashedpassword123',
    });
    expect(user.status).toBe('ACTIVE');
  });

  it('should fail if an invalid role is provided', async () => {
    const user = new User({
      role: 'INVALID_ROLE',
      name: 'John Doe',
      email: 'john@example.com',
      passwordHash: 'hashedpassword123',
    });
    const err: any = await user.validate().catch(e => e);
    expect(err?.errors?.role).toBeDefined();
  });
});
