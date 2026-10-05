import { formatFileSize } from "../utils/formatFileSize.js";
import { formatDate } from "../utils/formatDate.js";
import { Download, Trash2, Eye } from "lucide-react";

/**
 * FileCard — mobile card view for a single file.
 *
 * @param {{
 *   file: object,
 *   onDownload: (key: string) => void,
 *   onDelete: (file: object) => void,
 *   downloading: string | null,
 *   deleting: string | null,
 * }} props
 */
export default function FileCard({
  file,
  onPreview,
  onDownload,
  onDelete,
  downloading,
  previewing,
  deleting,
}) {
  const busy = !!downloading || !!previewing || !!deleting;

  return (
    <div className="card p-4 space-y-3 animate-fade-in">
      {/* File name */}
      <p className="font-medium text-gray-800 truncate" title={file.name}>
        {file.name}
      </p>

      {/* Metadata row */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>{formatFileSize(file.size)}</span>
        <span className="text-gray-300">·</span>
        <time dateTime={file.lastModified}>
          {formatDate(file.lastModified)}
        </time>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
        <button
          onClick={() => onPreview(file)}
          disabled={busy}
          className="btn-ghost flex-1 justify-center text-xs"
          aria-label={`Preview ${file.name}`}
        >
          <Eye className="w-3.5 h-3.5" />
          {previewing === file.key ? "Loading…" : "Preview"}
        </button>

        <button
          onClick={() => onDownload(file.key)}
          disabled={busy}
          className="btn-ghost flex-1 justify-center text-xs"
          aria-label={`Download ${file.name}`}
        >
          <Download className="w-3.5 h-3.5" />
          {downloading === file.key ? "Getting link…" : "Download"}
        </button>

        <button
          onClick={() => onDelete(file)}
          disabled={busy}
          className="btn-ghost flex-1 justify-center text-xs text-red-600 hover:text-red-700
               hover:bg-red-50"
          aria-label={`Delete ${file.name}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          {deleting === file.key ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
