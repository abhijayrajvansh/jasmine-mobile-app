import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';

export default function TerminalConnectScreen() {
  const router = useRouter();
  const [host, setHost] = useState('');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [bridgeUrl, setBridgeUrl] = useState('ws://localhost:8080/ws/ssh');

  const valid = useMemo(() => host.trim().length > 0 && username.trim().length > 0 && password.length > 0 && /^\d+$/.test(port), [host, port, username, password]);

  function onConnect() {
    if (!valid) return;
    router.push({
      // Cast to any to satisfy typed routes until expo-router regenerates types
      pathname: '/terminal/session',
      params: { host: host.trim(), port: port.trim(), username: username.trim(), password, bridgeUrl: bridgeUrl.trim() },
    } as any);
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

      <Text style={styles.help}>Bridge WebSocket URL (agent):</Text>
      <TextInput placeholder="ws://localhost:8080/ws/ssh" value={bridgeUrl} onChangeText={setBridgeUrl} autoCapitalize="none" autoCorrect={false} style={styles.input} />

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
  button: { backgroundColor: '#2f95dc', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
