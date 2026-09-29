export interface Task {
  _id: string;
  title: string;
  dueAt: string;
  status: 'PENDING' | 'COMPLETED';
  leadId: string | any;
  assignedAdvisorId?: { _id: string; name: string };
  createdAt: string;
}
