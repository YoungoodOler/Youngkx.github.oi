import { maximumFolderNameLength, type RepositoryFolder } from '../lib/file-repository';
import { jsonResponse, readLimitedJson } from './http';

const folderPrefix = 'folders/';
const folderIdPattern = /^folder-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const maximumFolders = 200;

export function isFolderId(value: unknown): value is string {
  return typeof value === 'string' && folderIdPattern.test(value);
}

function describeFolder(object: R2Object): RepositoryFolder {
  return {
    id: object.key.slice(folderPrefix.length),
    name: object.customMetadata?.name ?? 'Folder',
    createdAt: object.customMetadata?.createdAt ?? object.uploaded.toISOString(),
  };
}

export async function readFolders(bucket: R2Bucket): Promise<RepositoryFolder[]> {
  const folders: RepositoryFolder[] = [];
  let cursor: string | undefined;
  do {
    const listed = await bucket.list({
      prefix: folderPrefix,
      cursor,
      limit: 1000,
      include: ['customMetadata'],
    });
    folders.push(...listed.objects.map(describeFolder));
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
  return folders.sort((a, b) => a.name.localeCompare(b.name));
}

export async function folderExists(bucket: R2Bucket, folderId: string): Promise<boolean> {
  return isFolderId(folderId) && (await bucket.head(`${folderPrefix}${folderId}`)) !== null;
}

async function containsFiles(bucket: R2Bucket, folderId: string): Promise<boolean> {
  let cursor: string | undefined;
  do {
    const listed = await bucket.list({
      prefix: 'file-records/',
      cursor,
      limit: 1000,
      include: ['customMetadata'],
    });
    if (listed.objects.some((file) => file.customMetadata?.folderId === folderId)) return true;
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
  return false;
}

export async function handleFoldersApi(request: Request, bucket: R2Bucket, id: string | null) {
  const key = id ? `${folderPrefix}${id}` : null;
  const current = key ? await bucket.head(key) : null;
  if (id && !current) return jsonResponse({ error: 'Folder not found.' }, 404);
  if (request.method === 'DELETE' && key && id) {
    if (await containsFiles(bucket, id))
      return jsonResponse(
        { error: 'Move or delete the files in this folder before deleting it.' },
        409,
      );
    await bucket.delete(key);
    return jsonResponse({ deleted: true });
  }
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return jsonResponse({ error: 'Content-Type must be application/json.' }, 415);
  }
  let value: unknown;
  try {
    value = await readLimitedJson(request, 8 * 1024);
  } catch {
    return jsonResponse(
      { error: 'Folder details must contain valid JSON smaller than 8 KiB.' },
      400,
    );
  }
  if (
    typeof value !== 'object' ||
    value === null ||
    !('name' in value) ||
    typeof value.name !== 'string'
  ) {
    return jsonResponse({ error: 'A folder name is required.' }, 400);
  }
  const name = value.name.normalize('NFC').trim();
  const hasControlCharacters = [...name].some(
    (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
  );
  if (
    !name ||
    name.length > maximumFolderNameLength ||
    /[/\\]/.test(name) ||
    hasControlCharacters
  ) {
    return jsonResponse(
      { error: 'Use a folder name of 1–80 characters without slashes or control characters.' },
      400,
    );
  }
  const folders = await readFolders(bucket);
  if (
    folders.some((folder) => folder.id !== id && folder.name.toLowerCase() === name.toLowerCase())
  ) {
    return jsonResponse({ error: 'A folder with that name already exists.' }, 409);
  }
  if (!id && folders.length >= maximumFolders) {
    return jsonResponse({ error: 'A maximum of 200 folders is supported.' }, 400);
  }
  const folder: RepositoryFolder = current
    ? { ...describeFolder(current), name }
    : { id: `folder-${crypto.randomUUID()}`, name, createdAt: new Date().toISOString() };
  const stored = await bucket.put(`${folderPrefix}${folder.id}`, JSON.stringify(folder), {
    httpMetadata: { contentType: 'application/json' },
    customMetadata: { name: folder.name, createdAt: folder.createdAt },
    ...(current ? { onlyIf: { etagMatches: current.etag } } : {}),
  });
  if (!stored)
    return jsonResponse({ error: 'The folder changed or was deleted. Refresh and retry.' }, 409);
  return jsonResponse({ folder }, id ? 200 : 201);
}
