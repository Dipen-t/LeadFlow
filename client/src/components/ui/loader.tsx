import { Loader2 } from 'lucide-react';

interface LoaderProps {
  message?: string;
  className?: string;
}

export function Loader({ message = 'Loading...', className = '' }: LoaderProps) {
  return (
    <div className={`flex flex-col items-center justify-center min-h-[200px] h-full w-full ${className}`}>
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
