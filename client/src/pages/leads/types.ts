export interface Lead {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  pipelineStageId: string;
  assignedAdvisorId?: string;
  __v: number;
}

export interface PipelineStage {
  _id: string;
  name: string;
  order: number;
}
