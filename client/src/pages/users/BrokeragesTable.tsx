import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Trash2 } from 'lucide-react';
import type { Brokerage } from './types';

interface BrokeragesTableProps {
  brokerages: Brokerage[];
  onDelete: (id: string) => void;
}

export function BrokeragesTable({ brokerages, onDelete }: BrokeragesTableProps) {
  return (
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
                <Button variant="ghost" size="sm" onClick={() => onDelete(b._id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50">
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
  );
}
