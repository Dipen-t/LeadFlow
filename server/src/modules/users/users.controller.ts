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

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await User.find({}, '-passwordHash').sort({ createdAt: -1 });
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

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    if (userId === req.user?.userId) {
      throw new AppError('Cannot delete yourself', 400);
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
