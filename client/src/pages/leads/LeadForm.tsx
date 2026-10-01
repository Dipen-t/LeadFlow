import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { PipelineStage } from './types';

interface LeadFormProps {
  stages: PipelineStage[];
  onSubmit: (data: any) => Promise<void>;
}

export function LeadForm({ stages, onSubmit }: LeadFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    pipelineStageId: stages[0]?._id || '',
  });

  useEffect(() => {
    if (!formData.pipelineStageId && stages.length > 0) {
      setFormData(prev => ({ ...prev, pipelineStageId: stages[0]._id }));
    }
  }, [stages, formData.pipelineStageId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setIsOpen(false);
      setFormData({ firstName: '', lastName: '', email: '', phone: '', pipelineStageId: stages[0]?._id || '' });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Lead
        </Button>
      } />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>
            Enter the details of the new lead. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="firstName">First name</FieldLabel>
                <Input id="firstName" value={formData.firstName} onChange={e => setFormData(p => ({...p, firstName: e.target.value}))} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="lastName">Last name</FieldLabel>
                <Input id="lastName" value={formData.lastName} onChange={e => setFormData(p => ({...p, lastName: e.target.value}))} required />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="email">Email address</FieldLabel>
              <Input id="email" type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="phone">Phone number</FieldLabel>
              <Input id="phone" type="tel" value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} />
            </Field>
            <Field>
              <FieldLabel htmlFor="stage">Initial Stage</FieldLabel>
              <select 
                id="stage" 
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.pipelineStageId} 
                onChange={e => setFormData(p => ({...p, pipelineStageId: e.target.value}))}
              >
                {stages.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Lead'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
