import { useEffect, useState } from 'react';
import { api } from '../lib/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { format, isPast } from 'date-fns';

interface Task {
  _id: string;
  title: string;
  dueAt: string;
  status: 'PENDING' | 'COMPLETED';
  leadId: string;
  createdAt: string;
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks/my-tasks');
      setTasks(res.data.data.tasks);
    } catch (err) {
      console.error('Failed to load tasks', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async (taskId: string) => {
    try {
      await api.patch(`/tasks/${taskId}/complete`);
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: 'COMPLETED' } : t));
    } catch (err) {
      console.error('Failed to complete task', err);
    }
  };

  if (isLoading) {
    return <Loader message="Loading your tasks..." />;
  }

  const pendingTasks = tasks.filter(t => t.status !== 'COMPLETED').sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').sort((a, b) => new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime());

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-muted-foreground mt-1">Manage your automated follow-ups and pipeline duties.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Pending Tasks */}
        <Card className="shadow-sm">
          <CardHeader className="bg-neutral-50 dark:bg-neutral-900 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Pending Tasks
              <span className="ml-auto bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 py-0.5 px-2 rounded-full text-xs">
                {pendingTasks.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {pendingTasks.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No pending tasks! 🎉</div>
            ) : (
              <ul className="divide-y">
                {pendingTasks.map(task => {
                  const overdue = isPast(new Date(task.dueAt));
                  return (
                    <li key={task._id} className={`p-4 flex items-start justify-between gap-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/50 ${overdue ? 'bg-red-50/50 dark:bg-red-950/20' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-semibold truncate ${overdue ? 'text-red-700 dark:text-red-400' : ''}`}>
                            {task.title}
                          </p>
                          {overdue && <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />}
                        </div>
                        <p className={`text-xs mt-1 flex items-center gap-1 ${overdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'}`}>
                          Due: {format(new Date(task.dueAt), 'PP p')}
                          {overdue && <span className="ml-1 uppercase text-[10px] tracking-wider font-bold">Overdue</span>}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant={overdue ? "destructive" : "outline"}
                        className="shrink-0"
                        onClick={() => handleComplete(task._id)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Complete
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Completed Tasks */}
        <Card className="shadow-sm opacity-75">
          <CardHeader className="bg-neutral-50 dark:bg-neutral-900 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-5 w-5" />
              Recently Completed
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {completedTasks.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No completed tasks yet.</div>
            ) : (
              <ul className="divide-y">
                {completedTasks.slice(0, 10).map(task => (
                  <li key={task._id} className="p-4 flex items-start justify-between gap-4 bg-neutral-50 dark:bg-neutral-900/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground line-through">
                        {task.title}
                      </p>
                      <p className="text-xs mt-1 text-muted-foreground">
                        Completed
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
