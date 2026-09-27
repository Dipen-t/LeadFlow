import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../users/user.model';
import { UnauthorizedError } from '../../utils/errors';
import { env } from '../../config/env';

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Invalid credentials or account inactive');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const payload = {
      userId: user._id.toString(),
      role: user.role,
      brokerageId: user.brokerageId ? user.brokerageId.toString() : null,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1d' });

    res.json({
      status: 'success',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          brokerageId: user.brokerageId,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('User not found or inactive');
    }

    res.json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          brokerageId: user.brokerageId,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const logout = (req: Request, res: Response) => {
  // Client is responsible for deleting the token. 
  // For a stateless JWT implementation, logout is just a success response.
  res.json({
    status: 'success',
    message: 'Logged out successfully',
  });
};
