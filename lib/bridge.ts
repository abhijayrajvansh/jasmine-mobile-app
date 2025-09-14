export type BridgeTestResult = {
  httpOk: boolean;
  wsOk: boolean;
  message?: string;
};

function bridgeHttpUrl(wsUrl: string) {
  try {
    const u = new URL(wsUrl.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:'));
    // Keep only origin (host:port)
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

export async function testBridge(bridgeWsUrl: string, timeoutMs = 4000): Promise<BridgeTestResult> {
  const httpUrl = bridgeHttpUrl(bridgeWsUrl);
  let httpOk = false;
  try {
    if (!httpUrl) throw new Error('Invalid bridge URL');
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(httpUrl, { method: 'GET', signal: controller.signal } as RequestInit).catch((e) => {
      throw e;
    });
    clearTimeout(id);
    httpOk = !!res && res.ok;
  } catch (e: any) {
    return { httpOk: false, wsOk: false, message: e?.message || 'HTTP reachability failed' };
  }

  // WS test
  let wsOk = false;
  try {
    await new Promise<void>((resolve, reject) => {
      let done = false;
      const t = setTimeout(() => {
        if (!done) {
          done = true;
          reject(new Error('WebSocket timeout'));
        }
      }, timeoutMs);
      const ws = new WebSocket(bridgeWsUrl);
      ws.onopen = () => {
        try { ws.close(); } catch {}
        if (!done) {
          done = true;
          clearTimeout(t);
          resolve();
        }
      };
      ws.onerror = () => {
        if (!done) {
          done = true; clearTimeout(t); reject(new Error('WebSocket error'));
        }
      };
    });
    wsOk = true;
  } catch (e: any) {
    return { httpOk, wsOk: false, message: e?.message || 'WebSocket failed' };
  }

  return { httpOk, wsOk };
}

