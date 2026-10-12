import { FolderOpen } from 'lucide-react';

/**
 * EmptyState — shown when the file list is empty.
 */
export default function EmptyState() {
  return (
    <div className="py-16 text-center space-y-3 animate-fade-in">
      <FolderOpen className="mx-auto w-12 h-12 text-gray-300 dark:text-slate-600" strokeWidth={1.5} />
      <p className="text-gray-600 font-medium dark:text-slate-300">No files yet</p>
      <p className="text-sm text-gray-400 dark:text-slate-500">
        Upload a file using the area above to get started.
      </p>
    </div>
  );
}
