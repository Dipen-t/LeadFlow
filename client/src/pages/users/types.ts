export interface Brokerage {
  _id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  brokerageId?: string;
}
