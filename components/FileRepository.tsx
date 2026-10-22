'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  defaultRepositorySettings,
  fileDownloadPath,
  formatFileSize,
  type RepositoryListing,
} from '@/lib/file-repository';
import {
  fileDate,
  fileExtension,
  FolderBrowser,
  mergeRepositoryFiles,
  readRepositoryListing,
  RepoArtwork,
  RepoIcon,
  RepositoryShell,
  repositoryRequest,
} from './RepositoryShared';

export default function FileRepository() {
  const [listing, setListing] = useState<RepositoryListing>({
    settings: defaultRepositorySettings(),
    files: [],
    folders: [],
    cursor: null,
  });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [sort, setSort] = useState('newest');
  const currentFolder =
    listing.folders.find((folder) => folder.id === folderId) ?? listing.folders[0];
  const activeFolderId = currentFolder?.id;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    repositoryRequest('/api/files', { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) setListing(readRepositoryListing(value));
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setError(reason instanceof Error ? reason.message : 'Unable to load files.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);

  const files = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    const filtered = listing.files.filter(
      (file) =>
        activeFolderId !== undefined &&
        file.folderId === activeFolderId &&
        `${file.name} ${file.description}`.toLocaleLowerCase().includes(search),
    );
    return filtered.sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name, 'zh-CN', { numeric: true })
        : sort === 'size'
          ? b.size - a.size
          : Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt),
    );
  }, [listing.files, query, activeFolderId, sort]);
  const totalSize = listing.files.reduce((sum, file) => sum + file.size, 0);
  const latest = listing.files.reduce<string | null>(
    (date, file) => (!date || file.uploadedAt > date ? file.uploadedAt : date),
    null,
  );

  async function loadMore() {
    if (!listing.cursor || loadingMore) return;
    setLoadingMore(true);
    setError('');
    try {
      const next = readRepositoryListing(
        await repositoryRequest(`/api/files?cursor=${encodeURIComponent(listing.cursor)}`),
      );
      setListing((current) => ({
        ...next,
        files: next.settings.publicEnabled ? mergeRepositoryFiles(current.files, next.files) : [],
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load more files.');
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <RepositoryShell>
      <section className="repo-hero" aria-labelledby="repo-title">
        <div>
          <span className="repo-eyebrow">YOUNGKX / FILE REPOSITORY</span>
          <h1 id="repo-title">{listing.settings.title}</h1>
        </div>
        <RepoArtwork />
      </section>
      <div className="repo-summary">
        <span className="repo-status">
          <i />
          {loading
            ? 'Loading'
            : error && !listing.files.length
              ? 'Unavailable'
              : listing.settings.publicEnabled
                ? 'Public access'
                : 'Downloads paused'}
        </span>
        <dl>
          <div>
            <dt>Files</dt>
            <dd>
              {loading
                ? '—'
                : `${String(listing.files.length).padStart(2, '0')}${listing.cursor ? '+' : ''}`}
            </dd>
          </div>
          <div>
            <dt>Stored</dt>
            <dd>{loading ? '—' : `${formatFileSize(totalSize)}${listing.cursor ? '+' : ''}`}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{latest ? fileDate(latest) : '—'}</dd>
          </div>
        </dl>
        <Link className="repo-text-link" href="/repo/manage/">
          Manage Repo <RepoIcon kind="arrow" />
        </Link>
      </div>
      <section className="repo-library" aria-labelledby="repo-files-title" aria-busy={loading}>
        <div className="repo-library-heading">
          <div>
            <span className="repo-eyebrow">01 / THE COLLECTION</span>
            <h2 id="repo-files-title">
              Files<span>.</span>
            </h2>
          </div>
        </div>
        {listing.settings.publicEnabled && listing.folders.length > 0 && (
          <>
            <div className="repo-controls">
              <label className="repo-search">
                <RepoIcon kind="search" />
                <input
                  type="search"
                  aria-label="Search files"
                  placeholder="Search names or descriptions…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <label className="repo-sort">
                Sort by
                <select
                  aria-label="Sort files"
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option value="newest">Newest first</option>
                  <option value="name">Name A–Z</option>
                  <option value="size">Largest first</option>
                </select>
              </label>
            </div>
            <FolderBrowser
              folders={listing.folders}
              selectedId={activeFolderId ?? null}
              onSelect={(id) => {
                setFolderId(id);
                setQuery('');
              }}
            />
          </>
        )}
        {error && (
          <div className="repo-notice repo-notice--error" role="alert">
            <span>{error}</span>
            <button
              type="button"
              className="repo-button"
              disabled={loading || loadingMore}
              onClick={() =>
                listing.files.length && listing.cursor
                  ? void loadMore()
                  : setAttempt((value) => value + 1)
              }
            >
              Try again
            </button>
          </div>
        )}
        {loading ? (
          <div className="repo-empty" role="status">
            <RepoIcon />
            <h3>Opening the collection…</h3>
            <p>Fetching the latest files.</p>
          </div>
        ) : !listing.settings.publicEnabled ? (
          <div className="repo-empty">
            <RepoIcon />
            <h3>A little pause.</h3>
            <p>Public downloads are temporarily paused. Please check back later.</p>
          </div>
        ) : files.length ? (
          <>
            <div className="repo-list-head" aria-hidden="true">
              <span>FILE / DESCRIPTION</span>
              <span>SIZE</span>
              <span>ADDED</span>
              <span>DOWNLOAD</span>
            </div>
            <ul className="repo-file-list">
              {files.map((file) => (
                <li className="repo-file-row" key={file.id}>
                  <div className="repo-file-copy">
                    <span className="repo-file-icon">
                      <RepoIcon />
                      <small>{fileExtension(file.name).slice(0, 5) || 'FILE'}</small>
                    </span>
                    <div>
                      <h3>{file.name}</h3>
                      {file.description && <p>{file.description}</p>}
                      <span className="repo-file-mobile-meta">
                        {formatFileSize(file.size)} · {fileDate(file.uploadedAt)}
                      </span>
                    </div>
                  </div>
                  <span className="repo-file-size">{formatFileSize(file.size)}</span>
                  <time dateTime={file.uploadedAt}>{fileDate(file.uploadedAt)}</time>
                  <a
                    className="repo-download"
                    href={fileDownloadPath(file.id)}
                    download={file.name}
                    aria-label={`Download ${file.name}`}
                  >
                    Download
                    <RepoIcon kind="download" />
                  </a>
                </li>
              ))}
            </ul>
          </>
        ) : (
          !error && (
            <div className="repo-empty">
              <RepoIcon />
              <h3>
                {query ? 'No matching files.' : currentFolder ? 'No files yet.' : 'No folders yet.'}
              </h3>
              {query ? (
                <button
                  className="repo-button"
                  type="button"
                  onClick={() => {
                    setQuery('');
                  }}
                >
                  Clear filters
                </button>
              ) : (
                <Link className="repo-text-link" href="/repo/manage/">
                  {currentFolder ? 'Upload file' : 'Create folder'} <RepoIcon kind="arrow" />
                </Link>
              )}
            </div>
          )
        )}
        {!loading && listing.cursor && (
          <div className="repo-load-more">
            <p>Search and filters cover loaded files. Load more to explore the rest.</p>
            <button
              className="repo-button"
              type="button"
              disabled={loadingMore}
              onClick={() => void loadMore()}
            >
              {loadingMore ? 'Loading…' : 'Load more files'}
              <span>↓</span>
            </button>
          </div>
        )}
        <div className="repo-library-foot">
          <span>{currentFolder?.name ?? 'Folders'}</span>
          <span>
            {loading
              ? 'Loading…'
              : `${files.length} of ${listing.files.length}${listing.cursor ? '+' : ''} files`}
          </span>
        </div>
      </section>
    </RepositoryShell>
  );
}
