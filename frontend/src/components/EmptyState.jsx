import { FolderOpen } from 'lucide-react';

/**
 * EmptyState — shown when the file list is empty.
 */
export default function EmptyState() {
  return (
    <div className="py-16 text-center space-y-3 animate-fade-in">
      <FolderOpen className="mx-auto w-12 h-12 text-gray-300" strokeWidth={1.5} />
      <p className="text-gray-600 font-medium">No files yet</p>
      <p className="text-sm text-gray-400">
        Upload a file using the area above to get started.
      </p>
    </div>
  );
}
