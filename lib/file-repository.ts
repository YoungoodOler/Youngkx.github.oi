export const maximumUploadMiB = 5120;
export const directUploadLimitMiB = 95;
export const multipartPartSizeMiB = 32;

export type RepositoryUpload = { id: string; uploadId: string; partSizeMiB: number };
export type RepositoryUploadPart = { partNumber: number; etag: string };
export const maximumFilenameLength = 180;
export const maximumFileDescriptionLength = 400;
export const maximumFolderNameLength = 80;

export type RepositoryFolder = {
  id: string;
  name: string;
  createdAt: string;
};

export type RepositorySettings = {
  title: string;
  description: string;
  publicEnabled: boolean;
  maxUploadMiB: number;
};

export type RepositoryFile = {
  id: string;
  name: string;
  description: string;
  folderId: string | null;
  size: number;
  uploadedAt: string;
};

export type RepositoryListing = {
  settings: RepositorySettings;
  folders: RepositoryFolder[];
  files: RepositoryFile[];
  cursor: string | null;
};

export function defaultRepositorySettings(): RepositorySettings {
  return {
    title: 'File Repository',
    description: 'Notes, resources, and files to keep and share.',
    publicEnabled: true,
    maxUploadMiB: 1024,
  };
}

export function validateRepositorySettings(value: unknown): value is RepositorySettings {
  if (typeof value !== 'object' || value === null) return false;
  const settings = value as Record<string, unknown>;
  return (
    typeof settings.title === 'string' &&
    settings.title.trim().length > 0 &&
    settings.title.length <= 80 &&
    typeof settings.description === 'string' &&
    settings.description.length <= 300 &&
    typeof settings.publicEnabled === 'boolean' &&
    typeof settings.maxUploadMiB === 'number' &&
    Number.isInteger(settings.maxUploadMiB) &&
    settings.maxUploadMiB >= 1 &&
    settings.maxUploadMiB <= maximumUploadMiB
  );
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

export function fileDownloadPath(id: string): string {
  return `/api/files/${encodeURIComponent(id)}`;
}

export function filePreviewPath(id: string): string {
  return `${fileDownloadPath(id)}?preview=1`;
}

// Only inert image and video formats may be served inline on the site's origin.
export function filePreviewType(name: string): string | null {
  const extension = name.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    avif: 'image/avif',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
    mp4: 'video/mp4',
    m4v: 'video/mp4',
    webm: 'video/webm',
    ogv: 'video/ogg',
    mov: 'video/quicktime',
  };
  return extension && name.includes('.') && Object.hasOwn(types, extension)
    ? types[extension]
    : null;
}
