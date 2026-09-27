import { Request, Response, NextFunction } from 'express';
import { Task } from './task.model';
import { NotFoundError } from '../../utils/errors';

export const getMyTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brokerageId = req.user?.brokerageId;
    const userId = req.user?.userId;
    const { status } = req.query; // 'PENDING' | 'COMPLETED'

    const filter: any = { brokerageId, assignedAdvisorId: userId };
    if (status) filter.status = status;

    const tasks = await Task.find(filter).sort({ dueAt: 1 }).populate('leadId', 'firstName lastName');

    // 16.3 Overdue Task Logic
    const now = new Date();
    const tasksWithOverdueFlag = tasks.map(t => {
      const isOverdue = t.status !== 'COMPLETED' && now > t.dueAt;
      return {
        ...t.toObject(),
        isOverdue
      };
    });

    res.json({
      status: 'success',
      data: { tasks: tasksWithOverdueFlag },
    });
  } catch (err) {
    next(err);
  }
};

export const completeTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brokerageId = req.user?.brokerageId;
    const userId = req.user?.userId;
    const { id } = req.params;

    const task = await Task.findOneAndUpdate(
      { _id: id, brokerageId, assignedAdvisorId: userId },
      { status: 'COMPLETED' },
      { new: true }
    );

    if (!task) {
      throw new NotFoundError('Task not found or unauthorized');
    }

    res.json({
      status: 'success',
      data: { task },
    });
  } catch (err) {
    next(err);
  }
};
