'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import {
  validateRepositorySettings,
  type RepositoryFile,
  type RepositoryListing,
  type RepositoryFolder,
} from '@/lib/file-repository';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';

export const repositoryTokenKey = 'youngkx-links-token';

export function fileExtension(name: string) {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

export function fileDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Shanghai',
  }).format(date);
}

export function authorizationHeaders(token: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class RepositoryError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function repositoryRequest(path: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(path, { cache: 'no-store', ...init });
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      value && typeof value === 'object' && 'error' in value
        ? String(value.error)
        : 'The repository could not be reached. Please try again.';
    throw new RepositoryError(message, response.status);
  }
  return value;
}

export function readRepositoryListing(value: unknown): RepositoryListing {
  if (!value || typeof value !== 'object') throw new Error('The file list could not be read.');
  const listing = value as RepositoryListing;
  if (
    !validateRepositorySettings(listing.settings) ||
    !Array.isArray(listing.files) ||
    !(listing.cursor === null || typeof listing.cursor === 'string') ||
    !listing.files.every(
      (file) =>
        file &&
        typeof file.id === 'string' &&
        typeof file.name === 'string' &&
        typeof file.size === 'number' &&
        Number.isFinite(file.size) &&
        file.size >= 0 &&
        typeof file.uploadedAt === 'string',
    ) ||
    (listing.folders !== undefined &&
      (!Array.isArray(listing.folders) ||
        !listing.folders.every(
          (folder) =>
            folder &&
            typeof folder.id === 'string' &&
            typeof folder.name === 'string' &&
            typeof folder.createdAt === 'string',
        )))
  ) {
    throw new Error('The file list could not be read. Please try again.');
  }
  return {
    ...listing,
    folders: listing.folders ?? [],
    files: listing.files.map((file) => ({
      ...file,
      description: typeof file.description === 'string' ? file.description : '',
      folderId: typeof file.folderId === 'string' ? file.folderId : null,
    })),
  };
}

export function mergeRepositoryFiles(current: RepositoryFile[], incoming: RepositoryFile[]) {
  return [...new Map([...current, ...incoming].map((file) => [file.id, file])).values()];
}

export function RepoIcon({
  kind = 'file',
}: {
  kind?: 'file' | 'download' | 'search' | 'arrow' | 'upload' | 'close' | 'folder';
}) {
  const paths = {
    file: 'M14 2H5a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8zm0 0v6h6M8 13h8M8 17h5',
    download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
    search: 'm21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    arrow: 'M5 19 19 5M5 5h14v14',
    upload: 'M12 17V3m-5 5 5-5 5 5M4 16v5h16v-5',
    close: 'm6 6 12 12M6 18 18 6',
    folder: 'M3 5h6l2 3h10v12H3zM3 8h8',
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[kind]} />
    </svg>
  );
}

export function FolderBrowser({
  folders,
  selectedId,
  onSelect,
  disabled = false,
  hasUnfiled = false,
}: {
  folders: RepositoryFolder[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  disabled?: boolean;
  hasUnfiled?: boolean;
}) {
  if (!folders.length && !hasUnfiled) return null;
  return (
    <nav className="repo-folder-tabs" aria-label="Folders">
      {folders.map((folder) => (
        <button
          type="button"
          key={folder.id}
          disabled={disabled}
          aria-label={`Open folder ${folder.name}`}
          aria-pressed={folder.id === selectedId}
          onClick={() => onSelect(folder.id)}
        >
          <RepoIcon kind="folder" />
          <span>{folder.name}</span>
        </button>
      ))}
      {hasUnfiled && (
        <button
          type="button"
          disabled={disabled}
          aria-pressed={!selectedId}
          onClick={() => onSelect(null)}
        >
          Unfiled
        </button>
      )}
    </nav>
  );
}

export function FolderOptions({ folders }: { folders: RepositoryFolder[] }) {
  return (
    <>
      <option value="" disabled>
        Choose a folder
      </option>
      {folders.map((folder) => (
        <option value={folder.id} key={folder.id}>
          {folder.name}
        </option>
      ))}
    </>
  );
}

export function RepoArtwork() {
  return (
    <svg className="repo-artwork" viewBox="0 0 340 240" fill="none" aria-hidden="true">
      <ellipse
        cx="176"
        cy="201"
        rx="141"
        ry="22"
        stroke="currentColor"
        strokeDasharray="3 8"
        opacity=".25"
      />
      <path
        d="m86 58 112-24 58 39-112 24zM86 58v109l58 40V97m0 110 112-24V73"
        stroke="currentColor"
        opacity=".3"
      />
      <path
        d="m109 43 108-23 53 35-108 23zM109 43v108l53 36V78m0 109 108-23V55"
        fill="var(--bg)"
        stroke="currentColor"
        opacity=".65"
      />
      <path
        d="m132 29 76-16 51 34-76 16zM132 29v106l51 35V63m0 107 110-24V73l-34-26-76 16"
        fill="var(--bg)"
        stroke="currentColor"
      />
      <path
        d="m259 47 1 32 33-6m-91 19 57-12m-57 29 65-14m-65 31 46-10"
        stroke="currentColor"
        opacity=".5"
      />
      <circle cx="70" cy="103" r="25" fill="var(--bg)" stroke="currentColor" />
      <path d="M70 91v24m-8-8 8 8 8-8M36 53h10m-5-5v10m257 129h10m-5-5v10" stroke="currentColor" />
      <text x="28" y="224" fill="currentColor" stroke="none" fontSize="8" letterSpacing="3">
        KEEP / SHARE / RETURN
      </text>
    </svg>
  );
}

export function RepositoryShell({
  children,
  manage = false,
}: {
  children: ReactNode;
  manage?: boolean;
}) {
  return (
    <main className="repo-page categories-page">
      <SiteHeader navClassName="categories-nav" resources />
      <div className="repo-body shell">
        {manage && (
          <div className="repo-breadcrumb">
            <Link href="/repo/">Repo</Link>
            <span>/</span>
            <span>Manage</span>
          </div>
        )}
        {children}
      </div>
      <SiteFooter
        backHref={manage ? '/repo/' : '/#interactive-cards'}
        backLabel={manage ? 'Back to Repo ↗' : 'Back to Cards ↗'}
      />
    </main>
  );
}
