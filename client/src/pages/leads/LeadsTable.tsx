import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import type { Lead, PipelineStage } from './types';

interface LeadsTableProps {
  leads: Lead[];
  stages: PipelineStage[];
  advisors: any[];
  userRole?: string;
  onMoveLead: (lead: Lead, stageId: string) => void;
  onAssignLead: (lead: Lead, advisorId: string) => void;
  onConvertLead: (lead: Lead) => void;
}

export function LeadsTable({ leads, stages, advisors, userRole, onMoveLead, onAssignLead, onConvertLead }: LeadsTableProps) {
  return (
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
                    onChange={(e) => onMoveLead(lead, e.target.value)}
                  >
                    {stages.map(s => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>

                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => onConvertLead(lead)}>
                    Convert
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
          {leads.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No leads found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
