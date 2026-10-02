import { Loader2 } from 'lucide-react';

/**
 * LoadingState — spinner shown while fetching the file list.
 */
export default function LoadingState() {
  return (
    <div className="py-16 text-center animate-fade-in">
      <Loader2 className="mx-auto w-8 h-8 text-brand-500 animate-spin" />
      <p className="mt-3 text-sm text-gray-500">Loading files…</p>
    </div>
  );
}
