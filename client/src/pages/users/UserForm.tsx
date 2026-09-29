import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { Brokerage } from './types';

interface UserFormProps {
  brokerages: Brokerage[];
  isPlatformAdmin: boolean;
  onSubmit: (data: any) => Promise<void>;
}

export function UserForm({ brokerages, isPlatformAdmin, onSubmit }: UserFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'BROKERAGE_ADMIN',
    brokerageId: brokerages[0]?._id || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { ...formData };
      if (payload.role === 'PLATFORM_ADMIN') {
        payload.brokerageId = '';
      }
      await onSubmit(payload);
      setIsOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'BROKERAGE_ADMIN', brokerageId: brokerages[0]?._id || '' });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      } />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user. They will be able to log in immediately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Full Name</FieldLabel>
              <Input id="name" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email Address</FieldLabel>
              <Input id="email" type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Temporary Password</FieldLabel>
              <PasswordInput id="password" value={formData.password} onChange={e => setFormData(p => ({...p, password: e.target.value}))} required minLength={6} />
            </Field>
            <Field>
              <FieldLabel htmlFor="role">Role</FieldLabel>
              <select 
                id="role" 
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.role} 
                onChange={e => setFormData(p => ({...p, role: e.target.value}))}
              >
                {isPlatformAdmin && <option value="PLATFORM_ADMIN">Platform Admin</option>}
                <option value="BROKERAGE_ADMIN">Brokerage Admin</option>
                <option value="ADVISOR">Advisor</option>
              </select>
            </Field>
            {isPlatformAdmin && formData.role !== 'PLATFORM_ADMIN' && (
              <Field>
                <FieldLabel htmlFor="brokerage">Brokerage</FieldLabel>
                <select 
                  id="brokerage" 
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.brokerageId} 
                  onChange={e => setFormData(p => ({...p, brokerageId: e.target.value}))}
                  required
                >
                  {brokerages.map(b => (
                    <option key={b._id} value={b._id}>{b.name}</option>
                  ))}
                </select>
              </Field>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create User'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
