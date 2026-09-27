import { Request, Response, NextFunction } from 'express';
import { Lead } from '../leads/lead.model';
import { Document } from '../documents/document.model';
import { Task } from '../tasks/task.model';
import mongoose from 'mongoose';

export const getDashboardMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brokerageId = req.user?.brokerageId;
    const role = req.user?.role;
    const userId = req.user?.userId;

    // Base filter applies tenant isolation
    const leadFilter: any = { brokerageId };
    const docFilter: any = { brokerageId };
    const taskFilter: any = { brokerageId };

    // If it's an Advisor, optionally restrict metrics to their assigned entities
    if (role === 'ADVISOR') {
      leadFilter.assignedAdvisorId = userId;
      // In a real app, docs might be filtered by clients assigned to this advisor
      taskFilter.assignedAdvisorId = userId;
    }

    // 17.1 Metrics Gathering
    // Total Leads (Active)
    const totalLeads = await Lead.countDocuments({ ...leadFilter, status: 'ACTIVE' });
    
    // Won (Converted) & Lost
    const wonLeads = await Lead.countDocuments({ ...leadFilter, status: 'CONVERTED' });
    const lostLeads = await Lead.countDocuments({ ...leadFilter, status: 'LOST' });

    // Leads by pipeline stage
    const leadsByStageRaw = await Lead.aggregate([
      { $match: { ...leadFilter, status: 'ACTIVE' } },
      { $group: { _id: '$pipelineStageId', count: { $sum: 1 } } }
    ]);

    const leadsByStage = leadsByStageRaw.reduce((acc, curr) => {
      acc[curr._id.toString()] = curr.count;
      return acc;
    }, {});

    // Pending and Failed Documents
    const pendingDocuments = await Document.countDocuments({ ...docFilter, status: 'PENDING' });
    const failedDocuments = await Document.countDocuments({ ...docFilter, status: 'FAILED' });

    // Overdue Tasks (now > dueAt AND status != COMPLETED)
    const now = new Date();
    const overdueTasks = await Task.countDocuments({
      ...taskFilter,
      status: 'PENDING',
      dueAt: { $lt: now }
    });

    res.json({
      status: 'success',
      data: {
        totalLeads,
        wonLeads,
        lostLeads,
        leadsByStage,
        pendingDocuments,
        failedDocuments,
        overdueTasks
      },
    });
  } catch (err) {
    next(err);
  }
};
