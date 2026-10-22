import { maximumFilenameLength, type RepositoryFile } from '../lib/file-repository';

export const filePrefix = 'files/';
export const recordPrefix = 'file-records/';
export const identifierPattern =
  /^\d{13}-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

export function newFileId() {
  return `${String(9_999_999_999_999 - Date.now()).padStart(13, '0')}-${crypto.randomUUID()}`;
}

export function describeFile(object: R2Object): RepositoryFile {
  const size = Number(object.customMetadata?.size);
  if (!Number.isSafeInteger(size) || size < 0) throw new Error('Invalid file metadata.');
  return {
    id: object.key.slice(recordPrefix.length),
    name: object.customMetadata?.name ?? 'download',
    description: object.customMetadata?.description ?? '',
    folderId: object.customMetadata?.folderId || null,
    size,
    uploadedAt: object.customMetadata?.uploadedAt ?? object.uploaded.toISOString(),
  };
}

export function validFilename(name: string): boolean {
  try {
    encodeURIComponent(name);
  } catch {
    return false;
  }
  return (
    name.length > 0 &&
    name.length <= maximumFilenameLength &&
    !/[/\\]/.test(name) &&
    ![...name].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
  );
}

export function putFileRecord(bucket: R2Bucket, file: RepositoryFile, etag?: string) {
  return bucket.put(`${recordPrefix}${file.id}`, JSON.stringify(file), {
    httpMetadata: { contentType: 'application/json' },
    customMetadata: {
      name: file.name,
      description: file.description,
      folderId: file.folderId ?? '',
      size: String(file.size),
      uploadedAt: file.uploadedAt,
    },
    ...(etag ? { onlyIf: { etagMatches: etag } } : {}),
  });
}
