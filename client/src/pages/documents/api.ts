import { api } from '@/lib/axios';
import type { Document } from './types';

export const fetchDocumentsAPI = async (): Promise<Document[]> => {
  const res = await api.get('/documents');
  return res.data.data.documents;
};

export const deleteDocumentAPI = async (docId: string): Promise<void> => {
  await api.delete(`/documents/${docId}`);
};

export const downloadDocumentAPI = async (docId: string): Promise<Blob> => {
  const response = await api.get(`/documents/${docId}/download`, { responseType: 'blob' });
  return response.data;
};
