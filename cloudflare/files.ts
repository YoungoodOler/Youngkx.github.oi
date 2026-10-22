import {
  defaultRepositorySettings,
  directUploadLimitMiB,
  filePreviewType,
  maximumFileDescriptionLength,
  validateRepositorySettings,
  type RepositoryFile,
  type RepositorySettings,
} from '../lib/file-repository';
import { folderExists, handleFoldersApi, isFolderId, readFolders } from './folders';
import {
  describeFile,
  filePrefix,
  identifierPattern,
  newFileId,
  putFileRecord,
  recordPrefix,
  validFilename,
} from './file-records';
import {
  authorizeManagement,
  jsonResponse,
  readLimitedJson,
  streamFixedLength,
  UploadBodyError,
  type WorkerEnv,
} from './http';
import { handleMultipartUploads } from './uploads';

const settingsKey = 'repository/settings.json';

async function readSettings(bucket: R2Bucket): Promise<RepositorySettings> {
  const object = await bucket.get(settingsKey);
  if (!object) return defaultRepositorySettings();
  const value: unknown = await object.json();
  // Corrupt settings must not accidentally reopen a repository that was closed.
  if (!validateRepositorySettings(value)) throw new Error('Invalid repository settings.');
  return value;
}

async function updateFile(request: Request, bucket: R2Bucket, id: string) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return jsonResponse({ error: 'Content-Type must be application/json.' }, 415);
  }
  let value: unknown;
  try {
    value = await readLimitedJson(request, 8 * 1024);
  } catch {
    return jsonResponse({ error: 'File details must contain valid JSON smaller than 8 KiB.' }, 400);
  }
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    (!('name' in value) && !('description' in value) && !('folderId' in value))
  ) {
    return jsonResponse({ error: 'Provide a name, description, or folder to update.' }, 400);
  }
  const name =
    'name' in value && typeof value.name === 'string'
      ? value.name.normalize('NFC').trim()
      : undefined;
  if (
    ('name' in value && (name === undefined || !validFilename(name))) ||
    ('description' in value &&
      (typeof value.description !== 'string' ||
        value.description.length > maximumFileDescriptionLength))
  ) {
    return jsonResponse(
      {
        error:
          'Use a valid filename (1–180 characters) and a description of at most 400 characters.',
      },
      400,
    );
  }
  const record = await bucket.head(`${recordPrefix}${id}`);
  if (!record) return jsonResponse({ error: 'File not found.' }, 404);
  const file = describeFile(record);
  if (name !== undefined) file.name = name;
  if ('description' in value && typeof value.description === 'string')
    file.description = value.description.trim();
  if ('folderId' in value) {
    if (!isFolderId(value.folderId) || !(await folderExists(bucket, value.folderId))) {
      return jsonResponse(
        { error: 'Choose an existing folder. Files cannot be moved to the repository root.' },
        400,
      );
    }
    file.folderId = value.folderId;
  }
  // Conditional metadata writes cannot resurrect a file deleted during editing.
  if (!(await putFileRecord(bucket, file, record.etag))) {
    return jsonResponse({ error: 'The file changed or was deleted. Refresh and retry.' }, 409);
  }
  return jsonResponse({ file });
}

