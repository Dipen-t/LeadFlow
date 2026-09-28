import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader } from '@/components/ui/loader';
import { useAuthStore } from '../../store/authStore';
import type { User, Brokerage } from './types';
import { 
  fetchUsersAPI, fetchBrokeragesAPI, 
  createUserAPI, updateUserAPI, deleteUserAPI, 
  createBrokerageAPI, deleteBrokerageAPI 
} from './api';
import { UsersTable } from './UsersTable';
import { BrokeragesTable } from './BrokeragesTable';
import { UserForm } from './UserForm';
import { BrokerageForm } from './BrokerageForm';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [brokerages, setBrokerages] = useState<Brokerage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const currentUserRole = useAuthStore(state => state.user?.role);
  const [activeTab, setActiveTab] = useState('users');
  
  // Edit State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editData, setEditData] = useState({
    _id: '',
    name: '',
    email: '',
    role: 'BROKERAGE_ADMIN',
    status: 'ACTIVE',
    brokerageId: '',
  });

  const fetchData = async () => {
    try {
      const [fetchedUsers, fetchedBrokerages] = await Promise.all([
        fetchUsersAPI(),
        fetchBrokeragesAPI()
      ]);
      setUsers(fetchedUsers);
      setBrokerages(fetchedBrokerages);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserRole === 'PLATFORM_ADMIN' || currentUserRole === 'SYSTEM_ADMIN' || currentUserRole === 'BROKERAGE_ADMIN') {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [currentUserRole]);

  const handleCreateUser = async (data: any) => {
    await createUserAPI(data);
    fetchData();
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteUserAPI(id);
      setUsers(prev => prev.filter(u => u._id !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const openEditModal = (user: User) => {
    setEditData({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      brokerageId: user.brokerageId || '',
    });
    setIsEditOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { ...editData };
      if (currentUserRole === 'BROKERAGE_ADMIN') {
        delete (payload as any).brokerageId;
      } else if (payload.role === 'PLATFORM_ADMIN') {
        payload.brokerageId = '';
      }
      await updateUserAPI(editData._id, payload);
      setIsEditOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateBrokerage = async (data: any) => {
    await createBrokerageAPI(data);
    fetchData();
  };

  const handleDeleteBrokerage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this brokerage? This cannot be undone.')) return;
    try {
      await deleteBrokerageAPI(id);
      setBrokerages(prev => prev.filter(b => b._id !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete brokerage');
    }
  };

  if (currentUserRole !== 'PLATFORM_ADMIN' && currentUserRole !== 'SYSTEM_ADMIN' && currentUserRole !== 'BROKERAGE_ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">Access Denied</h2>
        <p className="text-muted-foreground">Only Administrators can access the user management module.</p>
      </div>
    );
  }

  const isPlatformAdmin = currentUserRole === 'PLATFORM_ADMIN' || currentUserRole === 'SYSTEM_ADMIN';

  if (isLoading) return <Loader message="Loading users..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{isPlatformAdmin ? 'Platform Management' : 'User Management'}</h1>
          <p className="text-sm text-muted-foreground mt-1">Administration of tenants and users.</p>
        </div>
        
        {activeTab === 'users' ? (
          <UserForm brokerages={brokerages} isPlatformAdmin={isPlatformAdmin} onSubmit={handleCreateUser} />
        ) : isPlatformAdmin ? (
          <BrokerageForm onSubmit={handleCreateBrokerage} />
        ) : null}

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user information.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditUser} className="space-y-6 pt-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="editName">Full Name</FieldLabel>
                  <Input id="editName" value={editData.name} onChange={e => setEditData(p => ({...p, name: e.target.value}))} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="editEmail">Email Address</FieldLabel>
                  <Input id="editEmail" type="email" value={editData.email} onChange={e => setEditData(p => ({...p, email: e.target.value}))} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="editRole">Role</FieldLabel>
                  <select 
                    id="editRole" 
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={editData.role} 
                    onChange={e => setEditData(p => ({...p, role: e.target.value}))}
                  >
                    {isPlatformAdmin && <option value="PLATFORM_ADMIN">Platform Admin</option>}
                    <option value="BROKERAGE_ADMIN">Brokerage Admin</option>
                    <option value="ADVISOR">Advisor</option>
                  </select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="editStatus">Status</FieldLabel>
                  <select 
                    id="editStatus" 
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={editData.status} 
                    onChange={e => setEditData(p => ({...p, status: e.target.value}))}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </Field>
                {isPlatformAdmin && editData.role !== 'PLATFORM_ADMIN' && (
                  <Field>
                    <FieldLabel htmlFor="editBrokerage">Brokerage</FieldLabel>
                    <select 
                      id="editBrokerage" 
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={editData.brokerageId} 
                      onChange={e => setEditData(p => ({...p, brokerageId: e.target.value}))}
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
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="users">Users</TabsTrigger>
          {isPlatformAdmin && <TabsTrigger value="brokerages">Brokerages</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="users">
          <UsersTable users={users} onEdit={openEditModal} onDelete={handleDeleteUser} />
        </TabsContent>
        
        <TabsContent value="brokerages">
          <BrokeragesTable brokerages={brokerages} onDelete={handleDeleteBrokerage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
