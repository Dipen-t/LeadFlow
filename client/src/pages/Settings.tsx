import { useEffect, useState } from 'react';
import { api } from '../lib/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { Input } from '@/components/ui/input';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useAuthStore } from '../store/authStore';
import { Settings as SettingsIcon, Mail, CheckSquare, Trash2 } from 'lucide-react';

interface PipelineStage {
  _id: string;
  name: string;
  order: number;
}

interface EmailTemplate {
  _id?: string;
  subject: string;
  body: string;
}

interface TaskTemplate {
  _id: string;
  title: string;
  dueInHours: number;
}

export default function Settings() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const user = useAuthStore(state => state.user);

  // Automations State
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplate>({ subject: '', body: '' });
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskHours, setNewTaskHours] = useState('24');
  const [isAddingTask, setIsAddingTask] = useState(false);

  useEffect(() => {
    fetchStages();
  }, []);

  useEffect(() => {
    if (selectedStageId) {
      fetchAutomations(selectedStageId);
    }
  }, [selectedStageId]);

  const fetchStages = async () => {
    try {
      const res = await api.get('/pipeline/stages');
      const fetchedStages = res.data.data.stages;
      setStages(fetchedStages);
      if (fetchedStages.length > 0) {
        setSelectedStageId(fetchedStages[0]._id);
      }
    } catch (err) {
      console.error('Failed to load stages', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAutomations = async (stageId: string) => {
    try {
      const res = await api.get(`/automations/stage/${stageId}`);
      const { emailTemplate, taskTemplates } = res.data.data;
      setEmailTemplate(emailTemplate || { subject: '', body: '' });
      setTaskTemplates(taskTemplates || []);
    } catch (err) {
      console.error('Failed to fetch automations', err);
    }
  };

  const handleSaveEmailTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingEmail(true);
    try {
      await api.post('/automations/email-template', {
        pipelineStageId: selectedStageId,
        subject: emailTemplate.subject,
        body: emailTemplate.body
      });
      alert('Email template saved successfully');
    } catch (err) {
      console.error('Failed to save email template', err);
      alert('Failed to save email template');
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleAddTaskTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingTask(true);
    try {
      const res = await api.post('/automations/task-template', {
        pipelineStageId: selectedStageId,
        title: newTaskTitle,
        dueInHours: parseInt(newTaskHours) || 0
      });
      setTaskTemplates(prev => [...prev, res.data.data.template]);
      setNewTaskTitle('');
      setNewTaskHours('24');
    } catch (err) {
      console.error('Failed to add task template', err);
      alert('Failed to add task template');
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleDeleteTaskTemplate = async (id: string) => {
    try {
      await api.delete(`/automations/task-template/${id}`);
      setTaskTemplates(prev => prev.filter(t => t._id !== id));
    } catch (err) {
      console.error('Failed to delete task template', err);
    }
  };

  if (isLoading) return <Loader message="Loading settings..." />;
  if (user?.role !== 'BROKERAGE_ADMIN' && user?.role !== 'SYSTEM_ADMIN') {
    return <div className="p-8 text-center text-red-500">You do not have permission to view this page.</div>;
  }

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Automations</h1>
        <p className="text-muted-foreground mt-1">Configure pipeline stages and automated actions.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            Pipeline Automations
          </CardTitle>
          <CardDescription>
            When a lead enters a pipeline stage, trigger these templates automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          
          <div>
            <label className="block text-sm font-medium mb-2">Select Pipeline Stage</label>
            <Select value={selectedStageId} onValueChange={setSelectedStageId}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Select a stage...">
                  {stages.find(s => s._id === selectedStageId)?.name || 'Select a stage...'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {stages.map(stage => (
                  <SelectItem key={stage._id} value={stage._id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4 border-t">
            {/* Email Automation */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-semibold">Email Template</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Sent to the lead immediately upon entering this stage. <br/>
                Placeholders: <code>{`{{clientName}}`}</code>, <code>{`{{advisorName}}`}</code>
              </p>
              <form onSubmit={handleSaveEmailTemplate} className="space-y-4 bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-lg border">
                <FieldGroup>
                  <Field>
                    <FieldLabel>Subject</FieldLabel>
                    <Input 
                      value={emailTemplate.subject} 
                      onChange={e => setEmailTemplate(prev => ({...prev, subject: e.target.value}))} 
                      placeholder="Welcome to LeadFlow, {{clientName}}!"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Body</FieldLabel>
                    <textarea 
                      className="flex min-h-[150px] w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:ring-offset-neutral-950 dark:placeholder:text-neutral-400 dark:focus-visible:ring-neutral-300"
                      value={emailTemplate.body} 
                      onChange={e => setEmailTemplate(prev => ({...prev, body: e.target.value}))}
                      placeholder="Hi {{clientName}},&#10;Your advisor {{advisorName}} will be in touch shortly."
                    />
                  </Field>
                </FieldGroup>
                <Button type="submit" disabled={isSavingEmail}>
                  {isSavingEmail ? 'Saving...' : 'Save Email Template'}
                </Button>
              </form>
            </div>

            {/* Task Automation */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-green-500" />
                <h3 className="text-lg font-semibold">Task Automations</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Tasks created and assigned to the lead's advisor upon entering this stage.
              </p>
              
              <div className="space-y-3">
                {taskTemplates.map(task => (
                  <div key={task._id} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded border">
                    <div>
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">Due in {task.dueInHours} hours</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteTaskTemplate(task._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {taskTemplates.length === 0 && (
                  <div className="text-sm text-muted-foreground p-4 text-center border border-dashed rounded">
                    No task automations configured.
                  </div>
                )}
              </div>

              <form onSubmit={handleAddTaskTemplate} className="space-y-4 pt-4 border-t">
                <h4 className="text-sm font-medium">Add New Task</h4>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <FieldLabel>Task Title</FieldLabel>
                    <Input 
                      value={newTaskTitle} 
                      onChange={e => setNewTaskTitle(e.target.value)} 
                      placeholder="e.g. Call client to verify details"
                      required
                    />
                  </div>
                  <div className="w-24">
                    <FieldLabel>Due (hrs)</FieldLabel>
                    <Input 
                      type="number" 
                      min="0"
                      value={newTaskHours} 
                      onChange={e => setNewTaskHours(e.target.value)} 
                      required
                    />
                  </div>
                  <Button type="submit" disabled={isAddingTask} variant="secondary">
                    Add
                  </Button>
                </div>
              </form>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
