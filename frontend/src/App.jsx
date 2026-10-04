import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, RefreshCw, AlertCircle, X } from 'lucide-react';

import Navbar from './components/Navbar.jsx';
import FileUploadZone from './components/FileUploadZone.jsx';
import FileTable from './components/FileTable.jsx';
import FileCard from './components/FileCard.jsx';
import UploadProgress from './components/UploadProgress.jsx';
import StorageSummary from './components/StorageSummary.jsx';
import ConfirmDeleteModal from './components/ConfirmDeleteModal.jsx';
import EmptyState from './components/EmptyState.jsx';
import LoadingState from './components/LoadingState.jsx';
import LoginPage from './components/LoginPage.jsx';
import CallbackPage from './components/CallbackPage.jsx';

import {
  listFiles,
  requestUploadUrl,
  uploadFileToS3,
  requestDownloadUrl,
  deleteFile,
} from './services/api.js';
import { isSignedIn, getCurrentUser } from './services/auth.js';

// ─────────────────────────────────────────────────────────
// Simple hash-based router (no react-router dependency)
// ─────────────────────────────────────────────────────────
function useRoute() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return path;
}

// ─────────────────────────────────────────────────────────
// Toast notification (simple inline implementation)
// ─────────────────────────────────────────────────────────
function Toast({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            'flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg text-sm animate-slide-up',
            t.type === 'error'
              ? 'bg-red-600 text-white'
              : t.type === 'warning'
              ? 'bg-amber-500 text-white'
              : 'bg-gray-900 text-white',
          ].join(' ')}
        >
          <span className="flex-1">{t.message}</span>
          <button onClick={() => onDismiss(t.id)} aria-label="Dismiss notification">
            <X className="w-4 h-4 opacity-70 hover:opacity-100" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Sort options
// ─────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'newest',    label: 'Newest first' },
  { value: 'oldest',   label: 'Oldest first' },
  { value: 'name_asc', label: 'Name A→Z' },
  { value: 'name_desc',label: 'Name Z→A' },
  { value: 'size_desc',label: 'Largest first' },
  { value: 'size_asc', label: 'Smallest first' },
];

function sortFiles(files, sortBy) {
  const sorted = [...files];
  switch (sortBy) {
    case 'newest':    return sorted.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    case 'oldest':    return sorted.sort((a, b) => new Date(a.lastModified) - new Date(b.lastModified));
    case 'name_asc':  return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'name_desc': return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case 'size_desc': return sorted.sort((a, b) => b.size - a.size);
    case 'size_asc':  return sorted.sort((a, b) => a.size - b.size);
    default:          return sorted;
  }
}

// ─────────────────────────────────────────────────────────
// App root — handles routing and auth gate
// ─────────────────────────────────────────────────────────
let toastCounter = 0;

export default function App() {
  const path = useRoute();

  // Auth state — re-checked whenever the route changes (e.g. after callback)
  const [authChecked, setAuthChecked] = useState(false);
  const [signedIn, setSignedIn]       = useState(false);
  const [user, setUser]               = useState(null);

  useEffect(() => {
    // Only check auth state on non-callback routes
    if (path !== '/callback') {
      const ok = isSignedIn();
      setSignedIn(ok);
      setUser(ok ? getCurrentUser() : null);
      setAuthChecked(true);
    }
  }, [path]);

  // Called by CallbackPage after successful token exchange
  const handleAuthSuccess = useCallback(() => {
    setSignedIn(true);
    setUser(getCurrentUser());
    setAuthChecked(true);
    // Navigate to root
    window.history.replaceState({}, document.title, '/');
  }, []);

  // ── Routing ──────────────────────────────────────────────
  if (path === '/callback') {
    return <CallbackPage onSuccess={handleAuthSuccess} />;
  }

  if (!authChecked) {
    // Tiny flash-of-nothing prevention — renders nothing while checking sessionStorage
    return null;
  }

  if (!signedIn) {
    return <LoginPage />;
  }

  return <Vault user={user} />;
}

