import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export const STORAGE_KEYS = {
  agentBaseUrl: 'agentBaseUrl',
  recentAgents: 'recentAgents',
} as const;

export type TestConnectionResult = {
  ok: boolean;
  status?: number;
  kind: 'ok' | 'network' | 'cors' | 'not_found' | 'timeout' | 'unknown';
  message?: string;
};

async function ssGetItem(key: string): Promise<string | null> {
  try {
    const v = await SecureStore.getItemAsync(key);
    if (v != null) return v;
  } catch {}
  return AsyncStorage.getItem(key);
}

async function ssSetItem(key: string, value: string) {
  try {
    await SecureStore.setItemAsync(key, value);
    return;
  } catch {}
  await AsyncStorage.setItem(key, value);
}

export async function getAgentBaseUrl(): Promise<string | null> {
  return ssGetItem(STORAGE_KEYS.agentBaseUrl);
}

export async function setAgentBaseUrl(url: string): Promise<void> {
  await ssSetItem(STORAGE_KEYS.agentBaseUrl, url);
  await addRecentAgent(url);
}

export async function getRecentAgents(): Promise<string[]> {
  const raw = await ssGetItem(STORAGE_KEYS.recentAgents);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as string[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function addRecentAgent(url: string): Promise<void> {
  const current = await getRecentAgents();
  const next = [url, ...current.filter((u) => u !== url)].slice(0, 5);
  await ssSetItem(STORAGE_KEYS.recentAgents, JSON.stringify(next));
}

export async function removeRecentAgent(url: string): Promise<void> {
  const current = await getRecentAgents();
  const next = current.filter((u) => u !== url);
  await ssSetItem(STORAGE_KEYS.recentAgents, JSON.stringify(next));
}

export function normalizeBaseUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  url = url.replace(/\/$/, '');
  return url;
}

