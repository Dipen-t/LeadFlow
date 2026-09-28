import { useEffect, useState } from 'react';
import { api } from '../lib/axios';
import { Plus, Trash2, ShieldAlert, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Loader } from '@/components/ui/loader';
import { useAuthStore } from '../store/authStore';

interface Brokerage {
  _id: string;
  name: string;
  slug: string;
  createdAt: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [brokerages, setBrokerages] = useState<Brokerage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const currentUserRole = useAuthStore(state => state.user?.role);
  const [activeTab, setActiveTab] = useState('users');
  
  // Form State
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'BROKERAGE_ADMIN',
    brokerageId: '',
  });

  const [isBrokerageOpen, setIsBrokerageOpen] = useState(false);
  const [isBrokerageSubmitting, setIsBrokerageSubmitting] = useState(false);
  const [brokerageName, setBrokerageName] = useState('');

  // Edit State
  const [isEditOpen, setIsEditOpen] = useState(false);
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
      const [usersRes, brokeragesRes] = await Promise.all([
        api.get('/users'),
        api.get('/brokerages')
      ]);
      setUsers(usersRes.data.data.users);
      const b = brokeragesRes.data.data.brokerages;
      setBrokerages(b);
      if (b.length > 0 && !formData.brokerageId) {
        setFormData(p => ({ ...p, brokerageId: b[0]._id }));
      }
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { ...formData };
      if (payload.role === 'PLATFORM_ADMIN') {
        payload.brokerageId = '';
      }
      await api.post('/users', payload);
      setIsOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'BROKERAGE_ADMIN', brokerageId: brokerages[0]?._id || '' });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
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
      brokerageId: (user as any).brokerageId || '',
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
      await api.patch(`/users/${editData._id}`, payload);
      setIsEditOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateBrokerage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBrokerageSubmitting(true);
    try {
      await api.post('/brokerages', { name: brokerageName });
      setIsBrokerageOpen(false);
      setBrokerageName('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create brokerage');
    } finally {
      setIsBrokerageSubmitting(false);
    }
  };

  const handleDeleteBrokerage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this brokerage? This cannot be undone.')) return;
    try {
      await api.delete(`/brokerages/${id}`);
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
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user. They will be able to log in immediately.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-6 pt-4">
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
                  <Input id="password" type="text" value={formData.password} onChange={e => setFormData(p => ({...p, password: e.target.value}))} required minLength={6} />
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
        ) : isPlatformAdmin ? (
          <Dialog open={isBrokerageOpen} onOpenChange={setIsBrokerageOpen}>
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
              <form onSubmit={handleCreateBrokerage} className="space-y-6 pt-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="brokerageName">Brokerage Name</FieldLabel>
                    <Input id="brokerageName" value={brokerageName} onChange={e => setBrokerageName(e.target.value)} required />
                  </Field>
                </FieldGroup>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsBrokerageOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isBrokerageSubmitting}>{isBrokerageSubmitting ? 'Creating...' : 'Create Brokerage'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
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
          <div className="border rounded-md bg-white dark:bg-neutral-950">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <span className="text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-full font-medium">
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        user.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {user.status}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(user)} className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user._id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        <TabsContent value="brokerages">
          <div className="border rounded-md bg-white dark:bg-neutral-950">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brokerage Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brokerages.map((b) => (
                  <TableRow key={b._id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell className="font-mono text-sm">{b.slug}</TableCell>
                    <TableCell>{new Date(b.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteBrokerage(b._id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {brokerages.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No brokerages found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
