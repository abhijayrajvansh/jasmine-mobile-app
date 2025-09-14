import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { fetchWithTimeout } from '@/lib/network';
import {
  getAgentBaseUrl,
  setAgentBaseUrl as persistAgentBaseUrl,
  getRecentAgents,
  removeRecentAgent,
  normalizeBaseUrl,
  type TestConnectionResult,
} from '@/constants/config';

type SettingsContextType = {
  agentBaseUrl: string | null;
  setAgentBaseUrl: (url: string) => Promise<void>;
  recentAgents: string[];
  refreshRecents: () => Promise<void>;
  removeRecent: (url: string) => Promise<void>;
  connected: boolean;
  testing: boolean;
  testConnection: (baseUrl?: string) => Promise<TestConnectionResult>;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [agentBaseUrl, setAgentBaseUrlState] = useState<string | null>(null);
  const [recentAgents, setRecentAgents] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    (async () => {
      const url = await getAgentBaseUrl();
      setAgentBaseUrlState(url);
      setRecentAgents(await getRecentAgents());
    })();
  }, []);

  async function setAgentBaseUrl(url: string) {
    const n = normalizeBaseUrl(url);
    await persistAgentBaseUrl(n);
    setAgentBaseUrlState(n);
    setRecentAgents(await getRecentAgents());
  }

  async function refreshRecents() {
    setRecentAgents(await getRecentAgents());
  }

  async function removeRecent(url: string) {
    await removeRecentAgent(url);
    setRecentAgents(await getRecentAgents());
  }

  async function testConnection(baseUrl?: string): Promise<TestConnectionResult> {
    const target = normalizeBaseUrl(baseUrl ?? agentBaseUrl ?? '');
    if (!target) return { ok: false, kind: 'unknown', message: 'No URL' };
    setTesting(true);
    try {
      const res = await fetchWithTimeout(`${target}/`, { timeoutMs: 5000 });
      const ok = res.status >= 200 && res.status < 500; // allow 404 to be considered reachable
      const kind: TestConnectionResult['kind'] = res.status === 404 ? 'not_found' : 'ok';
      setConnected(ok);
      return { ok, status: res.status, kind };
    } catch (e: any) {
      setConnected(false);
      if (e?.name === 'AbortError') return { ok: false, kind: 'timeout', message: 'Timeout' };
      if (e?.message?.includes('Network')) return { ok: false, kind: 'network', message: 'Network error' };
      return { ok: false, kind: 'unknown', message: e?.message ?? 'Unknown error' };
    } finally {
      setTesting(false);
    }
  }

  const value = useMemo<SettingsContextType>(
    () => ({
      agentBaseUrl,
      setAgentBaseUrl,
      recentAgents,
      refreshRecents,
      removeRecent,
      connected,
      testing,
      testConnection,
    }),
    [agentBaseUrl, recentAgents, connected, testing]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

import { View } from 'react-native';

export function ConnectionDot() {
  const { connected } = useSettings();
  return (
    <View
      style={{
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: connected ? '#22c55e' : '#ef4444',
        marginRight: 12,
      }}
    />
  );
}
