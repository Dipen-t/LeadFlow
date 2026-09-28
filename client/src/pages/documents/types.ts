export interface ClientInfo {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Document {
  _id: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  size: number;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  uploadedAt: string;
  clientId: ClientInfo;
}
