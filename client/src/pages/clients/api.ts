import { api } from '@/lib/axios';
import type { Client } from './types';

export const fetchClientsAPI = async (): Promise<Client[]> => {
  const res = await api.get('/clients');
  return res.data.data.clients;
};
