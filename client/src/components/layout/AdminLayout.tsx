import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AdminLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-neutral-100 dark:bg-neutral-950">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex md:w-56 md:flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
