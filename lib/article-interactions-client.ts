import { managementTokenKey, writeStoredValue } from './browser-storage';

export const commentManagementTokenKey = managementTokenKey;

export class InteractionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function interactionRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
    ...init,
  });
  const payload = await response.json();
  if (!response.ok)
    throw new InteractionError(payload.error || '操作失败，请稍后再试。', response.status);
  return payload as T;
}

export function interactionErrorMessage(error: unknown) {
  if (error instanceof InteractionError) return error.message;
  return '暂时无法连接，请稍后重试。你的评论内容会保留在输入框中。';
}

export function rememberCommentManagementToken(value: string | null) {
  writeStoredValue('sessionStorage', commentManagementTokenKey, value || null);
}