async function uploadFile(
  request: Request,
  env: WorkerEnv,
  url: URL,
  settings: RepositorySettings,
) {
  const name = (url.searchParams.get('name') ?? '').normalize('NFC').trim();
  const description = (url.searchParams.get('description') ?? '').trim();
  const folderId = url.searchParams.get('folderId') || null;
  if (!validFilename(name)) {
    return jsonResponse(
      { error: 'Use a filename of 1–180 characters without slashes or control characters.' },
      400,
    );
  }
  if (description.length > maximumFileDescriptionLength) {
    return jsonResponse({ error: 'File descriptions must be 400 characters or shorter.' }, 400);
  }
  if (folderId === null || !(await folderExists(env.FILES, folderId))) {
    return jsonResponse(
      {
        error:
          'Choose an existing folder before uploading. The repository root only contains folders.',
      },
      400,
    );
  }
  const lengthHeader = request.headers.get('content-length');
  if (lengthHeader === null || !/^\d+$/.test(lengthHeader)) {
    return jsonResponse({ error: 'A Content-Length header is required.' }, 411);
  }
  const length = Number(lengthHeader);
  if (!Number.isSafeInteger(length) || length > settings.maxUploadMiB * 1024 * 1024) {
    return jsonResponse({ error: `Files must be ${settings.maxUploadMiB} MiB or smaller.` }, 413);
  }
  if (length > directUploadLimitMiB * 1024 * 1024) {
    return jsonResponse(
      { error: 'Use multipart upload for files larger than 95 MiB.', code: 'MULTIPART_REQUIRED' },
      413,
    );
  }
  if (length > 0 && !request.body) return jsonResponse({ error: 'The file body is missing.' }, 400);

  // Inverted time preserves newest-first ordering across R2 cursor pages.
  const id = newFileId();
  const key = `${filePrefix}${id}`;
  const options: R2PutOptions = {
    httpMetadata: { contentType: 'application/octet-stream' },
  };
  let object: R2Object | null;
  if (request.body) {
    try {
      object = await streamFixedLength(request.body, length, (stream) =>
        env.FILES.put(key, stream, options),
      );
    } catch (error) {
      await env.FILES.delete(key);
      if (error instanceof UploadBodyError) return jsonResponse({ error: error.message }, 400);
      throw error;
    }
  } else {
    object = await env.FILES.put(key, new Uint8Array(0), options);
  }
  if (!object) throw new Error('The file was not stored.');
  const file: RepositoryFile = {
    id,
    name,
    description,
    folderId,
    size: object.size,
    uploadedAt: object.uploaded.toISOString(),
  };
  try {
    if (!(await folderExists(env.FILES, folderId))) {
      await env.FILES.delete(key);
      return jsonResponse(
        { error: 'The destination folder was deleted. Choose an existing folder and retry.' },
        409,
      );
    }
    if (!(await putFileRecord(env.FILES, file)))
      throw new Error('The file details were not stored.');
  } catch (error) {
    await env.FILES.delete([key, `${recordPrefix}${id}`]);
    throw error;
  }
  return jsonResponse({ file }, 201);
}

