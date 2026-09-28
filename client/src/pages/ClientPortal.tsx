import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { Loader } from '@/components/ui/loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { UploadCloud, File as FileIcon, CheckCircle, AlertTriangle, Clock, Trash2, Key, Eye, EyeOff } from 'lucide-react';

interface Document {
  _id: string;
  originalName: string;
  status: 'PENDING' | 'PROCESSING' | 'VERIFIED' | 'FAILED';
  uploadedAt: string;
  failureReason?: string;
}

export default function ClientPortal() {
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<{ id: string; file: File; progress: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logout = useAuthStore(state => state.logout);

  // Change Password State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  useEffect(() => {
    let isMounted = true;
    
    const fetchPortalData = async () => {
      try {
        const clientRes = await api.get('/clients/me');
        if (!isMounted) return;
        
        const client = clientRes.data.data.client;
        setClientInfo(client);
        
        const docsRes = await api.get(`/documents/client/${client._id}`);
        if (!isMounted) return;
        
        setDocuments(docsRes.data.data.documents);
      } catch (err) {
        console.error('Failed to load portal data', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    fetchPortalData();
    
    // In a real app we'd attach a socket listener here to listen for document status updates!
    const interval = setInterval(() => {
      if (clientInfo) {
        api.get(`/documents/client/${clientInfo._id}`).then(res => {
          if (isMounted) setDocuments(res.data.data.documents);
        });
      }
    }, 5000);

    return () => { 
      isMounted = false;
      clearInterval(interval);
    };
  }, [clientInfo?._id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newFiles = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      progress: 0
    }));

    setSelectedFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeSelectedFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadSelectedFiles = async () => {
    if (!selectedFiles.length || !clientInfo) return;

    setIsUploading(true);

    try {
      await Promise.all(selectedFiles.map(async (selectedFile) => {
        const formData = new FormData();
        formData.append('document', selectedFile.file);
        formData.append('clientId', clientInfo._id);
        
        await api.post('/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setSelectedFiles(prev => prev.map(f => 
                f.id === selectedFile.id ? { ...f, progress: percentCompleted } : f
              ));
            }
          }
        });
      }));
      // Clear all and refresh
      setSelectedFiles([]);
      const docsRes = await api.get(`/documents/client/${clientInfo._id}`);
      setDocuments(docsRes.data.data.documents);
    } catch (err) {
      console.error('Failed to upload', err);
      alert('Failed to upload some documents. They might be too large or invalid.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.delete(`/documents/${id}`);
      setDocuments(prev => prev.filter(d => d._id !== id));
    } catch (err) {
      console.error('Failed to delete document', err);
      alert('Failed to delete document');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return alert('New passwords do not match');
    }
    
    setIsChangingPassword(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      alert('Password changed successfully!');
      setIsPasswordModalOpen(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      console.error('Failed to change password', err);
      alert(err.response?.data?.message || 'Failed to change password. Make sure your current password is correct.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch(status) {
      case 'VERIFIED': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'FAILED': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'PROCESSING': return <Loader className="h-5 w-5 !min-h-0 text-blue-500 mb-0" />;
      default: return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  if (isLoading) {
    return <Loader message="Loading your secure portal..." />;
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome, {clientInfo?.firstName}</h1>
            <p className="text-muted-foreground mt-1">Manage your mortgage application documents securely.</p>
          </div>
          <div className="flex items-center gap-4">
            <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Key className="h-4 w-4" />
                  Change Password
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>
                    Update your password to something you can easily remember.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleChangePassword} className="space-y-6 pt-4">
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="currentPassword">Current Password</FieldLabel>
                      <div className="relative">
                        <Input 
                          id="currentPassword" 
                          type={showPasswords.current ? 'text' : 'password'} 
                          value={passwordData.currentPassword} 
                          onChange={e => setPasswordData(p => ({...p, currentPassword: e.target.value}))} 
                          required 
                          className="pr-10"
                        />
                        <button 
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                          onClick={() => setShowPasswords(p => ({ ...p, current: !p.current }))}
                        >
                          {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="newPassword">New Password</FieldLabel>
                      <div className="relative">
                        <Input 
                          id="newPassword" 
                          type={showPasswords.new ? 'text' : 'password'} 
                          value={passwordData.newPassword} 
                          onChange={e => setPasswordData(p => ({...p, newPassword: e.target.value}))} 
                          required 
                          minLength={6}
                          className="pr-10"
                        />
                        <button 
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                          onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))}
                        >
                          {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="confirmPassword">Confirm New Password</FieldLabel>
                      <div className="relative">
                        <Input 
                          id="confirmPassword" 
                          type={showPasswords.confirm ? 'text' : 'password'} 
                          value={passwordData.confirmPassword} 
                          onChange={e => setPasswordData(p => ({...p, confirmPassword: e.target.value}))} 
                          required 
                          minLength={6}
                          className="pr-10"
                        />
                        <button 
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                          onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}
                        >
                          {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </Field>
                  </FieldGroup>
                  <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setIsPasswordModalOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isChangingPassword}>
                      {isChangingPassword ? 'Saving...' : 'Update Password'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="secondary" onClick={logout}>Sign Out</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-4">

        <Card>
          <CardHeader>
            <CardTitle>Upload Documents</CardTitle>
            <CardDescription>Upload identification, payslips, or bank statements.</CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isUploading ? 'bg-neutral-100 border-neutral-300' : 'hover:bg-neutral-50 border-neutral-200'}`}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                onChange={handleFileSelect}
                accept=".pdf,.png,.jpg,.jpeg"
                multiple
              />
              <UploadCloud className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-lg mb-1">Select files to upload</h3>
              <p className="text-sm text-muted-foreground mb-4">PDF, PNG, JPG up to 5MB</p>
              <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} variant="outline" className="w-full">
                Browse Files
              </Button>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-6 space-y-4">
                <h4 className="font-medium text-sm">Selected Files ({selectedFiles.length})</h4>
                <div className="space-y-3">
                  {selectedFiles.map(sf => (
                    <div key={sf.id} className="bg-neutral-50 dark:bg-neutral-900 border rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileIcon className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-sm font-medium truncate">{sf.file.name}</span>
                        </div>
                        {!isUploading && (
                          <button onClick={() => removeSelectedFile(sf.id)} className="text-red-500 hover:text-red-700 text-xs shrink-0">
                            Remove
                          </button>
                        )}
                      </div>
                      {isUploading && (
                        <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-1.5 mt-2 overflow-hidden">
                          <div 
                            className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                            style={{ width: `${sf.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <Button onClick={uploadSelectedFiles} disabled={isUploading} className="w-full mt-4">
                  {isUploading ? 'Uploading...' : 'Upload All Files'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        </div>

        <div className="md:col-span-8">

        <Card>
          <CardHeader>
            <CardTitle>Your Documents</CardTitle>
            <CardDescription>Track the verification status of your uploaded documents.</CardDescription>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                No documents uploaded yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {documents.map(doc => (
                  <div key={doc._id} className="flex flex-col p-4 border rounded-lg bg-white dark:bg-neutral-900 shadow-sm relative overflow-hidden">
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                        <FileIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-full">
                          <span className="text-xs font-medium">{doc.status}</span>
                          <StatusIcon status={doc.status} />
                        </div>
                        <button 
                          onClick={() => handleDeleteDocument(doc._id)}
                          className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-full transition-colors"
                          title="Delete document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm line-clamp-1" title={doc.originalName}>{doc.originalName}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                      {doc.status === 'FAILED' && (
                        <p className="text-xs text-red-500 mt-2 font-medium bg-red-50 dark:bg-red-950/50 p-2 rounded">
                          {doc.failureReason || 'Verification failed. Please upload a clearer copy.'}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
        </div>
      </div>
    </div>
  );
}
