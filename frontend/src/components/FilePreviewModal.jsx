import { useEffect, useMemo, useState } from "react";
import {
  X,
  Download,
  Loader2,
  AlertCircle,
  FileText,
  File,
} from "lucide-react";

function getExtension(name = "") {
  return name.split(".").pop()?.toLowerCase() || "";
}

function getPreviewType(file) {
  const contentType = file?.contentType?.toLowerCase() || "";
  const ext = getExtension(file?.name);

  if (
    contentType.startsWith("image/") ||
    ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)
  ) {
    return "image";
  }

  if (contentType === "application/pdf" || ext === "pdf") {
    return "pdf";
  }

  if (
    contentType.startsWith("video/") ||
    ["mp4", "webm", "ogg"].includes(ext)
  ) {
    return "video";
  }

  if (
    contentType.startsWith("audio/") ||
    ["mp3", "wav", "ogg", "m4a"].includes(ext)
  ) {
    return "audio";
  }

  if (
    contentType.startsWith("text/") ||
    ["txt", "csv", "json", "log"].includes(ext)
  ) {
    return "text";
  }

  return "unsupported";
}

export default function FilePreviewModal({ preview, onClose }) {
  const [textContent, setTextContent] = useState("");
  const [textLoading, setTextLoading] = useState(false);
  const [error, setError] = useState(null);

  const file = preview?.file;
  const url = preview?.url;

  const previewType = useMemo(() => getPreviewType(file), [file]);

  useEffect(() => {
    if (!preview || previewType !== "text") {
      setTextContent("");
      setTextLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function loadText() {
      setTextLoading(true);
      setError(null);

      try {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Unable to load file contents.");
        }

        const text = await response.text();

        if (!cancelled) {
          setTextContent(text);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to preview this file.");
        }
      } finally {
        if (!cancelled) {
          setTextLoading(false);
        }
      }
    }

    loadText();

    return () => {
      cancelled = true;
    };
  }, [preview, previewType, url]);

  useEffect(() => {
    if (!preview) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [preview, onClose]);

  if (!preview || !file || !url) {
    return null;
  }

  const handleDownload = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div className="min-w-0">
            <h2
              className="truncate font-semibold text-gray-900"
              title={file.name}
            >
              {file.name}
            </h2>

            <p className="text-xs text-gray-500">
              {file.contentType || "File preview"}
            </p>
          </div>

          <div className="ml-4 flex items-center gap-1">
            <button
              onClick={handleDownload}
              className="btn-ghost rounded-md p-2"
              aria-label={`Download ${file.name}`}
              title="Download"
            >
              <Download className="h-4 w-4" />
            </button>

            <button
              onClick={onClose}
              className="btn-ghost rounded-md p-2"
              aria-label="Close preview"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div className="min-h-[300px] overflow-auto bg-gray-50 p-4">
          {previewType === "image" && (
            <div className="flex min-h-[300px] items-center justify-center">
              <img
                src={url}
                alt={file.name}
                className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-sm"
              />
            </div>
          )}

          {previewType === "pdf" && (
            <iframe
              src={url}
              title={`Preview of ${file.name}`}
              className="h-[70vh] w-full rounded-lg border border-gray-200 bg-white"
            />
          )}

          {previewType === "video" && (
            <div className="flex min-h-[300px] items-center justify-center">
              <video
                src={url}
                controls
                className="max-h-[70vh] max-w-full rounded-lg"
              >
                Your browser does not support video playback.
              </video>
            </div>
          )}

          {previewType === "audio" && (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                <File className="h-9 w-9 text-gray-500" />
              </div>

              <audio src={url} controls className="w-full max-w-xl" />
            </div>
          )}

          {previewType === "text" && (
            <>
              {textLoading ? (
                <div className="flex min-h-[300px] items-center justify-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading file...
                </div>
              ) : error ? (
                <PreviewError message={error} />
              ) : (
                <pre className="min-h-[300px] whitespace-pre-wrap break-words rounded-lg bg-white p-4 font-mono text-sm text-gray-800 shadow-sm">
                  {textContent}
                </pre>
              )}
            </>
          )}

          {previewType === "unsupported" && (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <FileText className="h-8 w-8 text-gray-500" />
              </div>

              <div>
                <p className="font-medium text-gray-800">Preview unavailable</p>
                <p className="mt-1 text-sm text-gray-500">
                  This file type cannot be previewed in the browser.
                </p>
              </div>

              <button onClick={handleDownload} className="btn-primary mt-2">
                <Download className="h-4 w-4" />
                Download file
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewError({ message }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
      <AlertCircle className="h-8 w-8 text-red-500" />

      <p className="mt-3 font-medium text-gray-800">Preview failed</p>

      <p className="mt-1 text-sm text-gray-500">{message}</p>
    </div>
  );
}
