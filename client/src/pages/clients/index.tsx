import { useEffect, useState } from 'react';
import { Loader } from '@/components/ui/loader';
import type { Client } from './types';
import { fetchClientsAPI } from './api';
import { ClientsTable } from './ClientsTable';

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchClientsAPI()
      .then(data => {
        if (isMounted) {
          setClients(data);
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

      <ClientsTable clients={clients} />
    </div>
  );
}
