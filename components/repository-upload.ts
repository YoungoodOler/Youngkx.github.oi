'use client';

import { multipartPartSizeMiB, type RepositoryUpload } from '@/lib/file-repository';
import { authorizationHeaders, RepositoryError, repositoryRequest } from './RepositoryShared';

type UploadOptions = {
  file: File;
  description: string;
  folderId: string | null;
  token: string;
  signal: AbortSignal;
  onProgress: (percent: number) => void;
  onPhase: (phase: 'retrying' | 'uploading' | 'finishing') => void;
};

type UploadedPart = { partNumber: number; etag: string };

function checkCanceled(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException('Upload canceled.', 'AbortError');
}

function retryDelay(signal: AbortSignal, milliseconds: number) {
  checkCanceled(signal);
  return new Promise<void>((resolve, reject) => {
    const canceled = () => {
      window.clearTimeout(timer);
      reject(new DOMException('Upload canceled.', 'AbortError'));
    };
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', canceled);
      resolve();
    }, milliseconds);
    signal.addEventListener('abort', canceled, { once: true });
  });
}

function uploadBody(
  path: string,
  method: 'POST' | 'PUT',
  body: Blob,
  options: UploadOptions,
  onBytes: (bytes: number) => void,
) {
  checkCanceled(options.signal);
  return new Promise<unknown>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const canceled = () => xhr.abort();
    const cleanup = () => options.signal.removeEventListener('abort', canceled);
    options.signal.addEventListener('abort', canceled, { once: true });
    xhr.open(method, path);
    if (options.token) xhr.setRequestHeader('Authorization', `Bearer ${options.token}`);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onBytes(event.loaded);
    };
    xhr.onload = () => {
      cleanup();
      let value: unknown;
      try {
        value = JSON.parse(xhr.responseText);
      } catch {
        reject(
          new RepositoryError(
            'The upload response could not be read. Refresh the list before retrying.',
            502,
          ),
        );
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(value);
      else
        reject(
          new RepositoryError(
            value && typeof value === 'object' && 'error' in value
              ? String(value.error)
              : 'Upload failed. Please try again.',
            xhr.status,
          ),
        );
    };
    xhr.onerror = () => {
      cleanup();
      reject(
        new RepositoryError('The upload was interrupted. Check your connection and try again.', 0),
      );
    };
    xhr.onabort = () => {
      cleanup();
      reject(new DOMException('Upload canceled.', 'AbortError'));
    };
    xhr.send(body);
  });
}

function canRetry(reason: unknown) {
  return (
    reason instanceof TypeError ||
    (reason instanceof RepositoryError &&
      (reason.status === 0 ||
        reason.status === 408 ||
        reason.status === 429 ||
        reason.status >= 500))
  );
}

export async function uploadRepositoryFile(options: UploadOptions): Promise<unknown> {
  const { file, signal, token } = options;
  let displayedProgress = 0;
  const progress = (bytes: number) => {
    displayedProgress = Math.max(
      displayedProgress,
      file.size ? Math.min(100, Math.floor((bytes / file.size) * 100)) : 100,
    );
    options.onProgress(displayedProgress);
  };
  checkCanceled(signal);
  if (file.size <= multipartPartSizeMiB * 1024 * 1024) {
    const params = new URLSearchParams({ name: file.name, description: options.description });
    if (options.folderId) params.set('folderId', options.folderId);
    const result = await uploadBody(`/api/files?${params}`, 'POST', file, options, progress);
    progress(file.size);
    return result;
  }

  let sessionPath: string | undefined;
  try {
    const value = await repositoryRequest('/api/files/uploads', {
      method: 'POST',
      signal,
      headers: { ...authorizationHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: file.name,
        description: options.description,
        folderId: options.folderId,
        size: file.size,
      }),
    });
    if (!value || typeof value !== 'object') throw new Error('Unable to start the upload.');
    const session = value as RepositoryUpload;
    if (typeof session.id !== 'string' || typeof session.uploadId !== 'string')
      throw new Error('The upload session is invalid. Please refresh and retry.');
    sessionPath = `/api/files/uploads/${encodeURIComponent(session.id)}/${encodeURIComponent(session.uploadId)}`;
    if (session.partSizeMiB !== multipartPartSizeMiB)
      throw new Error('The upload session is invalid. Please refresh and retry.');
    const partSize = session.partSizeMiB * 1024 * 1024;
    const parts: UploadedPart[] = [];
    for (let offset = 0, partNumber = 1; offset < file.size; offset += partSize, partNumber++) {
      const body = file.slice(offset, Math.min(offset + partSize, file.size));
      for (let attempt = 0; ; attempt++) {
        checkCanceled(signal);
        try {
          options.onPhase('uploading');
          const uploaded = await uploadBody(
            `${sessionPath}/parts/${partNumber}`,
            'PUT',
            body,
            options,
            (bytes) => progress(offset + bytes),
          );
          if (
            !uploaded ||
            typeof uploaded !== 'object' ||
            !('partNumber' in uploaded) ||
            uploaded.partNumber !== partNumber ||
            !('etag' in uploaded) ||
            typeof uploaded.etag !== 'string' ||
            !uploaded.etag
          )
            throw new RepositoryError('The upload receipt could not be read. Please retry.', 502);
          parts.push({ partNumber, etag: uploaded.etag });
          progress(offset + body.size);
          break;
        } catch (reason) {
          if (signal.aborted || attempt >= 2 || !canRetry(reason)) throw reason;
          options.onPhase('retrying');
          await retryDelay(signal, 500 * (attempt + 1));
        }
      }
    }
    checkCanceled(signal);
    options.onPhase('finishing');
    for (let attempt = 0; ; attempt++) {
      checkCanceled(signal);
      try {
        return await repositoryRequest(`${sessionPath}/complete`, {
          method: 'POST',
          signal,
          headers: { ...authorizationHeaders(token), 'Content-Type': 'application/json' },
          body: JSON.stringify({ parts }),
        });
      } catch (reason) {
        if (signal.aborted || attempt >= 2 || !canRetry(reason)) throw reason;
        options.onPhase('retrying');
        await retryDelay(signal, 500 * (attempt + 1));
        options.onPhase('finishing');
      }
    }
  } catch (reason) {
    if (sessionPath) {
      try {
        await repositoryRequest(sessionPath, {
          method: 'DELETE',
          headers: authorizationHeaders(token),
          signal: AbortSignal.timeout(10_000),
          keepalive: true,
        });
      } catch {
        /* Cleanup is best effort when the server cannot be reached. */
      }
    }
    if (signal.aborted)
      throw new DOMException(
        'Upload canceled. Refresh the list to check whether the file was stored.',
        'AbortError',
      );
    throw reason;
  }
}
