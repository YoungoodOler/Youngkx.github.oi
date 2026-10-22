import {
  maximumFileDescriptionLength,
  maximumUploadMiB,
  multipartPartSizeMiB,
  type RepositoryFile,
  type RepositorySettings,
} from '../lib/file-repository';
import {
  describeFile,
  filePrefix,
  identifierPattern,
  newFileId,
  putFileRecord,
  recordPrefix,
  validFilename,
} from './file-records';
import { folderExists } from './folders';
import { jsonResponse, readLimitedJson, streamFixedLength, UploadBodyError } from './http';

const partBytes = multipartPartSizeMiB * 1024 * 1024;
const sessionLifetime = 24 * 60 * 60 * 1000;
type UploadSession = {
  id: string;
  uploadId: string;
  name: string;
  description: string;
  folderId: string | null;
  size: number;
  expiresAt: number;
};

class UploadError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readInput(
  request: Request,
  maximumBytes = 64 * 1024,
): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    throw new UploadError(415, 'Content-Type must be application/json.');
  let value: unknown;
  try {
    value = await readLimitedJson(request, maximumBytes);
  } catch {
    throw new UploadError(400, 'The request must contain valid JSON within the allowed size.');
  }
  if (!isRecord(value)) throw new UploadError(400, 'The request must contain a JSON object.');
  return value;
}

function sessionPrefix(id: string) {
  return `uploads/${id}/`;
}
function sessionKey(id: string) {
  return `${sessionPrefix(id)}session.json`;
}
function claimKey(id: string) {
  return `${sessionPrefix(id)}claim.json`;
}
function resume(bucket: R2Bucket, session: UploadSession) {
  return bucket.resumeMultipartUpload(`${filePrefix}${session.id}`, session.uploadId);
}

async function claim(bucket: R2Bucket, session: UploadSession, operation: 'complete' | 'abort') {
  return bucket.put(claimKey(session.id), JSON.stringify({ operation }), {
    onlyIf: { etagDoesNotMatch: '*' },
    customMetadata: { operation },
  });
}

