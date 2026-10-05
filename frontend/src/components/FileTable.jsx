import { formatFileSize } from "../utils/formatFileSize.js";
import { formatDate, formatDateFull } from "../utils/formatDate.js";
import {
  Download,
  Trash2,
  Eye,
  FileText,
  Image,
  Archive,
  File,
} from "lucide-react";

/**
 * Return an icon component for a given filename.
 */
function FileIcon({ name, className }) {
  const ext = name?.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif"].includes(ext))
    return <Image className={className} />;
  if (["zip"].includes(ext)) return <Archive className={className} />;
  if (
    ["pdf", "doc", "docx", "txt", "csv", "xls", "xlsx", "ppt", "pptx"].includes(
      ext,
    )
  )
    return <FileText className={className} />;
  return <File className={className} />;
}

/**
 * FileTable — desktop view (≥ md breakpoint).
 *
 * @param {{
 *   files: Array,
 *   onDownload: (key: string) => void,
 *   onDelete: (file: object) => void,
 *   downloading: string | null,
 *   deleting: string | null,
 * }} props
 */
export default function FileTable({
  files,
  onDownload,
  onDelete,
  downloading,
  deleting,
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-500 font-medium uppercase tracking-wide">
            <th className="pb-3 pl-4 pr-2">Name</th>
            <th className="pb-3 px-2 text-right">Size</th>
            <th className="pb-3 px-2">Uploaded</th>
            <th className="pb-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {files.map((file) => (
            <tr
              key={file.key}
              className="group hover:bg-gray-50 transition-colors"
            >
              {/* Name */}
              <td className="py-3 pl-4 pr-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileIcon
                    name={file.name}
                    className="w-4 h-4 text-gray-400 flex-shrink-0"
                  />
                  <span
                    className="truncate font-medium text-gray-800 max-w-xs"
                    title={file.name}
                  >
                    {file.name}
                  </span>
                </div>
              </td>

              {/* Size */}
              <td className="py-3 px-2 text-right text-gray-500 tabular-nums whitespace-nowrap">
                {formatFileSize(file.size)}
              </td>

              {/* Date */}
              <td className="py-3 px-2 text-gray-500 whitespace-nowrap">
                <time
                  dateTime={file.lastModified}
                  title={formatDateFull(file.lastModified)}
                >
                  {formatDate(file.lastModified)}
                </time>
              </td>

              {/* Actions */}
              <td className="py-3 pl-2 pr-4 text-right">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onDownload(file.key)}
                    disabled={!!downloading || !!deleting}
                    aria-label={`Download ${file.name}`}
                    className="btn-ghost rounded-md px-2 py-1.5 text-gray-600
                               hover:text-brand-600 disabled:opacity-40"
                  >
                    {downloading === file.key ? (
                      <span className="text-xs">…</span>
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => onDelete(file)}
                    disabled={!!downloading || !!deleting}
                    aria-label={`Delete ${file.name}`}
                    className="btn-ghost rounded-md px-2 py-1.5 text-gray-600
                               hover:text-red-600 disabled:opacity-40"
                  >
                    {deleting === file.key ? (
                      <span className="text-xs">…</span>
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
