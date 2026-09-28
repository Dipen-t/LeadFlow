import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface BrokerageFormProps {
  onSubmit: (data: any) => Promise<void>;
}

export function BrokerageForm({ onSubmit }: BrokerageFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ name });
      setIsOpen(false);
      setName('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create brokerage');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Brokerage
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Brokerage</DialogTitle>
          <DialogDescription>
            Create a new brokerage tenant.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="brokerageName">Brokerage Name</FieldLabel>
              <Input id="brokerageName" value={name} onChange={e => setName(e.target.value)} required />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Brokerage'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
