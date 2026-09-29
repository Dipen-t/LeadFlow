import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Trash2, ShieldCheck, ShieldAlert, Eye } from 'lucide-react';
import { format } from 'date-fns';
import type { Document } from './types';

interface DocumentsListProps {
  documents: Document[];
  onDelete: (docId: string) => void;
  onDownload: (docId: string, filename: string) => void;
}

export function DocumentsList({ documents, onDelete, onDownload }: DocumentsListProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED': return <ShieldCheck className="h-4 w-4 text-green-500" />;
      case 'REJECTED': return <ShieldAlert className="h-4 w-4 text-red-500" />;
      default: return <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />;
    }
  };

  return (
    <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
      {documents.map((doc) => (
        <Card key={doc._id} className="flex flex-row overflow-hidden transition-all hover:shadow-md dark:hover:shadow-neutral-900">
          {/* Preview Thumbnail placeholder */}
          <div className="w-32 bg-neutral-100 dark:bg-neutral-800 border-r flex items-center justify-center text-neutral-400 shrink-0">
            <FileText className="h-10 w-10 opacity-50" />
          </div>

          <div className="flex-1 p-4 flex flex-col min-w-0">
            <div className="flex justify-between items-start gap-4">
              <div className="min-w-0">
                <h3 className="font-semibold text-lg truncate" title={doc.originalName}>
                  {doc.originalName}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded uppercase font-medium tracking-wider">
                    {(doc.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium px-2 py-0.5 rounded border bg-neutral-50 dark:bg-neutral-900">
                    {getStatusIcon(doc.status)}
                    <span className="capitalize">{doc.status.toLowerCase()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" title="View Document" render={
                  <a href={doc.storageKey} target="_blank" rel="noopener noreferrer" />
                }>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Download Document" onClick={() => onDownload(doc._id, doc.originalName)}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => onDelete(doc._id)} title="Delete Document">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-auto pt-4 flex items-center justify-between text-sm text-muted-foreground border-t">
              <span className="truncate pr-4">
                Client: <strong className="font-medium text-foreground">{doc.clientId?.firstName} {doc.clientId?.lastName}</strong>
              </span>
              <span className="shrink-0">
                {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        </Card>
      ))}

      {documents.length === 0 && (
        <div className="col-span-full py-16 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg bg-neutral-50 dark:bg-neutral-900/50">
          <FileText className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-semibold">No documents found</h3>
          <p className="text-muted-foreground text-sm mt-1">Client uploads will appear here automatically.</p>
        </div>
      )}
    </div>
  );
}
