import { useEffect, useState } from 'react';
import { Loader } from '@/components/ui/loader';
import type { Task } from './types';
import { fetchTasksAPI, completeTaskAPI } from './api';
import { TasksList } from './TasksList';

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await fetchTasksAPI();
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async (taskId: string) => {
    try {
      await completeTaskAPI(taskId);
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: 'COMPLETED' } : t));
    } catch (err) {
      console.error('Failed to complete task', err);
    }
  };

  if (isLoading) {
    return <Loader message="Loading your tasks..." />;
  }

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-muted-foreground mt-1">Manage your automated follow-ups and pipeline duties.</p>
      </div>

      <TasksList tasks={tasks} onComplete={handleComplete} />
    </div>
  );
}
