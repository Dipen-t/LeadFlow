import { api } from '@/lib/axios';
import type { Lead, PipelineStage } from './types';

export const fetchPipelineStagesAPI = async (): Promise<PipelineStage[]> => {
  const res = await api.get('/pipeline/stages');
  return res.data.data.stages;
};

export const fetchLeadsAPI = async (): Promise<Lead[]> => {
  const res = await api.get('/leads');
  return res.data.data.leads;
};

export const fetchAdvisorsAPI = async (): Promise<any[]> => {
  const res = await api.get('/users');
  return res.data.data.users.filter((u: any) => u.role === 'ADVISOR' && u.status === 'ACTIVE');
};

export const createLeadAPI = async (data: any): Promise<void> => {
  await api.post('/leads', data);
};

export const moveLeadAPI = async (leadId: string, pipelineStageId: string, version: number): Promise<Lead> => {
  const res = await api.patch(`/leads/${leadId}/stage`, { pipelineStageId, version });
  return res.data.data.lead;
};

export const assignLeadAPI = async (leadId: string, advisorId: string): Promise<Lead> => {
  const res = await api.post(`/leads/${leadId}/assign`, { advisorId: advisorId || null });
  return res.data.data.lead;
};

export const convertLeadAPI = async (leadId: string): Promise<{ password?: string }> => {
  const res = await api.post(`/clients/convert/${leadId}`);
  return { password: res.data.data.temporaryPassword };
};
