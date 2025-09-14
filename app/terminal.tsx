import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View as RNView, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, View, TextInput } from '@/components/Themed';
import { isNativeSshAvailable } from '@/lib/nativeSsh';
import { useLocalSearchParams } from 'expo-router';

export default function TerminalConnectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ host?: string; port?: string; username?: string }>();
  const [host, setHost] = useState(params.host ?? '');
  const [port, setPort] = useState(params.port ?? '22');
  const [username, setUsername] = useState(params.username ?? '');
  const [password, setPassword] = useState('');
  const [useDirect, setUseDirect] = useState(isNativeSshAvailable());
  const [bridgeUrl, setBridgeUrl] = useState('ws://localhost:8080/ws/ssh');

  const valid = useMemo(() => host.trim().length > 0 && username.trim().length > 0 && password.length > 0 && /^\d+$/.test(port), [host, port, username, password]);

  useEffect(() => {
    if (params?.host) setHost(String(params.host));
    if (params?.port) setPort(String(params.port));
    if (params?.username) setUsername(String(params.username));
  }, [params.host, params.port, params.username]);

  function onConnect() {
    if (!valid) return;
    const base = {
      host: host.trim(),
      port: port.trim(),
      username: username.trim(),
      password,
    };
    if (useDirect) {
      router.push({ pathname: '/terminal/native-session', params: base } as any);
    } else {
      router.push({ pathname: '/terminal/session', params: { ...base, bridgeUrl: bridgeUrl.trim() } } as any);
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
        </>
      )}

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
});
