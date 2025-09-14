import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export type SavedHost = {
  id: string;
  alias?: string;
  host: string;
  port: number;
  username: string;
  createdAt: number;
};

const KEYS = {
  hosts: 'savedHosts',
  password: (id: string) => `savedHost:${id}:password`,
} as const;

export async function getSavedHosts(): Promise<SavedHost[]> {
  const raw = await AsyncStorage.getItem(KEYS.hosts);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as SavedHost[];
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((h): h is SavedHost => !!h && typeof h.host === 'string' && typeof h.username === 'string')
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export function makeHostId(host: string, port: number, username: string) {
  return `${host}:${port}:${username}`;
}

export async function addSavedHost(input: { alias?: string; host: string; port: number; username: string }): Promise<SavedHost> {
  const id = makeHostId(input.host, input.port, input.username);
  const next: SavedHost = { id, alias: input.alias?.trim() || undefined, host: input.host.trim(), port: input.port, username: input.username.trim(), createdAt: Date.now() };
  const existing = await getSavedHosts();
  const filtered = existing.filter((h) => h.id !== id);
  const updated = [next, ...filtered].slice(0, 20);
  await AsyncStorage.setItem(KEYS.hosts, JSON.stringify(updated));
  return next;
}

export async function removeSavedHost(id: string): Promise<void> {
  const existing = await getSavedHosts();
  const updated = existing.filter((h) => h.id !== id);
  await AsyncStorage.setItem(KEYS.hosts, JSON.stringify(updated));
  // Also clear any stored secret
  try {
    await SecureStore.deleteItemAsync(KEYS.password(id));
  } catch {}
}

export async function getSavedPassword(id: string): Promise<string | null> {
  try {
    const v = await SecureStore.getItemAsync(KEYS.password(id));
    return v ?? null;
  } catch {
    return null;
  }
}

export async function setSavedPassword(id: string, password: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.password(id), password);
}

export async function clearSavedPassword(id: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEYS.password(id));
  } catch {}
}

