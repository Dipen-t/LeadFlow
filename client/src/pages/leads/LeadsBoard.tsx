import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Lead, PipelineStage } from './types';

interface LeadsBoardProps {
  leads: Lead[];
  stages: PipelineStage[];
  onMoveLead: (lead: Lead, stageId: string) => void;
  onConvertLead: (lead: Lead) => void;
  onDragEnd: (result: DropResult) => void;
}

export function LeadsBoard({ leads, stages, onMoveLead, onConvertLead, onDragEnd }: LeadsBoardProps) {
  return (
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
                                      onChange={(e) => onMoveLead(lead, e.target.value)}
                                    >
                                      {stages.map(s => (
                                        <option key={s._id} value={s._id}>{s.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  

                                  <div className="mt-2 text-right">
                                    <Button variant="outline" size="sm" className="h-6 text-[10px] w-full" onClick={() => onConvertLead(lead)}>
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
  );
}
