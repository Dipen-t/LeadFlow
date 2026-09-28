export interface Task {
  _id: string;
  title: string;
  dueAt: string;
  status: 'PENDING' | 'COMPLETED';
  leadId: string;
  createdAt: string;
}
