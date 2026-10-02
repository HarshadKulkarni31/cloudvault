import { CheckCircle, XCircle } from 'lucide-react';

/**
 * UploadProgress — inline progress bar shown during the S3 direct upload.
 *
 * @param {{ fileName: string, progress: number, error: object | null }} props
 */
export default function UploadProgress({ fileName, progress, error }) {
  const done = progress >= 100 && !error;

  return (
    <div className="card p-4 animate-slide-up space-y-2">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-gray-700 truncate max-w-xs">{fileName}</span>
        {done && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
        {error && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
        {!done && !error && (
          <span className="text-xs font-medium text-brand-600 flex-shrink-0">{progress}%</span>
        )}
      </div>

      {!error && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-200 ${done ? 'bg-green-500' : 'bg-brand-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600">{error.message}</p>
      )}
    </div>
  );
}
