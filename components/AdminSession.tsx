'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { managementTokenKey, writeStoredValue } from '@/lib/browser-storage';

type Session = { authorized: boolean; preview?: boolean };
type AdminSession = Session & {
  checking: boolean;
  signIn: (token: string, remember: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  expire: () => void;
};

const AdminContext = createContext<AdminSession | null>(null);
const adminEndpoint = '/api/admin';

async function requestSession(init?: RequestInit): Promise<Session> {
  const response = await fetch(adminEndpoint, {
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
    ...init,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || typeof data?.authorized !== 'boolean') {
    throw new Error(data?.error || '暂时无法连接站长登录，请稍后重试。');
  }
  return data as Session;
}

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ authorized: false });
  const [checking, setChecking] = useState(true);
  const statusRequest = useRef<AbortController | null>(null);
  const changingSession = useRef(false);

  useEffect(() => {
    writeStoredValue('sessionStorage', managementTokenKey, null);
    const check = () => {
      if (changingSession.current) return;
      statusRequest.current?.abort();
      const controller = new AbortController();
      statusRequest.current = controller;
      void requestSession({
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
      })
        .then((value) => {
          if (!controller.signal.aborted) setSession(value);
        })
        .catch(() => {
          // Keep the last verified state during transient connection failures.
        })
        .finally(() => {
          if (!controller.signal.aborted) setChecking(false);
        });
    };
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) check();
    };
    check();
    window.addEventListener('focus', check);
    window.addEventListener('pageshow', restore);
    return () => {
      window.removeEventListener('focus', check);
      window.removeEventListener('pageshow', restore);
      statusRequest.current?.abort();
    };
  }, []);

  const changeSession = async (init: RequestInit) => {
    if (changingSession.current) return;
    changingSession.current = true;
    statusRequest.current?.abort();
    setChecking(true);
    try {
      const value = await requestSession(init);
      if (init.method === 'POST' && !value.authorized)
        throw new Error('暂时无法登录，请稍后重试。');
      setSession((current) => ({ ...current, ...value }));
    } finally {
      changingSession.current = false;
      setChecking(false);
    }
  };

  const expire = useCallback(() => {
    statusRequest.current?.abort();
    setSession((current) => ({ ...current, authorized: false }));
  }, []);

  return (
    <AdminContext.Provider
      value={{
        ...session,
        checking,
        expire,
        signIn: (token, remember) =>
          changeSession({
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ remember }),
          }),
        signOut: () => changeSession({ method: 'DELETE' }),
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdminSession() {
  const value = useContext(AdminContext);
  if (!value) throw new Error('useAdminSession must be used inside AdminSessionProvider');
  return value;
}

export function AdminLoginForm({
  tokenLabel = '管理口令',
  submitLabel = '登录',
  rememberLabel = '保持登录',
  pendingLabel = '正在验证…',
}: {
  tokenLabel?: string;
  submitLabel?: string;
  rememberLabel?: string;
  pendingLabel?: string;
}) {
  const id = useId();
  const { signIn, checking } = useAdminSession();
  const [token, setToken] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (checking || !token.trim()) return;
    setError('');
    try {
      await signIn(token.trim(), remember);
      setToken('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : '暂时无法登录，请稍后重试。');
    }
  };

  return (
    <form className="admin-login" onSubmit={(event) => void submit(event)}>
      <label htmlFor={id}>{tokenLabel}</label>
      <input
        id={id}
        type="password"
        autoComplete="current-password"
        required
        value={token}
        disabled={checking}
        onChange={(event) => setToken(event.target.value)}
      />
      <label className="admin-remember">
        <input
          type="checkbox"
          checked={remember}
          disabled={checking}
          onChange={(event) => setRemember(event.target.checked)}
        />
        {rememberLabel}
      </label>
      <button className="admin-action" type="submit" disabled={checking}>
        {checking ? pendingLabel : submitLabel}
      </button>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
