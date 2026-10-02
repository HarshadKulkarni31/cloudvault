import { formatFileSize, quotaPercent } from '../utils/formatFileSize.js';

const MAX_STORAGE_BYTES = 250 * 1024 * 1024; // 250 MB
const MAX_OBJECTS = 100;

/**
 * StorageSummary — real-time quota meter using actual S3 data.
 *
 * @param {{ fileCount: number, totalSize: number }} props
 */
export default function StorageSummary({ fileCount, totalSize }) {
  const storagePct = quotaPercent(totalSize, MAX_STORAGE_BYTES);
  const objectPct = quotaPercent(fileCount, MAX_OBJECTS);

  const barColor = (pct) => {
    if (pct >= 90) return 'bg-red-500';
    if (pct >= 70) return 'bg-amber-500';
    return 'bg-brand-500';
  };

  return (
    <div className="card px-5 py-4 space-y-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Storage Usage
      </h3>

      {/* Storage bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-600">
          <span>{formatFileSize(totalSize)} used</span>
          <span className="text-gray-400">{formatFileSize(MAX_STORAGE_BYTES)} limit</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor(storagePct)}`}
            style={{ width: `${storagePct}%` }}
            role="progressbar"
            aria-valuenow={storagePct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${storagePct}% of storage used`}
          />
        </div>
      </div>

      {/* Object count bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-600">
          <span>{fileCount} {fileCount === 1 ? 'file' : 'files'}</span>
          <span className="text-gray-400">{MAX_OBJECTS} limit</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor(objectPct)}`}
            style={{ width: `${objectPct}%` }}
            role="progressbar"
            aria-valuenow={objectPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${objectPct}% of file limit used`}
          />
        </div>
      </div>
    </div>
  );
}
