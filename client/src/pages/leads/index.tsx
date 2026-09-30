import { useEffect, useState } from 'react';
import { LayoutGrid, List, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader } from '@/components/ui/loader';
import { type DropResult } from '@hello-pangea/dnd';
import { useSocket } from '../../hooks/useSocket';
import { useAuthStore } from '../../store/authStore';
import type { Lead, PipelineStage } from './types';
import { 
  fetchPipelineStagesAPI, fetchLeadsAPI, fetchAdvisorsAPI, 
  createLeadAPI, moveLeadAPI, convertLeadAPI 
} from './api';
import { LeadsTable } from './LeadsTable';
import { LeadsBoard } from './LeadsBoard';
import { LeadForm } from './LeadForm';

export default function Leads() {
  const user = useAuthStore(state => state.user);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [advisors, setAdvisors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [conversionResult, setConversionResult] = useState<{ name: string, password?: string } | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const socket = useSocket();

  const handleCopyPassword = () => {
    if (conversionResult?.password) {
      navigator.clipboard.writeText(conversionResult.password);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    }
  };

  const fetchData = async () => {
    try {
      const fetchedStages = await fetchPipelineStagesAPI();
      const fetchedLeads = await fetchLeadsAPI();
      
      setStages(fetchedStages);
      setLeads(fetchedLeads);
      
      if (user?.role === 'BROKERAGE_ADMIN') {
        const fetchedAdvisors = await fetchAdvisorsAPI();
        setAdvisors(fetchedAdvisors);
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    socket.on('lead.created', fetchData);
    socket.on('lead.stageChanged', fetchData);
    socket.on('lead.converted', fetchData);
    socket.on('lead.assigned', fetchData);
    
    return () => {
      socket.off('lead.created', fetchData);
      socket.off('lead.stageChanged', fetchData);
      socket.off('lead.converted', fetchData);
      socket.off('lead.assigned', fetchData);
    };
  }, [socket]);

  const handleCreateLead = async (formData: any) => {
    await createLeadAPI(formData);
    fetchData(); // Refresh board
  };

  const handleMoveLead = async (lead: Lead, newStageId: string) => {
    try {
      const updatedLead = await moveLeadAPI(lead._id, newStageId, lead.__v);
      setLeads(prev => prev.map(l => l._id === lead._id ? updatedLead : l));
    } catch (err: unknown) {
      const error = err as any;
      if (error.response?.status === 409) {
        alert('Conflict: Lead was modified by someone else. Refreshing...');
      } else {
        console.error('Failed to move lead', error);
      }
      // Revert on error
      const fetchedLeads = await fetchLeadsAPI();
      setLeads(fetchedLeads);
    }
  };



  const handleConvertLead = async (lead: Lead) => {
    try {
      const { password } = await convertLeadAPI(lead._id);
      setConversionResult({
        name: `${lead.firstName} ${lead.lastName}`,
        password
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to convert lead');
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    const leadToMove = leads.find(l => l._id === draggableId);
    if (!leadToMove) return;
    
    // Optimistic UI update
    setLeads(prev => prev.map(l => 
      l._id === draggableId ? { ...l, pipelineStageId: destination.droppableId } : l
    ));

    // Persist to backend
    await handleMoveLead(leadToMove, destination.droppableId);
  };

  if (isLoading) {
    return <Loader message="Loading pipeline..." />;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and track your leads across stages.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Tabs value={viewMode} onValueChange={(val) => setViewMode(val as 'board' | 'table')} className="w-[120px]">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="board" title="Board View">
                <LayoutGrid className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="table" title="Table View">
                <List className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {user?.role === 'BROKERAGE_ADMIN' && (
            <LeadForm stages={stages} onSubmit={handleCreateLead} />
          )}
        </div>
      </div>

      <Dialog open={!!conversionResult} onOpenChange={(open) => !open && setConversionResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lead Converted Successfully!</DialogTitle>
            <DialogDescription>
              {conversionResult?.name} is now a Client. 
              {conversionResult?.password && (
                <div className="mt-4 p-4 bg-neutral-100 dark:bg-neutral-900 rounded-md">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">Please share this temporary password with them securely:</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-mono font-bold flex-1">{conversionResult.password}</p>
                    <Button variant="outline" size="sm" onClick={handleCopyPassword} className="shrink-0" title="Copy to clipboard">
                      {hasCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setConversionResult(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {viewMode === 'board' ? (
        <LeadsBoard 
          leads={leads} 
          stages={stages} 
          advisors={advisors} 
          userRole={user?.role} 
          onMoveLead={handleMoveLead}
          onConvertLead={handleConvertLead}
          onDragEnd={onDragEnd}
        />
      ) : (
        <LeadsTable 
          leads={leads} 
          stages={stages} 
          advisors={advisors} 
          userRole={user?.role} 
          onMoveLead={handleMoveLead}
          onConvertLead={handleConvertLead}
        />
      )}
    </div>
  );
}
