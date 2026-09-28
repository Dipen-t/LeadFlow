import { useEffect, useState } from 'react';
import { api } from '../lib/axios';
import { Plus, LayoutGrid, List, GripVertical, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Loader } from '@/components/ui/loader';

interface Lead {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  pipelineStageId: string;
  __v: number;
}

interface PipelineStage {
  _id: string;
  name: string;
  order: number;
}

import { useSocket } from '../hooks/useSocket';

export default function Leads() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
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

  // New Lead Form State
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    pipelineStageId: '',
  });

  const fetchData = async () => {
    try {
      const [stagesRes, leadsRes] = await Promise.all([
        api.get('/pipeline/stages'),
        api.get('/leads')
      ]);
      const fetchedStages = stagesRes.data.data.stages;
      setStages(fetchedStages);
      setLeads(leadsRes.data.data.leads);
      if (fetchedStages.length > 0 && !formData.pipelineStageId) {
        setFormData(prev => ({ ...prev, pipelineStageId: fetchedStages[0]._id }));
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
    
    return () => {
      socket.off('lead.created', fetchData);
      socket.off('lead.stageChanged', fetchData);
      socket.off('lead.converted', fetchData);
    };
  }, [socket]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/leads', formData);
      setIsOpen(false);
      setFormData({ firstName: '', lastName: '', email: '', phone: '', pipelineStageId: stages[0]?._id || '' });
      fetchData(); // Refresh board
    } catch (err) {
      console.error('Failed to create lead', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveLead = async (lead: Lead, newStageId: string) => {
    try {
      const res = await api.patch(`/leads/${lead._id}/stage`, {
        pipelineStageId: newStageId,
        version: lead.__v
      });
      
      // Update local state with the returned lead to get the new __v
      const updatedLead = res.data.data.lead;
      setLeads(prev => prev.map(l => l._id === lead._id ? updatedLead : l));
    } catch (err: unknown) {
      const error = err as any;
      if (error.response?.status === 409) {
        alert('Conflict: Lead was modified by someone else. Refreshing...');
      } else {
        console.error('Failed to move lead', error);
      }
      // Revert on error
      const leadsRes = await api.get('/leads');
      setLeads(leadsRes.data.data.leads);
    }
  };

  const handleConvertLead = async (lead: Lead) => {
    try {
      const res = await api.post(`/clients/convert/${lead._id}`);
      if (res.data.status === 'success') {
        setConversionResult({
          name: `${lead.firstName} ${lead.lastName}`,
          password: res.data.data.temporaryPassword
        });
        // Remove from local leads or fetch data
        fetchData();
      }
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

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
                <DialogDescription>
                  Enter the details of the new lead. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateLead} className="space-y-6 pt-4">
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
        <div className="flex-1 overflow-x-auto pb-4">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 h-full items-start min-w-max">
              {stages.map(stage => {
                const stageLeads = leads.filter(l => l.pipelineStageId === stage._id);
                return (
                  <Droppable droppableId={stage._id} key={stage._id}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`w-80 flex-shrink-0 flex flex-col bg-neutral-100 dark:bg-neutral-900 rounded-lg p-3 max-h-full transition-colors ${snapshot.isDraggingOver ? 'bg-neutral-200/50 dark:bg-neutral-800/50' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-3 px-1">
                          <h3 className="font-semibold text-sm">{stage.name}</h3>
                          <span className="text-xs bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded-full font-medium">
                            {stageLeads.length}
                          </span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[150px]">
                          {stageLeads.map((lead, index) => (
                            <Draggable draggableId={lead._id} index={index} key={lead._id}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{
                                    ...provided.draggableProps.style,
                                    opacity: snapshot.isDragging ? 0.8 : 1,
                                  }}
                                >
                                  <Card className={`hover:border-primary/50 transition-colors shadow-sm ${snapshot.isDragging ? 'shadow-md border-primary ring-1 ring-primary/20' : ''}`}>
                                    <CardContent className="p-3">
                                      <div className="font-medium text-sm flex items-center justify-between">
                                        <span>{lead.firstName} {lead.lastName}</span>
                                        <GripVertical className="h-3 w-3 text-muted-foreground opacity-50" />
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-1 truncate">{lead.email}</div>
                                      
                                      <div className="mt-3 pt-3 border-t flex justify-between items-center">
                                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Move to:</span>
                                        <select 
                                          className="text-xs bg-transparent border-none p-0 focus:ring-0 cursor-pointer max-w-[120px] truncate"
                                          value={lead.pipelineStageId}
                                          onChange={(e) => handleMoveLead(lead, e.target.value)}
                                        >
                                          {stages.map(s => (
                                            <option key={s._id} value={s._id}>{s.name}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="mt-2 text-right">
                                        <Button variant="outline" size="sm" className="h-6 text-[10px] w-full" onClick={() => handleConvertLead(lead)}>
                                          Convert to Client
                                        </Button>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {stageLeads.length === 0 && !snapshot.isDraggingOver && (
                            <div className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg p-6 flex items-center justify-center text-center text-sm text-muted-foreground">
                              Drop leads here
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
        </div>
      ) : (
        <div className="flex-1 overflow-auto rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => {
                return (
                  <TableRow key={lead._id}>
                    <TableCell className="font-medium">{lead.firstName} {lead.lastName}</TableCell>
                    <TableCell>{lead.email}</TableCell>
                    <TableCell>{lead.phone || '-'}</TableCell>
                    <TableCell>
                      <select 
                        className="text-sm bg-transparent border rounded p-1 max-w-[150px] truncate"
                        value={lead.pipelineStageId}
                        onChange={(e) => handleMoveLead(lead, e.target.value)}
                      >
                        {stages.map(s => (
                          <option key={s._id} value={s._id}>{s.name}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleConvertLead(lead)}>
                        Convert
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {leads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No leads found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
