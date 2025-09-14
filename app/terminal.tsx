import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View as RNView, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, View, TextInput } from '@/components/Themed';
import { isNativeSshAvailable } from '@/lib/nativeSsh';
import { useLocalSearchParams } from 'expo-router';
import { useHosts } from '@/context/HostsContext';
import { setSavedPassword } from '@/storage/hosts';
import { testBridge } from '@/lib/bridge';

export default function TerminalConnectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ host?: string; port?: string; username?: string }>();
  const [host, setHost] = useState(params.host ?? '');
  const [port, setPort] = useState(params.port ?? '22');
  const [username, setUsername] = useState(params.username ?? '');
  const [password, setPassword] = useState('');
  const [useDirect, setUseDirect] = useState(isNativeSshAvailable());
  const [bridgeUrl, setBridgeUrl] = useState('ws://localhost:8080/ws/ssh');
  const [alias, setAlias] = useState('');
  const [saveHost, setSaveHost] = useState(true);
  const [savePwd, setSavePwd] = useState(false);
  const [testingBridge, setTestingBridge] = useState(false);
  const { add: addHost } = useHosts();

  const valid = useMemo(() => host.trim().length > 0 && username.trim().length > 0 && password.length > 0 && /^\d+$/.test(port), [host, port, username, password]);

  useEffect(() => {
    if (params?.host) setHost(String(params.host));
    if (params?.port) setPort(String(params.port));
    if (params?.username) setUsername(String(params.username));
  }, [params.host, params.port, params.username]);

  async function onConnect() {
    if (!valid) return;
    const base = {
      host: host.trim(),
      port: port.trim(),
      username: username.trim(),
      password,
    };
    if (!useDirect) {
      // Soft preflight: ensure WS URL shape is correct
      if (!/^wss?:\/\//.test(bridgeUrl.trim())) {
        Alert.alert('Invalid Bridge URL', 'Use ws://<IP>:<port>/ws/ssh');
        return;
      }
    }
    if (saveHost) {
      const saved = await addHost({ alias: alias.trim() || undefined, host: base.host, port: Number(base.port) || 22, username: base.username });
      if (savePwd) await setSavedPassword(saved.id, password);
    }
    if (useDirect) {
      router.push({ pathname: '/terminal/native-session', params: base } as any);
    } else {
      router.push({ pathname: '/terminal/session', params: { ...base, bridgeUrl: bridgeUrl.trim() } } as any);
    }
  }

  async function onTestBridge() {
    const url = bridgeUrl.trim();
    if (!/^wss?:\/\//.test(url)) {
      Alert.alert('Invalid URL', 'Bridge WebSocket URL must start with ws:// or wss://');
      return;
    }
    setTestingBridge(true);
    try {
      const res = await testBridge(url, 4000);
      if (res.httpOk && res.wsOk) Alert.alert('Bridge OK', 'HTTP and WebSocket checks passed.');
      else if (!res.httpOk) Alert.alert('Bridge HTTP failed', res.message || 'Cannot reach bridge HTTP endpoint.');
      else Alert.alert('Bridge WS failed', res.message || 'WebSocket failed to open.');
    } catch (e: any) {
      Alert.alert('Bridge test error', e?.message || 'Unknown error');
    } finally {
      setTestingBridge(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={styles.container}>
      <Text style={styles.title}>SSH Terminal</Text>
      <Text style={styles.label}>SSH Host</Text>
      <TextInput placeholder="example.com" value={host} onChangeText={setHost} autoCapitalize="none" autoCorrect={false} style={styles.input} />

      <Text style={styles.label}>Port</Text>
      <TextInput placeholder="22" value={port} onChangeText={setPort} keyboardType="number-pad" style={styles.input} />

      <Text style={styles.label}>Username</Text>
      <TextInput placeholder="user" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} style={styles.input} />

      <Text style={styles.label}>Password</Text>
      <TextInput placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />

      <RNView style={styles.row}>
        <Text style={{ fontWeight: '500', flex: 1 }}>Use Direct SSH (no agent)</Text>
        <Switch value={useDirect} onValueChange={setUseDirect} />
      </RNView>
      {!useDirect && (
        <>
          <Text style={styles.help}>Bridge WebSocket URL (agent):</Text>
          <TextInput placeholder="ws://localhost:8080/ws/ssh" value={bridgeUrl} onChangeText={setBridgeUrl} autoCapitalize="none" autoCorrect={false} style={styles.input} />
          <TouchableOpacity onPress={onTestBridge} style={[styles.buttonSecondary, testingBridge && styles.buttonDisabled]}>
            <Text style={styles.buttonSecondaryText}>{testingBridge ? 'Testing…' : 'Test Bridge'}</Text>
          </TouchableOpacity>
        </>
      )}

      <Text style={styles.label}>Alias (optional)</Text>
      <TextInput placeholder="My Laptop" value={alias} onChangeText={setAlias} style={styles.input} />

      <RNView style={styles.row}>
        <Text style={{ fontWeight: '500', flex: 1 }}>Save to Saved Hosts</Text>
        <Switch value={saveHost} onValueChange={setSaveHost} />
      </RNView>
      <RNView style={styles.row}>
        <Text style={{ fontWeight: '500', flex: 1 }}>Save password (secure)</Text>
        <Switch value={savePwd} onValueChange={setSavePwd} />
      </RNView>

      <TouchableOpacity disabled={!valid} onPress={onConnect} style={[styles.button, !valid && styles.buttonDisabled]}>
        <Text style={styles.buttonText}>Connect</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 8 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 12 },
  label: { fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  help: { fontSize: 12, opacity: 0.8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  button: { backgroundColor: '#2f95dc', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '600' },
  buttonSecondary: { backgroundColor: '#1f2937', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonSecondaryText: { color: '#fff' },
});
