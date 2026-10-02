import { useRef, useState, useCallback } from 'react';
import { UploadCloud, AlertCircle } from 'lucide-react';

const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'txt', 'csv',
  'xls', 'xlsx', 'ppt', 'pptx',
  'jpg', 'jpeg', 'png', 'gif', 'zip',
]);

/**
 * FileUploadZone — drag-and-drop + click-to-select upload area.
 *
 * @param {{ onUpload: (file: File) => void, uploading: boolean }} props
 */
export default function FileUploadZone({ onUpload, uploading }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [clientError, setClientError] = useState(null);

  // ── Client-side validation (mirrors Lambda validation) ──
  function validateFile(file) {
    if (!file) return 'No file selected.';

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return `".${ext}" files are not supported. Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}.`;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_FILE_SIZE_MB} MB.`;
    }
    if (file.size === 0) {
      return 'Cannot upload an empty file.';
    }
    return null;
  }

  const handleFile = useCallback((file) => {
    setClientError(null);
    const error = validateFile(file);
    if (error) {
      setClientError(error);
      return;
    }
    onUpload(file);
  }, [onUpload]);

  // ── Drag events ──────────────────────────────────────────
  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = ''; // reset so same file can be re-selected
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        disabled={uploading}
        aria-label="Upload file — click or drag and drop"
        className={[
          'w-full border-2 border-dashed rounded-xl p-8 text-center transition-colors duration-150',
          'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          dragging
            ? 'border-brand-500 bg-brand-50'
            : 'border-gray-300 bg-white hover:border-brand-400 hover:bg-gray-50',
          uploading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        <UploadCloud
          className={`mx-auto w-10 h-10 mb-3 ${dragging ? 'text-brand-500' : 'text-gray-400'}`}
          strokeWidth={1.5}
        />
        <p className="text-sm font-medium text-gray-700">
          {uploading ? 'Uploading…' : 'Drop a file here, or click to select'}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          PDF, Word, Excel, PowerPoint, images, ZIP · Max {MAX_FILE_SIZE_MB} MB
        </p>
      </button>

      {clientError && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50
                        border border-red-200 rounded-lg px-3 py-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{clientError}</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        onChange={onInputChange}
        accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.zip"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
