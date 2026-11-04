import { useCallback, useEffect, useState } from 'react';

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (
      response.status === 401 &&
      path !== '/auth/login' &&
      path !== '/auth/register'
    )
      window.dispatchEvent(new Event('session-expired'));
    const message = Array.isArray(body?.message)
      ? body.message.join(' ')
      : body?.message;
    throw new Error(message || 'The request failed. Please try again.');
  }
  return body as T;
}

export function useResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    if (!path) {
      setLoading(false);
      setData(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api<T>(path, { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, version]);
  return { data, loading, error, refresh };
}

export function queryString(values: Record<string, string | number>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (value !== '') params.set(key, String(value));
  return `?${params}`;
}
