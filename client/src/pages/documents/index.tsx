import { useEffect, useState } from 'react';
import { Loader } from '@/components/ui/loader';
import type { Document } from './types';
import { fetchDocumentsAPI, deleteDocumentAPI, downloadDocumentAPI } from './api';
import { DocumentsList } from './DocumentsList';

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const data = await fetchDocumentsAPI();
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load documents', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await deleteDocumentAPI(docId);
      setDocuments(prev => prev.filter(d => d._id !== docId));
    } catch (err) {
      console.error('Failed to delete document', err);
    }
  };

  const handleDownload = async (docId: string, filename: string) => {
    try {
      const blob = await downloadDocumentAPI(docId);
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed', err);
      alert('Failed to download document. Please try again.');
    }
  };

  if (isLoading) return <Loader message="Loading documents..." />;

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground mt-1">Review and manage files uploaded by your clients.</p>
      </div>

      <DocumentsList documents={documents} onDelete={handleDelete} onDownload={handleDownload} />
    </div>
  );
}