async function downloadFile(request: Request, bucket: R2Bucket, key: string, file: RepositoryFile) {
  const preview = new URL(request.url).searchParams.get('preview') === '1';
  const contentType = preview ? filePreviewType(file.name) : 'application/octet-stream';
  if (!contentType)
    return jsonResponse({ error: 'Preview is not available for this file type.' }, 415);
  let range: R2Range | undefined;
  let size: number | undefined;
  const requestedRange = request.headers.get('range');
  if (requestedRange) {
    const metadata = await bucket.head(key);
    if (!metadata) return jsonResponse({ error: 'File not found.' }, 404);
    size = metadata.size;
    const ifRange = request.headers.get('if-range');
    if (!ifRange || ifRange === metadata.httpEtag) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(requestedRange);
      const start = match?.[1] ? Number(match[1]) : undefined;
      const end = match?.[2] ? Number(match[2]) : undefined;
      if (match && (start !== undefined || end !== undefined)) {
        if (start === undefined && end !== undefined && end > 0) {
          range = { offset: Math.max(0, size - end), length: Math.min(end, size) };
        } else if (start !== undefined && start < size && (end === undefined || end >= start)) {
          range = { offset: start, length: Math.min(end ?? size - 1, size - 1) - start + 1 };
        }
      }
      if (!range || size === 0) {
        return new Response(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${size}`, 'Cache-Control': 'no-store' },
        });
      }
    }
  }

  const object =
    request.method === 'HEAD' ? await bucket.head(key) : await bucket.get(key, { range });
  if (!object) return jsonResponse({ error: 'File not found.' }, 404);
  const name = file.name;
  const fallback = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const encodedName = encodeURIComponent(name).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  const headers = new Headers({
    'Content-Type': contentType,
    'Content-Disposition': `${preview ? 'inline' : 'attachment'}; filename="${fallback}"; filename*=UTF-8''${encodedName}`,
    'Content-Length': String(range && 'length' in range ? range.length : object.size),
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store',
    ETag: object.httpEtag,
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex',
    'Content-Security-Policy': 'sandbox',
  });
  if (range && 'offset' in range && 'length' in range) {
    headers.set(
      'Content-Range',
      `bytes ${range.offset}-${range.offset! + range.length! - 1}/${size}`,
    );
  }
  const body =
    'body' in object && object.body instanceof ReadableStream && request.method !== 'HEAD'
      ? object.body
      : null;
  return new Response(body, {
    status: range ? 206 : 200,
    headers,
  });
}

export async function handleFilesApi(
  request: Request,
  env: WorkerEnv,
  url: URL,
): Promise<Response> {
  const path = url.pathname;
  if (path === '/api/files/uploads' || path.startsWith('/api/files/uploads/')) {
    const authorizationError = await authorizeManagement(request, env);
    if (authorizationError) return authorizationError;
    if (!env.FILES) return jsonResponse({ error: 'File storage is not configured yet.' }, 503);
    return handleMultipartUploads(request, env.FILES, url, await readSettings(env.FILES));
  }
  const isAdmin = path === '/api/files/admin';
  const isSettings = path === '/api/files/settings';
  const isCollection = path === '/api/files';
  const isFolders = path === '/api/files/folders';
  const isFolder = path.startsWith('/api/files/folders/');
  const folderId = isFolder ? path.slice('/api/files/folders/'.length) : null;
  const id = path.slice('/api/files/'.length);
  if (isFolder && !isFolderId(folderId)) return jsonResponse({ error: 'Folder not found.' }, 404);
  if (
    !isAdmin &&
    !isSettings &&
    !isCollection &&
    !isFolders &&
    !isFolder &&
    !identifierPattern.test(id)
  ) {
    return jsonResponse({ error: 'File not found.' }, 404);
  }
  const methods = isFolders
    ? ['POST']
    : isFolder
      ? ['PATCH', 'DELETE']
      : isAdmin
        ? ['GET']
        : isSettings
          ? ['PUT']
          : isCollection
            ? ['GET', 'POST']
            : ['GET', 'HEAD', 'DELETE', 'PATCH'];
  if (!methods.includes(request.method)) return jsonResponse({ error: 'Method not allowed.' }, 405);
  const needsAuth =
    isAdmin ||
    isSettings ||
    isFolders ||
    isFolder ||
    request.method === 'POST' ||
    request.method === 'DELETE' ||
    request.method === 'PATCH';
  if (needsAuth) {
    const authorizationError = await authorizeManagement(request, env);
    if (authorizationError) return authorizationError;
  }
  if (!env.FILES) return jsonResponse({ error: 'File storage is not configured yet.' }, 503);
  const settings = await readSettings(env.FILES);
  if (isFolders || isFolder) return handleFoldersApi(request, env.FILES, folderId);

  if (isSettings) {
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
      return jsonResponse({ error: 'Content-Type must be application/json.' }, 415);
    }
    let value: unknown;
    try {
      value = await readLimitedJson(request, 8 * 1024);
    } catch {
      return jsonResponse({ error: 'Settings must contain valid JSON smaller than 8 KiB.' }, 400);
    }
    if (!validateRepositorySettings(value))
      return jsonResponse(
        { error: 'Check the title, description, and upload limit (1–5120 MiB).' },
        400,
      );
    const saved: RepositorySettings = {
      title: value.title.trim(),
      description: value.description.trim(),
      publicEnabled: value.publicEnabled,
      maxUploadMiB: value.maxUploadMiB,
    };
    await env.FILES.put(settingsKey, JSON.stringify(saved), {
      httpMetadata: { contentType: 'application/json' },
    });
    return jsonResponse({ settings: saved });
  }

  if (isCollection || isAdmin) {
    if (request.method === 'POST') return uploadFile(request, env, url, settings);
    if (!isAdmin && !settings.publicEnabled)
      return jsonResponse({ settings, folders: [], files: [], cursor: null });
    const cursor = url.searchParams.get('cursor') ?? undefined;
    if (cursor && cursor.length > 2048) return jsonResponse({ error: 'Invalid page cursor.' }, 400);
    const folders = await readFolders(env.FILES);
    const folderIds = new Set(folders.map((folder) => folder.id));
    const listed = await env.FILES.list({
      prefix: recordPrefix,
      limit: 100,
      cursor,
      include: ['customMetadata'],
    });
    return jsonResponse({
      settings,
      folders,
      files: listed.objects.map((object) => {
        const file = describeFile(object);
        if (file.folderId && !folderIds.has(file.folderId)) file.folderId = null;
        return file;
      }),
      cursor: listed.truncated ? listed.cursor : null,
    });
  }

  const key = `${filePrefix}${id}`;
  if (request.method === 'DELETE') {
    await env.FILES.delete([
      key,
      `${recordPrefix}${id}`,
      `uploads/${id}/session.json`,
      `uploads/${id}/claim.json`,
    ]);
    return jsonResponse({ deleted: true });
  }
  if (request.method === 'PATCH') return updateFile(request, env.FILES, id);
  if (!settings.publicEnabled) {
    if (!request.headers.get('authorization'))
      return jsonResponse({ error: 'Public downloads are paused.' }, 403);
    const authorizationError = await authorizeManagement(request, env);
    if (authorizationError) return authorizationError;
  }
  const record = await env.FILES.head(`${recordPrefix}${id}`);
  if (!record) return jsonResponse({ error: 'File not found.' }, 404);
  return downloadFile(request, env.FILES, key, describeFile(record));
}
