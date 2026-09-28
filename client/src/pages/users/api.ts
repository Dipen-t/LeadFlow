import { api } from '@/lib/axios';
import type { User, Brokerage } from './types';

export const fetchUsersAPI = async (): Promise<User[]> => {
  const res = await api.get('/users');
  return res.data.data.users;
};

export const fetchBrokeragesAPI = async (): Promise<Brokerage[]> => {
  const res = await api.get('/brokerages');
  return res.data.data.brokerages;
};

export const createUserAPI = async (data: any): Promise<void> => {
  await api.post('/users', data);
};

export const updateUserAPI = async (id: string, data: any): Promise<void> => {
  await api.patch(`/users/${id}`, data);
};

export const deleteUserAPI = async (id: string): Promise<void> => {
  await api.delete(`/users/${id}`);
};

export const createBrokerageAPI = async (data: any): Promise<void> => {
  await api.post('/brokerages', data);
};

export const deleteBrokerageAPI = async (id: string): Promise<void> => {
  await api.delete(`/brokerages/${id}`);
};
