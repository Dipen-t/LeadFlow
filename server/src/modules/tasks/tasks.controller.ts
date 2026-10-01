import { Request, Response, NextFunction } from 'express';
import { Task } from './task.model';
import { NotFoundError } from '../../utils/errors';

export const getMyTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brokerageId = req.user?.brokerageId;
    const userId = req.user?.userId;
    const { status } = req.query; // 'PENDING' | 'COMPLETED'

    const filter: any = { brokerageId };
    if (status) filter.status = status;

    const tasks = await Task.find(filter).sort({ dueAt: 1 }).populate('leadId', 'firstName lastName').populate('assignedAdvisorId', 'name');

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

    const query: any = { _id: id, brokerageId };

    const task = await Task.findOneAndUpdate(
      query,
      { status: 'COMPLETED' },
      { new: true }
    );

    if (!task) {
      // Task was already deleted or doesn't exist.
      return res.json({
        status: 'success',
        message: 'Task already completed or deleted',
        data: null,
      });
    }

    res.json({
      status: 'success',
      data: { task },
    });
  } catch (err) {
    next(err);
  }
};
