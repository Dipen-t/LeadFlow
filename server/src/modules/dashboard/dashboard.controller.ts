import { Request, Response, NextFunction } from 'express';
import { Lead } from '../leads/lead.model';
import { Document } from '../documents/document.model';
import { Task } from '../tasks/task.model';
import { PipelineStage } from '../pipeline/pipelineStage.model';
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

    // Removed ADVISOR restrictions per architectural change

    // 17.1 Metrics Gathering
    const [totalLeads, wonLeads, lostLeads, duplicateLeads] = await Promise.all([
      Lead.countDocuments({ ...leadFilter, status: 'ACTIVE' }),
      Lead.countDocuments({ ...leadFilter, status: 'CONVERTED' }),
      Lead.countDocuments({ ...leadFilter, status: 'LOST' }),
      Lead.countDocuments({ ...leadFilter, status: 'DUPLICATE' }),
    ]);
    
    const leadsByCategory = {
      ACTIVE: totalLeads,
      CONVERTED: wonLeads,
      LOST: lostLeads,
      DUPLICATE: duplicateLeads
    };

    // Pipeline Stages Aggregation
    const stages = await PipelineStage.find({ brokerageId }).sort({ order: 1 });
    const activeLeadsByStage = await Lead.aggregate([
      { $match: { brokerageId: new mongoose.Types.ObjectId(brokerageId as string), status: 'ACTIVE' } },
      { $group: { _id: '$pipelineStageId', count: { $sum: 1 } } }
    ]);

    const leadsByStage = stages.map(stage => {
      const match = activeLeadsByStage.find(item => item._id?.toString() === stage._id.toString());
      return {
        name: stage.name,
        count: match ? match.count : 0
      };
    });

    // Pending and Failed Documents
    const pendingDocuments = await Document.countDocuments({ ...docFilter, status: 'PENDING' });
    const failedDocuments = await Document.countDocuments({ ...docFilter, status: 'FAILED' });

    // Task Metrics
    const now = new Date();
    const overdueTasks = await Task.countDocuments({
      ...taskFilter,
      status: 'PENDING',
      dueAt: { $lt: now }
    });
    
    const pendingTasks = await Task.countDocuments({
      ...taskFilter,
      status: 'PENDING',
      dueAt: { $gte: now }
    });
    
    const completedTasks = await Task.countDocuments({
      ...taskFilter,
      status: 'COMPLETED'
    });

    res.json({
      status: 'success',
      data: {
        totalLeads,
        wonLeads,
        lostLeads,
        leadsByCategory,
        leadsByStage,
        pendingDocuments,
        failedDocuments,
        overdueTasks,
        pendingTasks,
        completedTasks
      },
    });
  } catch (err) {
    next(err);
  }
};
