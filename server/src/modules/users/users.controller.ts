import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { User } from './user.model';
import { AppError } from '../../utils/errors';

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['PLATFORM_ADMIN', 'BROKERAGE_ADMIN', 'ADVISOR', 'CLIENT']),
  brokerageId: z.string().optional().nullable(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(['PLATFORM_ADMIN', 'BROKERAGE_ADMIN', 'ADVISOR', 'CLIENT']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  brokerageId: z.string().optional().nullable(),
});

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query: any = {};
    if (req.user?.role === 'BROKERAGE_ADMIN') {
      query.brokerageId = req.user.brokerageId;
      query.role = { $ne: 'PLATFORM_ADMIN' };
    }
    
    const users = await User.find(query, '-passwordHash').sort({ createdAt: -1 });
    res.json({
      status: 'success',
      data: {
        users
      }
    });
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createUserSchema.parse(req.body);
    
    // Brokerage Admin constraints
    if (req.user?.role === 'BROKERAGE_ADMIN') {
      if (data.role === 'PLATFORM_ADMIN') {
        throw new AppError('Cannot create platform admin', 403);
      }
      data.brokerageId = req.user.brokerageId; // Force to their own brokerage
    }

    const existing = await User.findOne({ email: data.email });
    if (existing) {
      throw new AppError('Email is already in use', 400);
    }

    const user = await User.create({
      name: data.name,
      email: data.email,
      passwordHash: data.password,
      role: data.role,
      brokerageId: data.brokerageId || null,
    });

    const userObject = user.toObject() as any;
    delete userObject.passwordHash;

    res.status(201).json({
      status: 'success',
      data: {
        user: userObject
      }
    });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const data = updateUserSchema.parse(req.body);

    const targetUser = await User.findById(userId);
    if (!targetUser) throw new AppError('User not found', 404);

    if (req.user?.role === 'BROKERAGE_ADMIN') {
      if (targetUser.brokerageId?.toString() !== req.user.brokerageId) {
        throw new AppError('Not authorized to edit this user', 403);
      }
      if (data.role === 'PLATFORM_ADMIN') {
        throw new AppError('Cannot change role to platform admin', 403);
      }
      if (data.brokerageId !== undefined) {
        delete data.brokerageId;
      }
    }

    Object.assign(targetUser, data);
    await targetUser.save();

    const userObject = targetUser.toObject() as any;
    delete userObject.passwordHash;

    res.json({
      status: 'success',
      data: {
        user: userObject
      }
    });
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    if (userId === req.user?.userId) {
      throw new AppError('Cannot delete yourself', 400);
    }
    
    const targetUser = await User.findById(userId);
    if (!targetUser) throw new AppError('User not found', 404);
    
    if (req.user?.role === 'BROKERAGE_ADMIN' && targetUser.brokerageId?.toString() !== req.user.brokerageId) {
      throw new AppError('Not authorized to delete this user', 403);
    }

    await User.findByIdAndDelete(userId);
    res.json({
      status: 'success',
      data: null
    });
  } catch (err) {
    next(err);
  }
};