async function privateObjects(bucket: R2Bucket, prefix: string): Promise<R2Object[]> {
  const objects: R2Object[] = [];
  let cursor: string | undefined;
  do {
    const listed = await bucket.list({ prefix, cursor, limit: 1000, include: ['customMetadata'] });
    objects.push(...listed.objects);
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
  return objects;
}

async function cleanSession(bucket: R2Bucket, session: UploadSession, assembled = false) {
  if (!assembled) await resume(bucket, session).abort();
  await bucket.delete([`${filePrefix}${session.id}`, `${recordPrefix}${session.id}`]);
  const keys = (await privateObjects(bucket, sessionPrefix(session.id))).map(
    (object) => object.key,
  );
  if (keys.length) await bucket.delete(keys);
}

async function cleanClaimedSession(bucket: R2Bucket, session: UploadSession, assembled = false) {
  try {
    await cleanSession(bucket, session, assembled);
  } catch (error) {
    // Keep the session for another cancellation attempt after a storage outage.
    await bucket.delete(claimKey(session.id));
    throw error;
  }
}

async function abortOpenSession(bucket: R2Bucket, session: UploadSession) {
  if (await claim(bucket, session, 'abort')) await cleanClaimedSession(bucket, session);
}

function validateLimit(size: number, settings: RepositorySettings) {
  if (size > Math.min(settings.maxUploadMiB, maximumUploadMiB) * 1024 * 1024) {
    throw new UploadError(413, `Files must be ${settings.maxUploadMiB} MiB or smaller.`);
  }
}

async function startUpload(request: Request, bucket: R2Bucket, settings: RepositorySettings) {
  const value = await readInput(request, 8 * 1024);
  const name = typeof value.name === 'string' ? value.name.normalize('NFC').trim() : '';
  const description = value.description ?? '';
  const folderId = value.folderId;
  if (
    !validFilename(name) ||
    typeof description !== 'string' ||
    description.length > maximumFileDescriptionLength
  ) {
    throw new UploadError(400, 'Use a valid filename and a description of at most 400 characters.');
  }
  if (typeof value.size !== 'number' || !Number.isSafeInteger(value.size) || value.size <= 0)
    throw new UploadError(
      400,
      'A positive integer file size is required. Use direct upload for empty files.',
    );
  validateLimit(value.size, settings);
  if (typeof folderId !== 'string' || !(await folderExists(bucket, folderId)))
    throw new UploadError(
      400,
      'Choose an existing folder before uploading. The repository root only contains folders.',
    );
  const id = newFileId();
  const upload = await bucket.createMultipartUpload(`${filePrefix}${id}`, {
    httpMetadata: { contentType: 'application/octet-stream' },
  });
  const session: UploadSession = {
    id,
    uploadId: upload.uploadId,
    name,
    description: description.trim(),
    folderId,
    size: value.size,
    expiresAt: Date.now() + sessionLifetime,
  };
  try {
    if (
      !(await bucket.put(sessionKey(id), JSON.stringify(session), {
        httpMetadata: { contentType: 'application/json' },
      }))
    )
      throw new Error('The upload session could not be saved.');
  } catch (error) {
    await upload.abort();
    throw error;
  }
  return jsonResponse({ id, uploadId: upload.uploadId, partSizeMiB: multipartPartSizeMiB }, 201);
}

async function uploadPart(
  request: Request,
  bucket: R2Bucket,
  session: UploadSession,
  number: number,
  settings: RepositorySettings,
) {
  const count = Math.ceil(session.size / partBytes);
  if (!Number.isInteger(number) || number < 1 || number > count)
    throw new UploadError(400, 'Invalid part number.');
  validateLimit(session.size, settings);
  if (await bucket.head(claimKey(session.id)))
    throw new UploadError(409, 'This upload is completing or being cancelled.');
  const expectedBytes = Math.min(partBytes, session.size - (number - 1) * partBytes);
  const header = request.headers.get('content-length');
  if (header === null || !/^\d+$/.test(header))
    throw new UploadError(411, 'A Content-Length header is required.');
  if (Number(header) !== expectedBytes || !request.body)
    throw new UploadError(400, `Part ${number} must contain exactly ${expectedBytes} bytes.`);
  const part = await streamFixedLength(request.body, expectedBytes, (body) =>
    resume(bucket, session).uploadPart(number, body),
  );
  if (!(await bucket.head(sessionKey(session.id))) || (await bucket.head(claimKey(session.id))))
    throw new UploadError(409, 'This upload is no longer accepting parts.');
  const receiptKey = `${sessionPrefix(session.id)}parts/${String(number).padStart(3, '0')}`;
  await bucket.put(receiptKey, '', {
    customMetadata: { partNumber: String(number), etag: part.etag, size: String(expectedBytes) },
  });
  if (!(await bucket.head(sessionKey(session.id))) || (await bucket.head(claimKey(session.id)))) {
    await bucket.delete(receiptKey);
    throw new UploadError(409, 'This upload is no longer accepting parts.');
  }
  return jsonResponse({ partNumber: number, etag: part.etag });
}

async function completeUpload(
  request: Request,
  bucket: R2Bucket,
  session: UploadSession,
  settings: RepositorySettings,
) {
  const existingClaim = await bucket.head(claimKey(session.id));
  const published = await bucket.head(`${recordPrefix}${session.id}`);
  if (existingClaim?.customMetadata?.operation === 'complete' && published)
    return jsonResponse({ file: describeFile(published) });
  let value: Record<string, unknown>;
  try {
    value = await readInput(request);
  } catch (error) {
    await abortOpenSession(bucket, session);
    throw error;
  }
  if (!(await claim(bucket, session, 'complete')))
    throw new UploadError(409, 'This upload is completing or being cancelled.');
  let assembled = false;
  try {
    validateLimit(session.size, settings);
    if (!session.folderId || !(await folderExists(bucket, session.folderId)))
      throw new UploadError(
        409,
        'The destination folder is missing. Choose an existing folder and start the upload again.',
      );
    const count = Math.ceil(session.size / partBytes);
    if (!Array.isArray(value.parts) || value.parts.length !== count)
      throw new UploadError(400, 'Provide every uploaded part exactly once.');
    const receipts = await privateObjects(bucket, `${sessionPrefix(session.id)}parts/`);
    if (receipts.length !== count) throw new UploadError(400, 'Some upload parts are missing.');
    const parts: R2UploadedPart[] = [];
    for (let index = 0; index < count; index += 1) {
      const number = index + 1;
      const part: unknown = value.parts[index];
      const receipt = receipts.find((item) => item.customMetadata?.partNumber === String(number));
      const expectedBytes = Math.min(partBytes, session.size - index * partBytes);
      if (
        !isRecord(part) ||
        part.partNumber !== number ||
        typeof part.etag !== 'string' ||
        part.etag !== receipt?.customMetadata?.etag ||
        Number(receipt.customMetadata?.size) !== expectedBytes
      ) {
        throw new UploadError(
          400,
          'Upload parts do not match the server receipts or expected lengths.',
        );
      }
      parts.push({ partNumber: number, etag: part.etag });
    }
    const object = await resume(bucket, session).complete(parts);
    assembled = true;
    if (object.size !== session.size)
      throw new UploadError(400, 'The completed file size does not match the declared size.');
    const file: RepositoryFile = {
      id: session.id,
      name: session.name,
      description: session.description,
      folderId: session.folderId,
      size: object.size,
      uploadedAt: object.uploaded.toISOString(),
    };
    if (!(await putFileRecord(bucket, file)))
      throw new Error('The completed file metadata could not be saved.');
    // Keep only the small session/claim as an idempotency receipt. Part receipts are no longer needed.
    await bucket.delete(receipts.map((item) => item.key));
    return jsonResponse({ file });
  } catch (error) {
    await cleanClaimedSession(bucket, session, assembled);
    throw error;
  }
}

export async function handleMultipartUploads(
  request: Request,
  bucket: R2Bucket,
  url: URL,
  settings: RepositorySettings,
): Promise<Response> {
  let session: UploadSession | undefined;
  try {
    if (url.pathname === '/api/files/uploads') {
      if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);
      return await startUpload(request, bucket, settings);
    }
    const match =
      /^\/api\/files\/uploads\/([^/]+)\/([^/]+)(?:\/(complete)|\/parts\/([1-9]\d{0,2}))?$/.exec(
        url.pathname,
      );
    if (!match || !identifierPattern.test(match[1]))
      return jsonResponse({ error: 'Upload not found.' }, 404);
    const method = match[3] ? 'POST' : match[4] ? 'PUT' : 'DELETE';
    if (request.method !== method) return jsonResponse({ error: 'Method not allowed.' }, 405);
    const object = await bucket.get(sessionKey(match[1]));
    if (!object)
      return request.method === 'DELETE'
        ? jsonResponse({ aborted: true })
        : jsonResponse({ error: 'Upload not found.' }, 404);
    session = await object.json<UploadSession>();
    let uploadId: string;
    try {
      uploadId = decodeURIComponent(match[2]);
    } catch {
      return jsonResponse({ error: 'Upload not found.' }, 404);
    }
    if (session.id !== match[1] || session.uploadId !== uploadId)
      return jsonResponse({ error: 'Upload not found.' }, 404);
    if (request.method === 'DELETE') {
      if (!(await claim(bucket, session, 'abort')))
        throw new UploadError(409, 'This upload is completing or has already completed.');
      await cleanClaimedSession(bucket, session);
      return jsonResponse({ aborted: true });
    }
    if (session.expiresAt < Date.now() && !(await bucket.head(`${recordPrefix}${session.id}`))) {
      await abortOpenSession(bucket, session);
      throw new UploadError(410, 'This upload session has expired. Start the upload again.');
    }
    if (match[3]) return await completeUpload(request, bucket, session, settings);
    try {
      return await uploadPart(request, bucket, session, Number(match[4]), settings);
    } catch (error) {
      if (!(error instanceof UploadError && error.status === 409))
        await abortOpenSession(bucket, session);
      throw error;
    }
  } catch (error) {
    if (error instanceof UploadError || error instanceof UploadBodyError)
      return jsonResponse(
        { error: error.message },
        error instanceof UploadError ? error.status : 400,
      );
    throw error;
  }
}
