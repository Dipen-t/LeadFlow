import { useEffect, useState } from 'react';
import { api } from '../lib/axios';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Loader } from '@/components/ui/loader';

interface Client {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  createdAt: string;
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.get('/clients')
      .then(res => {
        if (isMounted) {
          setClients(res.data.data.clients);
        }
      })
      .catch(err => console.error('Failed to load clients', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  if (isLoading) {
    return <Loader message="Loading clients..." />;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Clients Directory</h1>
        <p className="text-sm text-muted-foreground mt-1">View all converted clients in your brokerage.</p>
      </div>

      <div className="flex-1 overflow-auto rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Converted On</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client._id}>
                <TableCell className="font-medium">{client.firstName} {client.lastName}</TableCell>
                <TableCell>{client.email}</TableCell>
                <TableCell>{client.phone || '-'}</TableCell>
                <TableCell>{new Date(client.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
            {clients.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No clients found. Convert some leads to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
