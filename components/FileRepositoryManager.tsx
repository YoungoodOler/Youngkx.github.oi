'use client';

import Link from 'next/link';
import { uploadRepositoryFile } from './repository-upload';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  defaultRepositorySettings,
  formatFileSize,
  maximumUploadMiB,
  type RepositoryFile,
  type RepositoryFolder,
  type RepositoryListing,
  type RepositorySettings,
} from '@/lib/file-repository';
import {
  authorizationHeaders,
  fileDate,
  FolderBrowser,
  FolderOptions,
  mergeRepositoryFiles,
  readRepositoryListing,
  RepoIcon,
  RepositoryError,
  RepositoryShell,
  repositoryRequest,
  repositoryTokenKey,
} from './RepositoryShared';

type Notice = { error?: boolean; text: string };

function uploadLimitInGB(mib: number): string {
  return String(Number((mib / 1024).toFixed(3)));
}

function FileEditor({
  file,
  busy,
  folders,
  onSave,
  onDelete,
}: {
  file: RepositoryFile;
  busy: boolean;
  folders: RepositoryFolder[];
  onSave: (
    file: RepositoryFile,
    name: string,
    description: string,
    folderId: string | null,
  ) => Promise<boolean>;
  onDelete: (file: RepositoryFile) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState(file.name);
  const [description, setDescription] = useState(file.description);
  const [folderId, setFolderId] = useState(
    folders.some((folder) => folder.id === file.folderId) ? (file.folderId ?? '') : '',
  );
  async function save(event: FormEvent) {
    event.preventDefault();
    if (await onSave(file, name, description, folderId || null)) setEditing(false);
  }
  return (
    <li className="repo-managed-file">
      <div className="repo-managed-file-heading">
        <div>
          <h3>{file.name}</h3>
          {file.description && <p>{file.description}</p>}
          <small>
            {formatFileSize(file.size)} · {fileDate(file.uploadedAt)}
          </small>
        </div>
        <div className="repo-actions">
          <button
            type="button"
            className="repo-button"
            disabled={busy}
            aria-expanded={editing}
            onClick={() => {
              setName(file.name);
              setDescription(file.description);
              setFolderId(
                folders.some((folder) => folder.id === file.folderId) ? (file.folderId ?? '') : '',
              );
              setEditing(!editing);
              setDeleting(false);
            }}
          >
            Edit details
          </button>
          <button
            type="button"
            className="repo-button repo-danger"
            disabled={busy}
            aria-label={`Delete ${file.name}`}
            onClick={() => {
              setDeleting(true);
              setEditing(false);
            }}
          >
            Delete
          </button>
        </div>
      </div>
      {editing && (
        <form className="repo-edit-form" onSubmit={(event) => void save(event)}>
          <fieldset disabled={busy}>
            <label>
              File name
              <input
                required
                maxLength={180}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label>
              Folder
              <select
                aria-label="Folder"
                required
                value={folderId}
                onChange={(event) => setFolderId(event.target.value)}
              >
                <FolderOptions folders={folders} />
              </select>
            </label>
            <label>
              Description
              <textarea
                rows={3}
                maxLength={400}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <div className="repo-actions">
              <button
                type="submit"
                className="repo-button repo-button--primary"
                disabled={!folderId}
              >
                Save details
              </button>
              <button type="button" className="repo-button" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </fieldset>
        </form>
      )}
      {deleting && (
        <div className="repo-delete-confirm" role="alert">
          <p>Delete “{file.name}”? This removes the stored file and its download link.</p>
          <div className="repo-actions">
            <button
              className="repo-button repo-danger"
              type="button"
              disabled={busy}
              onClick={() => void onDelete(file)}
            >
              Delete permanently
            </button>
            <button
              className="repo-button"
              type="button"
              disabled={busy}
              onClick={() => setDeleting(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function FileRepositoryManager() {
  const [token, setToken] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [listing, setListing] = useState<RepositoryListing>({
    settings: defaultRepositorySettings(),
    files: [],
    folders: [],
    cursor: null,
  });
  const [settings, setSettings] = useState<RepositorySettings>(defaultRepositorySettings);
  const [uploadLimitGB, setUploadLimitGB] = useState(() =>
    uploadLimitInGB(defaultRepositorySettings().maxUploadMiB),
  );
  const [notice, setNotice] = useState<Notice>({ text: 'Checking access to the workspace.' });
  const [operation, setOperation] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState<string | null>();
  const [uploadFolderId, setUploadFolderId] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [folderName, setFolderName] = useState('');
  const [deletingFolder, setDeletingFolder] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const busy = Boolean(operation);
  const folderIds = new Set(listing.folders.map((folder) => folder.id));
  const hasUnfiled = listing.files.some((file) => !folderIds.has(file.folderId ?? ''));
  const currentFolder =
    folderId === null && hasUnfiled
      ? undefined
      : (listing.folders.find((folder) => folder.id === folderId) ?? listing.folders[0]);
  const visibleFiles = listing.files.filter((file) =>
    currentFolder ? file.folderId === currentFolder.id : !folderIds.has(file.folderId ?? ''),
  );
  const selectedUploadFolderId = listing.folders.some((folder) => folder.id === uploadFolderId)
    ? uploadFolderId
    : (currentFolder?.id ?? listing.folders[0]?.id ?? '');

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    let storedToken = '';
    try {
      storedToken = sessionStorage.getItem(repositoryTokenKey) ?? '';
    } catch {
      /* Token entry still works without session storage. */
    }
    setToken(storedToken);
    repositoryRequest('/api/files/admin', {
      headers: authorizationHeaders(storedToken),
      signal: controller.signal,
    })
      .then((value) => {
        if (controller.signal.aborted) return;
        const next = readRepositoryListing(value);
        setListing(next);
        setSettings(next.settings);
        setUploadLimitGB(uploadLimitInGB(next.settings.maxUploadMiB));
        setFolderId(next.folders[0]?.id);
        setUploadFolderId(next.folders[0]?.id ?? '');
        setFolderName(next.folders[0]?.name ?? '');
        setAuthorized(true);
        setNotice({ text: 'Workspace ready. Upload files or update the collection.' });
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        if (reason instanceof RepositoryError && reason.status === 401) rememberToken('');
        setNotice(
          reason instanceof RepositoryError && reason.status === 401
            ? { text: 'Enter your manage token to continue.' }
            : {
                error: true,
                text: reason instanceof Error ? reason.message : 'Unable to check access.',
              },
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false);
      });
    return () => {
      mounted.current = false;
      controller.abort();
      uploadRef.current?.abort();
    };
  }, []);

  function rememberToken(value: string) {
    try {
      if (value) sessionStorage.setItem(repositoryTokenKey, value);
      else sessionStorage.removeItem(repositoryTokenKey);
    } catch {
      /* Storage is optional. */
    }
  }

  function fail(reason: unknown) {
    if (reason instanceof RepositoryError && reason.status === 401) {
      setAuthorized(false);
      rememberToken('');
    }
    setNotice({
      error: true,
      text: reason instanceof Error ? reason.message : 'Something went wrong. Please try again.',
    });
  }

  async function unlock(event: FormEvent) {
    event.preventDefault();
    setChecking(true);
    try {
      const next = readRepositoryListing(
        await repositoryRequest('/api/files/admin', {
          headers: authorizationHeaders(token.trim()),
        }),
      );
      setListing(next);
      setSettings(next.settings);
      setUploadLimitGB(uploadLimitInGB(next.settings.maxUploadMiB));
      setFolderId(next.folders[0]?.id);
      setUploadFolderId(next.folders[0]?.id ?? '');
      setFolderName(next.folders[0]?.name ?? '');
      setToken(token.trim());
      rememberToken(token.trim());
      setAuthorized(true);
      setNotice({ text: 'Workspace unlocked for this browser tab.' });
    } catch (reason) {
      fail(reason);
    } finally {
      setChecking(false);
    }
  }

  function selectFile(selected: File | null) {
    if (!selected) return;
    if (!listing.folders.length) {
      setNotice({ error: true, text: 'Create a folder before uploading.' });
      return;
    }
    if (selected.size > listing.settings.maxUploadMiB * 1024 * 1024) {
      setNotice({
        error: true,
        text: `Choose a file of ${formatFileSize(listing.settings.maxUploadMiB * 1024 * 1024)} or smaller.`,
      });
      return;
    }
    setFile(selected);
    setNotice({ text: 'File selected. Add a description, then upload.' });
  }

  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!file || busy) return;
    if (!selectedUploadFolderId) {
      setNotice({ error: true, text: 'Choose a folder before uploading.' });
      return;
    }
    setOperation('upload');
    setProgress(0);
    setNotice({ text: 'Uploading your file. Keep this page open.' });
    try {
      const controller = new AbortController();
      uploadRef.current = controller;
      const value = await uploadRepositoryFile({
        file,
        description: description.trim(),
        folderId: selectedUploadFolderId,
        token: token.trim(),
        signal: controller.signal,
        onProgress: (percent) => {
          if (mounted.current) setProgress(percent);
        },
        onPhase: (phase) => {
          if (mounted.current)
            setNotice({
              text:
                phase === 'retrying'
                  ? 'Connection interrupted. Retrying upload…'
                  : phase === 'finishing'
                    ? 'Finishing upload…'
                    : 'Uploading your file. Keep this page open.',
            });
        },
      });
      if (!mounted.current) return;
      const uploaded = readRepositoryListing({
        ...listing,
        files: [(value as { file: RepositoryFile }).file],
      }).files[0];
      setListing((current) => ({
        ...current,
        files: mergeRepositoryFiles([uploaded], current.files),
      }));
      setFile(null);
      setDescription('');
      selectFolder(selectedUploadFolderId);
      if (inputRef.current) inputRef.current.value = '';
      setNotice({
        text: listing.settings.publicEnabled
          ? 'Uploaded. Your file is now available on the public Repo page.'
          : 'Uploaded. Public downloads are paused until you enable them in settings.',
      });
    } catch (reason) {
      if (mounted.current) fail(reason);
    } finally {
      uploadRef.current = null;
      if (mounted.current) {
        setOperation('');
        setProgress(null);
      }
    }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    setOperation('settings');
    try {
      const next = {
        ...settings,
        title: settings.title.trim(),
        description: settings.description.trim(),
        maxUploadMiB:
          uploadLimitGB === uploadLimitInGB(settings.maxUploadMiB)
            ? settings.maxUploadMiB
            : Math.round(Number(uploadLimitGB) * 1024),
      };
      const value = await repositoryRequest('/api/files/settings', {
        method: 'PUT',
        headers: { ...authorizationHeaders(token.trim()), 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      const saved = readRepositoryListing({
        ...listing,
        settings: (value as { settings: RepositorySettings }).settings,
      }).settings;
      setSettings(saved);
      setUploadLimitGB(uploadLimitInGB(saved.maxUploadMiB));
      setListing((current) => ({ ...current, settings: saved }));
      setNotice({ text: 'Settings saved. The public Repo page is updated.' });
    } catch (reason) {
      fail(reason);
    } finally {
      setOperation('');
    }
  }

  async function editFile(
    current: RepositoryFile,
    name: string,
    description: string,
    folderId: string | null,
  ) {
    setOperation(current.id);
    try {
      const value = await repositoryRequest(`/api/files/${encodeURIComponent(current.id)}`, {
        method: 'PATCH',
        headers: { ...authorizationHeaders(token.trim()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), folderId }),
      });
      const updated = readRepositoryListing({
        ...listing,
        files: [(value as { file: RepositoryFile }).file],
      }).files[0];
      setListing((previous) => ({
        ...previous,
        files: previous.files.map((file) => (file.id === current.id ? updated : file)),
      }));
      setNotice({ text: 'File details saved.' });
      return true;
    } catch (reason) {
      fail(reason);
      return false;
    } finally {
      setOperation('');
    }
  }

  async function deleteFile(file: RepositoryFile) {
    setOperation(file.id);
    try {
      await repositoryRequest(`/api/files/${encodeURIComponent(file.id)}`, {
        method: 'DELETE',
        headers: authorizationHeaders(token.trim()),
      });
      setListing((current) => ({
        ...current,
        files: current.files.filter((item) => item.id !== file.id),
      }));
      setNotice({ text: `Deleted “${file.name}”.` });
    } catch (reason) {
      fail(reason);
    } finally {
      setOperation('');
    }
  }

  async function refresh(more = false) {
    setOperation('list');
    try {
      const cursor = more && listing.cursor ? `?cursor=${encodeURIComponent(listing.cursor)}` : '';
      const next = readRepositoryListing(
        await repositoryRequest(`/api/files/admin${cursor}`, {
          headers: authorizationHeaders(token.trim()),
        }),
      );
      setListing((current) => ({
        ...next,
        files: more ? mergeRepositoryFiles(current.files, next.files) : next.files,
      }));
      const selectedFolder =
        next.folders.find((folder) => folder.id === folderId) ??
        (folderId === null &&
        next.files.some((file) => !next.folders.some((folder) => folder.id === file.folderId))
          ? undefined
          : next.folders[0]);
      setFolderId(selectedFolder?.id ?? null);
      setFolderName(selectedFolder?.name ?? '');
      setUploadFolderId((current) =>
        next.folders.some((folder) => folder.id === current)
          ? current
          : (selectedFolder?.id ?? next.folders[0]?.id ?? ''),
      );
      setNotice({ text: more ? 'More files loaded.' : 'File list refreshed.' });
    } catch (reason) {
      fail(reason);
    } finally {
      setOperation('');
    }
  }

  function selectFolder(id: string | null) {
    setFolderId(id);
    setUploadFolderId(id ?? '');
    setFolderName(listing.folders.find((folder) => folder.id === id)?.name ?? '');
    setDeletingFolder(false);
  }

  async function createFolder(event: FormEvent) {
    event.preventDefault();
    if (!newFolderName.trim() || busy) return;
    setOperation('folder');
    try {
      const value = await repositoryRequest('/api/files/folders', {
        method: 'POST',
        headers: { ...authorizationHeaders(token.trim()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      const next = readRepositoryListing({
        ...listing,
        folders: [(value as { folder: RepositoryFolder }).folder],
      }).folders[0];
      setListing((current) => ({ ...current, folders: [...current.folders, next] }));
      setNewFolderName('');
      setFolderId(next.id);
      setUploadFolderId(next.id);
      setFolderName(next.name);
      setDeletingFolder(false);
      setNotice({ text: 'Folder created.' });
    } catch (reason) {
      fail(reason);
    } finally {
      setOperation('');
    }
  }

  async function renameFolder(event: FormEvent) {
    event.preventDefault();
    if (!folderId || !folderName.trim() || busy) return;
    setOperation('folder');
    try {
      const value = await repositoryRequest(`/api/files/folders/${encodeURIComponent(folderId)}`, {
        method: 'PATCH',
        headers: { ...authorizationHeaders(token.trim()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: folderName.trim() }),
      });
      const updated = readRepositoryListing({
        ...listing,
        folders: [(value as { folder: RepositoryFolder }).folder],
      }).folders[0];
      setListing((current) => ({
        ...current,
        folders: current.folders.map((folder) => (folder.id === updated.id ? updated : folder)),
      }));
      setFolderName(updated.name);
      setNotice({ text: 'Folder renamed.' });
    } catch (reason) {
      fail(reason);
    } finally {
      setOperation('');
    }
  }

  async function deleteFolder() {
    if (!folderId || busy) return;
    setOperation('folder');
    try {
      await repositoryRequest(`/api/files/folders/${encodeURIComponent(folderId)}`, {
        method: 'DELETE',
        headers: authorizationHeaders(token.trim()),
      });
      setListing((current) => ({
        ...current,
        folders: current.folders.filter((folder) => folder.id !== folderId),
      }));
      selectFolder(listing.folders.find((folder) => folder.id !== folderId)?.id ?? null);
      setNotice({ text: 'Folder deleted.' });
    } catch (reason) {
      fail(reason);
    } finally {
      setOperation('');
    }
  }

  return (
    <RepositoryShell manage>
      <section className="repo-manager-hero">
        <div>
          <span className="repo-eyebrow">YOUNGKX / PRIVATE WORKSPACE</span>
          <h1>
            Manage Repo<span>.</span>
          </h1>
        </div>
        <div className="repo-actions">
          <Link className="repo-button" href="/repo/">
            View Repo <RepoIcon kind="arrow" />
          </Link>
          {authorized && (
            <button
              type="button"
              className="repo-button"
              disabled={busy}
              onClick={() => {
                rememberToken('');
                setToken('');
                setAuthorized(false);
                setFile(null);
                setDescription('');
                setNotice({ text: 'Workspace locked. Enter your manage token to continue.' });
              }}
            >
              Lock workspace
            </button>
          )}
        </div>
      </section>
      <div
        className={`repo-notice${notice.error ? ' repo-notice--error' : ''}`}
        role={notice.error ? 'alert' : 'status'}
      >
        {notice.text}
      </div>
      {!authorized ? (
        <form className="repo-unlock repo-panel" onSubmit={(event) => void unlock(event)}>
          <span className="repo-eyebrow">MANAGE ACCESS</span>
          <label htmlFor="repo-token">Manage token</label>
          <div>
            <input
              id="repo-token"
              type="password"
              autoComplete="off"
              value={token}
              disabled={checking}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Enter manage token"
            />
            <button type="submit" className="repo-button repo-button--primary" disabled={checking}>
              {checking ? 'Checking…' : 'Unlock Repo'}
              <RepoIcon kind="arrow" />
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="repo-workspace-grid">
            <section className="repo-panel">
              <div className="repo-panel-heading">
                <span className="repo-eyebrow">01 / ADD A FILE</span>
                <h2>Upload.</h2>
                <p>
                  {listing.folders.length
                    ? `One file at a time, up to ${formatFileSize(listing.settings.maxUploadMiB * 1024 * 1024)}.`
                    : 'Create a folder before uploading.'}
                </p>
              </div>
              <form onSubmit={(event) => void upload(event)}>
                <fieldset disabled={busy || !listing.folders.length}>
                  <label
                    className={`repo-dropzone${dragging ? ' repo-dropzone--active' : ''}`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (!busy) setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragging(false);
                      if (!busy) {
                        if (event.dataTransfer.files.length > 1)
                          setNotice({ error: true, text: 'Please upload one file at a time.' });
                        else selectFile(event.dataTransfer.files[0] ?? null);
                      }
                    }}
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      aria-label="Choose a file to upload"
                      onChange={(event) => {
                        selectFile(event.target.files?.[0] ?? null);
                        event.target.value = '';
                      }}
                    />
                    <RepoIcon kind="upload" />
                    <strong>{file ? file.name : 'Drop a file here'}</strong>
                    <span>
                      {file
                        ? `${formatFileSize(file.size)} · Click to replace`
                        : 'or click to browse your files'}
                    </span>
                  </label>
                  <label>
                    Upload to folder
                    <select
                      aria-label="Upload to folder"
                      required
                      value={selectedUploadFolderId}
                      onChange={(event) => setUploadFolderId(event.target.value)}
                    >
                      <FolderOptions folders={listing.folders} />
                    </select>
                  </label>
                  <label>
                    File description
                    <textarea
                      rows={3}
                      maxLength={400}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="What is this file? Add a helpful note…"
                    />
                  </label>
                  <div className="repo-form-footer">
                    <span>{description.length} / 400</span>
                    <button
                      type="submit"
                      className="repo-button repo-button--primary"
                      disabled={!file || busy || !selectedUploadFolderId}
                    >
                      <RepoIcon kind="upload" />
                      {operation === 'upload' ? 'Uploading…' : 'Upload file'}
                    </button>
                  </div>
                </fieldset>
                {progress !== null && (
                  <div className="repo-upload-progress">
                    <label htmlFor="repo-progress">
                      {progress < 100 ? `Uploading ${progress}%` : 'Finishing upload…'}
                    </label>
                    <progress id="repo-progress" value={progress} max={100} />
                    <button
                      type="button"
                      className="repo-button"
                      onClick={() => uploadRef.current?.abort()}
                    >
                      Cancel upload
                    </button>
                  </div>
                )}
              </form>
            </section>
            <section className="repo-panel">
              <div className="repo-panel-heading">
                <span className="repo-eyebrow">02 / MAKE IT YOURS</span>
                <h2>Settings.</h2>
                <p>Changes appear when you save.</p>
              </div>
              <form onSubmit={(event) => void saveSettings(event)}>
                <fieldset disabled={busy}>
                  <label>
                    Repository title
                    <input
                      required
                      maxLength={80}
                      value={settings.title}
                      onChange={(event) => setSettings({ ...settings, title: event.target.value })}
                    />
                  </label>
                  <div className="repo-settings-bottom">
                    <label>
                      Upload limit (GB)
                      <input
                        type="number"
                        required
                        min={1 / 1024}
                        max={maximumUploadMiB / 1024}
                        step="any"
                        value={uploadLimitGB}
                        onChange={(event) => setUploadLimitGB(event.target.value)}
                      />
                    </label>
                    <label className="repo-checkbox">
                      <input
                        type="checkbox"
                        checked={settings.publicEnabled}
                        onChange={(event) =>
                          setSettings({ ...settings, publicEnabled: event.target.checked })
                        }
                      />
                      <span>
                        Public downloads
                        <small>
                          {settings.publicEnabled
                            ? 'Everyone can browse and download.'
                            : 'Files stay stored while access is paused.'}
                        </small>
                      </span>
                    </label>
                  </div>
                  <div className="repo-form-footer">
                    <span>Max. {maximumUploadMiB / 1024} GB</span>
                    <button type="submit" className="repo-button repo-button--primary">
                      {operation === 'settings' ? 'Saving…' : 'Save settings'}
                    </button>
                  </div>
                </fieldset>
              </form>
            </section>
          </div>
          <section className="repo-folder-manager">
            <div className="repo-managed-heading">
              <h2>Folders</h2>
              <form className="repo-folder-create" onSubmit={(event) => void createFolder(event)}>
                <label htmlFor="repo-folder-name">Folder name</label>
                <input
                  id="repo-folder-name"
                  required
                  maxLength={80}
                  value={newFolderName}
                  disabled={busy}
                  onChange={(event) => setNewFolderName(event.target.value)}
                />
                <button
                  type="submit"
                  className="repo-button"
                  disabled={busy || !newFolderName.trim()}
                >
                  Create folder
                </button>
              </form>
            </div>
            <FolderBrowser
              folders={listing.folders}
              selectedId={currentFolder?.id ?? null}
              onSelect={selectFolder}
              disabled={busy}
              hasUnfiled={hasUnfiled}
            />
            {currentFolder && (
              <div className="repo-folder-tools">
                <form onSubmit={(event) => void renameFolder(event)}>
                  <label htmlFor="repo-rename-folder">Folder name</label>
                  <input
                    id="repo-rename-folder"
                    required
                    maxLength={80}
                    value={folderName}
                    disabled={busy}
                    onChange={(event) => setFolderName(event.target.value)}
                  />
                  <button
                    type="submit"
                    className="repo-button"
                    disabled={busy || !folderName.trim()}
                  >
                    Rename folder
                  </button>
                </form>
                <button
                  type="button"
                  className="repo-button repo-danger"
                  disabled={busy}
                  onClick={() => setDeletingFolder(true)}
                >
                  Delete folder
                </button>
              </div>
            )}
            {currentFolder && deletingFolder && (
              <div className="repo-delete-confirm" role="alert">
                <p>Delete “{currentFolder.name}”? The folder must be empty.</p>
                <div className="repo-actions">
                  <button
                    className="repo-button repo-danger"
                    type="button"
                    disabled={busy}
                    onClick={() => void deleteFolder()}
                  >
                    Confirm delete folder
                  </button>
                  <button
                    className="repo-button"
                    type="button"
                    disabled={busy}
                    onClick={() => setDeletingFolder(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
          {(currentFolder || hasUnfiled || listing.cursor) && (
            <section className="repo-managed-list">
              <div className="repo-managed-heading">
                <div>
                  <span className="repo-eyebrow">03 / THE COLLECTION</span>
                  <h2>
                    {currentFolder?.name ?? 'Unfiled'}{' '}
                    <small>
                      {visibleFiles.length}
                      {listing.cursor ? '+' : ''}
                    </small>
                  </h2>
                </div>
                <button
                  className="repo-button"
                  type="button"
                  disabled={busy}
                  onClick={() => void refresh()}
                >
                  Refresh list
                </button>
              </div>
              {visibleFiles.length ? (
                <ul>
                  {visibleFiles.map((file) => (
                    <FileEditor
                      key={file.id}
                      file={file}
                      busy={busy}
                      folders={listing.folders}
                      onSave={editFile}
                      onDelete={deleteFile}
                    />
                  ))}
                </ul>
              ) : (
                <div className="repo-empty">
                  <RepoIcon />
                  <h3>No files in this folder.</h3>
                </div>
              )}
              {listing.cursor && (
                <div className="repo-load-more">
                  <button
                    type="button"
                    className="repo-button"
                    disabled={busy}
                    onClick={() => void refresh(true)}
                  >
                    Load more files ↓
                  </button>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </RepositoryShell>
  );
}
