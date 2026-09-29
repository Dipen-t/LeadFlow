import { Request, Response, NextFunction } from 'express';
import { EmailTemplate, TaskTemplate } from './automation.model';
import { z } from 'zod';
import { NotFoundError } from '../../utils/errors';

const emailTemplateSchema = z.object({
  pipelineStageId: z.string().min(24),
  subject: z.string().min(1),
  body: z.string().min(1),
});

const taskTemplateSchema = z.object({
  pipelineStageId: z.string().min(24),
  title: z.string().min(1),
  dueInHours: z.number().min(0),
});

export const upsertEmailTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brokerageId = req.user?.brokerageId;
    const { pipelineStageId, subject, body } = emailTemplateSchema.parse(req.body);

    const template = await EmailTemplate.findOneAndUpdate(
      { brokerageId, pipelineStageId },
      { subject, body },
      { new: true, upsert: true }
    );

    res.json({ status: 'success', data: { template } });
  } catch (err) {
    next(err);
  }
};

export const createTaskTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brokerageId = req.user?.brokerageId;
    const data = taskTemplateSchema.parse(req.body);

    const template = await TaskTemplate.create({
      brokerageId: brokerageId as string,
      ...data
    });

    res.status(201).json({ status: 'success', data: { template } });
  } catch (err) {
    next(err);
  }
};

export const getAutomationsByStage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brokerageId = req.user?.brokerageId;
    const { pipelineStageId } = req.params;

    const emailTemplate = await EmailTemplate.findOne({ brokerageId, pipelineStageId });
    const taskTemplates = await TaskTemplate.find({ brokerageId, pipelineStageId });

    res.json({
      status: 'success',
      data: {
        emailTemplate,
        taskTemplates
      }
    });
  } catch (err) {
    next(err);
  }
};

export const deleteTaskTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brokerageId = req.user?.brokerageId;
    const { id } = req.params;

    const template = await TaskTemplate.findOneAndDelete({ _id: id, brokerageId });
    if (!template) {
      throw new NotFoundError('Task template not found');
    }

    res.json({ status: 'success', data: null });
  } catch (err) {
    next(err);
  }
};