// ─────────────────────────────────────────────────────────
// Vault — main app UI (only rendered when authenticated)
// ─────────────────────────────────────────────────────────
function Vault({ user }) {
  // ── State ──────────────────────────────────────────────
  const [files, setFiles]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [listError, setListError]       = useState(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [sortBy, setSortBy]             = useState('newest');
  const [toasts, setToasts]             = useState([]);

  // Upload state
  const [uploading, setUploading]       = useState(false);
  const [uploadFile, setUploadFile]     = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError]   = useState(null);
  const abortControllerRef              = useRef(null);

  // Download / delete state
  const [downloading, setDownloading]   = useState(null); // key string
  const [fileToDelete, setFileToDelete] = useState(null); // file object
  const [deleting, setDeleting]         = useState(null); // key string

  // ── Toast helpers ──────────────────────────────────────
  const addToast = useCallback((message, type = 'success') => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    const timer = setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    // Store timer ref on the id so we could clear it, but 4 s is fine for toasts
    return () => clearTimeout(timer);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Fetch file list ────────────────────────────────────
  const fetchFiles = useCallback(async () => {
    setListError(null);
    setLoading(true);
    const result = await listFiles();
    setLoading(false);
    if (result.success) {
      setFiles(result.data.files ?? []);
    } else {
      setListError(result.error);
    }
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  // ── Upload flow ────────────────────────────────────────
  const handleUpload = useCallback(async (file) => {
    setUploading(true);
    setUploadFile(file);
    setUploadProgress(0);
    setUploadError(null);

    // Step 1: Get presigned PUT URL from Lambda
    const urlResult = await requestUploadUrl({
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      fileSize: file.size,
    });

    if (!urlResult.success) {
      setUploadError(urlResult.error);
      setUploading(false);
      addToast(urlResult.error.message, 'error');
      return;
    }

    const { uploadUrl, key } = urlResult.data;

    // Step 2: PUT file directly to S3 (file bytes never go through Lambda)
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const s3Result = await uploadFileToS3(
      uploadUrl,
      file,
      file.type || 'application/octet-stream',
      (pct) => setUploadProgress(pct),
      controller.signal,
    );

    abortControllerRef.current = null;

    if (!s3Result.success) {
      setUploadError(s3Result.error);
      setUploading(false);
      if (s3Result.error.code !== 'UPLOAD_CANCELLED') {
        addToast(s3Result.error.message, 'error');
      }
      return;
    }

    // Success — wait briefly to show 100% before clearing the progress bar
    setUploadProgress(100);
    addToast(`"${file.name}" uploaded successfully.`);
    setTimeout(() => {
      setUploading(false);
      setUploadFile(null);
      setUploadProgress(0);
      fetchFiles(); // refresh list
    }, 1200);
  }, [addToast, fetchFiles]);

  // ── Cancel upload ──────────────────────────────────────
  const handleCancelUpload = useCallback(() => {
    abortControllerRef.current?.abort();
    setUploading(false);
    setUploadFile(null);
    setUploadProgress(0);
    setUploadError(null);
  }, []);

  // ── Download flow ──────────────────────────────────────
  const handleDownload = useCallback(async (key) => {
    setDownloading(key);
    const result = await requestDownloadUrl(key);
    setDownloading(null);

    if (!result.success) {
      addToast(result.error.message, 'error');
      return;
    }

    // Open the presigned URL — browser downloads directly from S3
    window.open(result.data.downloadUrl, '_blank', 'noopener,noreferrer');
  }, [addToast]);

  // ── Delete flow ────────────────────────────────────────
  const handleDeleteConfirm = useCallback(async () => {
    if (!fileToDelete) return;
    setDeleting(fileToDelete.key);

    const result = await deleteFile(fileToDelete.key);
    setDeleting(null);
    setFileToDelete(null);

    if (!result.success) {
      addToast(result.error.message, 'error');
      return;
    }

    addToast(`"${fileToDelete.name}" deleted.`);
    fetchFiles();
  }, [fileToDelete, addToast, fetchFiles]);

  // ── Derived: filter + sort ─────────────────────────────
  const q = searchQuery.toLowerCase().trim();
  const filteredFiles = q
    ? files.filter((f) => f.name.toLowerCase().includes(q))
    : files;
  const displayFiles = sortFiles(filteredFiles, sortBy);

  const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

  // ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">File Vault</h1>
          <p className="mt-1 text-sm text-gray-500">
            Securely store and retrieve your files — uploads go directly to S3 via presigned URLs.
          </p>
        </div>

        {/* Top row: upload zone + storage summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <FileUploadZone onUpload={handleUpload} uploading={uploading} />
            {(uploading || uploadError) && uploadFile && (
              <UploadProgress
                fileName={uploadFile.name}
                progress={uploadProgress}
                error={uploadError}
                onCancel={uploading ? handleCancelUpload : undefined}
              />
            )}
          </div>
          <div>
            <StorageSummary fileCount={files.length} totalSize={totalSize} />
          </div>
        </div>

        {/* File list card */}
        <div className="card">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-4
                          border-b border-gray-100">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                placeholder="Search files…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-9 pr-4"
                aria-label="Search files"
              />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input text-sm py-1.5 pr-8 w-auto"
                aria-label="Sort order"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {/* Refresh */}
              <button
                onClick={fetchFiles}
                disabled={loading}
                className="btn-ghost p-2"
                aria-label="Refresh file list"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-5">
            {/* List error banner */}
            {listError && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50
                              border border-red-200 rounded-lg px-4 py-3 mb-4">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Failed to load files</p>
                  <p className="text-xs mt-0.5">{listError.message}</p>
                  <button
                    onClick={fetchFiles}
                    className="mt-2 text-xs underline underline-offset-2 hover:no-underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <LoadingState />
            ) : displayFiles.length === 0 ? (
              q ? (
                <div className="py-10 text-center text-sm text-gray-500">
                  No files match "<strong>{searchQuery}</strong>"
                </div>
              ) : (
                <EmptyState />
              )
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <FileTable
                    files={displayFiles}
                    onDownload={handleDownload}
                    onDelete={setFileToDelete}
                    downloading={downloading}
                    deleting={deleting}
                  />
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {displayFiles.map((file) => (
                    <FileCard
                      key={file.key}
                      file={file}
                      onDownload={handleDownload}
                      onDelete={setFileToDelete}
                      downloading={downloading}
                      deleting={deleting}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Result count when filtering */}
            {!loading && q && displayFiles.length > 0 && (
              <p className="mt-4 text-xs text-gray-400 text-right">
                {displayFiles.length} of {files.length} files
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Delete confirmation modal */}
      <ConfirmDeleteModal
        file={fileToDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setFileToDelete(null)}
        deleting={!!deleting}
      />

      {/* Toast notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
