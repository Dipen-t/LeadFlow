import { api } from '@/lib/axios';
import type { Task } from './types';

export const fetchTasksAPI = async (): Promise<Task[]> => {
  const res = await api.get('/tasks/my-tasks');
  return res.data.data.tasks;
};

export const completeTaskAPI = async (taskId: string): Promise<void> => {
  await api.patch(`/tasks/${taskId}/complete`);
};
