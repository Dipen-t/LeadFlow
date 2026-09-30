import { useEffect, useState } from 'react';
import { api } from '../../lib/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { Input } from '@/components/ui/input';
import {  FieldLabel } from '@/components/ui/field';
import { useAuthStore } from '../../store/authStore';
import { Webhook, Copy, CheckCircle2, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface Integration {
  _id: string;
  name: string;
  type: string;
  secretKey: string;
  active: boolean;
  createdAt: string;
}

export default function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const res = await api.get('/integrations');
      setIntegrations(res.data.data.integrations);
    } catch (err) {
      console.error('Failed to fetch integrations', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    setIsCreating(true);
    try {
      const res = await api.post('/integrations', { name: newName, type: 'Webhook' });
      setIntegrations(prev => [res.data.data.integration, ...prev]);
      setNewName('');
    } catch (err) {
      console.error('Failed to create integration', err);
      alert('Failed to create integration');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this integration? It will immediately stop working.')) return;
    
    try {
      const res = await api.patch(`/integrations/${id}/revoke`);
      setIntegrations(prev => prev.map(int => int._id === id ? res.data.data.integration : int));
    } catch (err) {
      console.error('Failed to revoke integration', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getWebhookUrl = (secretKey: string) => {
    const baseUrl = window.location.origin.replace(':5173', ':5000'); // Assuming dev environment ports
    return `${baseUrl}/api/webhooks/leads/${secretKey}`;
  };

  if (isLoading) return <Loader message="Loading integrations..." />;
  
  if (user?.role !== 'BROKERAGE_ADMIN' && user?.role !== 'PLATFORM_ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Access Denied</h2>
        <p className="text-muted-foreground mt-2">You do not have permission to view integrations.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations & Webhooks</h1>
        <p className="text-muted-foreground mt-1">
          Connect your favorite apps and securely pass leads into your pipeline.
        </p>
      </div>

      {/* Create New Integration */}
      <Card className="border-primary/10 shadow-sm">
        <CardHeader className="bg-primary/5 border-b border-primary/10 rounded-t-xl pb-4">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Webhook className="h-5 w-5" />
            Create Webhook
          </CardTitle>
          <CardDescription>
            Generate a new secure webhook endpoint to ingest leads automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <FieldLabel>Integration Name</FieldLabel>
              <Input 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                placeholder="e.g. Zillow Leads, Facebook Ads, Zapier" 
                required
                className="w-full"
              />
            </div>
            <Button type="submit" disabled={isCreating || !newName.trim()} className="w-full sm:w-auto shrink-0">
              {isCreating ? 'Creating...' : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Webhook
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Active Integrations List */}
      <div className="space-y-4 pt-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Your Integrations
          <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs py-0.5 px-2 rounded-full">
            {integrations.length}
          </span>
        </h3>
        
        {integrations.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-xl border-neutral-200 dark:border-neutral-800 text-neutral-500 bg-neutral-50/50 dark:bg-neutral-900/50">
            <Webhook className="w-8 h-8 mx-auto mb-3 opacity-20" />
            <p>No integrations configured yet.</p>
            <p className="text-sm">Create your first webhook above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {integrations.map((integration) => (
              <Card key={integration._id} className={`overflow-hidden transition-all ${!integration.active ? 'opacity-60 grayscale' : 'hover:border-primary/30 hover:shadow-md'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl shrink-0 ${integration.active ? 'bg-primary/10 text-primary' : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800'}`}>
                      <Webhook className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-lg">{integration.name}</h4>
                        {integration.active ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            Revoked
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>Created {format(new Date(integration.createdAt), 'MMM d, yyyy')}</span>
                        <span>&bull;</span>
                        <span>Type: {integration.type}</span>
                      </p>
                    </div>
                  </div>

                  {integration.active && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleRevoke(integration._id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 sm:self-start shrink-0"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Revoke
                    </Button>
                  )}
                </div>

                {integration.active && (
                  <div className="bg-neutral-50 dark:bg-neutral-900 px-5 py-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex-1 w-full bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 flex items-center gap-2 font-mono text-xs overflow-hidden">
                      <span className="text-neutral-400 select-none shrink-0">POST</span>
                      <span className="truncate text-neutral-600 dark:text-neutral-300">
                        {getWebhookUrl(integration.secretKey)}
                      </span>
                    </div>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="w-full sm:w-auto shrink-0 shadow-sm"
                      onClick={() => copyToClipboard(getWebhookUrl(integration.secretKey))}
                    >
                      {copiedKey === getWebhookUrl(integration.secretKey) ? (
                        <span className="flex items-center text-green-600 dark:text-green-400">
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Copied!
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <Copy className="w-4 h-4 mr-2" />
                          Copy URL
                        </span>
                      )}
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
