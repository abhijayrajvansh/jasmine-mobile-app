import EventSource from 'react-native-sse';

export type FetchOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  timeoutMs?: number;
};

export class HttpError extends Error {
  status: number;
  body?: any;
  constructor(message: string, status: number, body?: any) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function fetchWithTimeout(
  url: string,
  { method = 'GET', headers = {}, body, timeoutMs = 10000 }: FetchOptions = {}
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Accept': 'application/json, text/plain;q=0.9, */*;q=0.8',
        ...(body && typeof body === 'object' && !(body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...headers,
      },
      body:
        body && typeof body === 'object' && !(body instanceof FormData)
          ? JSON.stringify(body)
          : body,
      signal: controller.signal,
    } as RequestInit);

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await res.json().catch(() => undefined) : await res.text();
    if (!res.ok) throw new HttpError(`HTTP ${res.status}`, res.status, data);
    return { data, status: res.status, headers: res.headers } as const;
  } finally {
    clearTimeout(id);
  }
}

export function createEventSource(url: string, headers?: Record<string, string>) {
  const es = new EventSource(url, { headers });
  return es;
}
