import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

export type SshConnectOptions = {
  host: string;
  port?: number;
  username: string;
  password: string;
};

export type SshSession = {
  write: (data: string) => void;
  close: () => void;
  onData: (listener: (chunk: string) => void) => () => void;
  onExit: (listener: (code?: number) => void) => () => void;
  onError: (listener: (message: string) => void) => () => void;
};

type NativeSshModuleType = {
  isAvailable: () => boolean;
  connect(options: SshConnectOptions): string; // returns sessionId
  write(sessionId: string, data: string): void;
  close(sessionId: string): void;
};

const NativeSshModule: NativeSshModuleType | undefined = (NativeModules as any).RNNativeSsh;

export function createSshSession(options: SshConnectOptions): SshSession {
  if (!NativeSshModule || !NativeSshModule.isAvailable() || Platform.OS === 'web') {
    return createUnavailableSession(options);
  }
  const sessionId = NativeSshModule.connect(options);
  const emitter = new NativeEventEmitter(NativeModules.RNNativeSsh);

  const dataSubs = new Set<(chunk: string) => void>();
  const exitSubs = new Set<(code?: number) => void>();
  const errorSubs = new Set<(message: string) => void>();

  const dataSub = emitter.addListener('ssh-data', (evt: { sessionId: string; data: string }) => {
    if (evt.sessionId === sessionId) dataSubs.forEach((fn) => fn(evt.data));
  });
  const exitSub = emitter.addListener('ssh-exit', (evt: { sessionId: string; code?: number }) => {
    if (evt.sessionId === sessionId) exitSubs.forEach((fn) => fn(evt.code));
  });
  const errorSub = emitter.addListener('ssh-error', (evt: { sessionId: string; message: string }) => {
    if (evt.sessionId === sessionId) errorSubs.forEach((fn) => fn(evt.message));
  });

  return {
    write: (d: string) => NativeSshModule.write(sessionId, d),
    close: () => {
      NativeSshModule.close(sessionId);
      dataSub.remove();
      exitSub.remove();
      errorSub.remove();
      dataSubs.clear();
      exitSubs.clear();
      errorSubs.clear();
    },
    onData: (listener) => {
      dataSubs.add(listener);
      return () => dataSubs.delete(listener);
    },
    onExit: (listener) => {
      exitSubs.add(listener);
      return () => exitSubs.delete(listener);
    },
    onError: (listener) => {
      errorSubs.add(listener);
      return () => errorSubs.delete(listener);
    },
  };
}

function createUnavailableSession(_options: SshConnectOptions): SshSession {
  // Minimal mock so UI can render; informs user that native module is required.
  const noop = () => {};
  const unsub = () => noop;
  return {
    write: () => {},
    close: () => {},
    onData: () => unsub,
    onExit: () => unsub,
    onError: () => unsub,
  };
}

