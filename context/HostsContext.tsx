import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { SavedHost } from '@/storage/hosts';
import { addSavedHost, getSavedHosts, removeSavedHost } from '@/storage/hosts';

type HostsContextType = {
  hosts: SavedHost[];
  refresh: () => Promise<void>;
  add: (h: { alias?: string; host: string; port: number; username: string }) => Promise<SavedHost>;
  remove: (id: string) => Promise<void>;
};

const HostsContext = createContext<HostsContextType | undefined>(undefined);

export function HostsProvider({ children }: { children: React.ReactNode }) {
  const [hosts, setHosts] = useState<SavedHost[]>([]);

  useEffect(() => {
    (async () => setHosts(await getSavedHosts()))();
  }, []);

  async function refresh() {
    setHosts(await getSavedHosts());
  }

  async function add(h: { alias?: string; host: string; port: number; username: string }) {
    const saved = await addSavedHost(h);
    await refresh();
    return saved;
  }

  async function remove(id: string) {
    await removeSavedHost(id);
    await refresh();
  }

  const value = useMemo<HostsContextType>(() => ({ hosts, refresh, add, remove }), [hosts]);

  return <HostsContext.Provider value={value}>{children}</HostsContext.Provider>;
}

export function useHosts() {
  const ctx = useContext(HostsContext);
  if (!ctx) throw new Error('useHosts must be used within HostsProvider');
  return ctx;
}

