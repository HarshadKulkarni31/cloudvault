import { AlertTriangle, Trash2 } from 'lucide-react';

/**
 * ConfirmDeleteModal — accessible dialog asking for deletion confirmation.
 *
 * @param {{
 *   file: object | null,
 *   onConfirm: () => void,
 *   onCancel: () => void,
 *   deleting: boolean,
 * }} props
 */
export default function ConfirmDeleteModal({ file, onConfirm, onCancel, deleting }) {
  if (!file) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4
                 bg-black/40 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget && !deleting) onCancel(); }}
    >
      <div className="card w-full max-w-sm p-6 space-y-4 animate-slide-up shadow-xl">
        {/* Icon + title */}
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 id="delete-modal-title" className="font-semibold text-gray-900">
              Delete file
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Are you sure you want to permanently delete{' '}
              <span className="font-medium text-gray-800 break-all">"{file.name}"</span>?
              This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="btn-ghost"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="btn-danger"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
