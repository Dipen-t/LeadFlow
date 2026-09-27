import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/button';
import { LogOut, Menu } from 'lucide-react';

export default function Header() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <header className="sticky top-0 z-10 flex h-16 flex-shrink-0 items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 md:px-6">
      {/* Mobile Menu Button - Optional for now */}
      <div className="flex md:hidden">
        <Button variant="ghost" size="icon" className="text-neutral-500">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open sidebar</span>
        </Button>
      </div>

      {/* Right section */}
      <div className="flex flex-1 items-center justify-end gap-4">
        <div className="hidden md:flex flex-col items-end">
          <span className="text-sm font-medium leading-none">{user?.name}</span>
          <span className="text-xs text-muted-foreground mt-1">{user?.role?.replace('_', ' ')}</span>
        </div>
        
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm">
          {user?.name?.charAt(0) || 'U'}
        </div>

        <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 mx-1"></div>

        <Button variant="ghost" size="icon" onClick={logout} className="text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950">
          <LogOut className="h-5 w-5" />
          <span className="sr-only">Log out</span>
        </Button>
      </div>
    </header>
  );
}
