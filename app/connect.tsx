import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/Themed';
import { useSettings } from '@/context/SettingsContext';
import { normalizeBaseUrl } from '@/constants/config';

export default function ConnectScreen() {
  const router = useRouter();
  const { agentBaseUrl, setAgentBaseUrl, testConnection, testing, recentAgents, removeRecent } = useSettings();
  const [url, setUrl] = useState(agentBaseUrl ?? 'http://');
  const valid = useMemo(() => /^(https?:\/\/)?[\w.-]+(\.[\w.-]+)*(:\d+)?$/.test(url.trim()), [url]);
  useEffect(() => {
    if (agentBaseUrl) setUrl(agentBaseUrl);
  }, [agentBaseUrl]);

  async function onTestAndSave() {
    const n = normalizeBaseUrl(url);
    const res = await testConnection(n);
    if (res.ok) {
      await setAgentBaseUrl(n);
      Alert.alert('Connected', `Agent reachable at ${n}`);
      router.replace('/run/new');
    } else {
      let msg = 'Unable to reach agent';
      if (res.kind === 'timeout') msg = 'Timed out. Check LAN IP and port 8080.';
      else if (res.kind === 'network') msg = 'Network error. Ensure phone and laptop are on the same network.';
      else if (res.kind === 'not_found') msg = 'Reachable but unexpected path (404). URL is likely correct.';
      Alert.alert('Connection failed', msg);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={styles.container}>
      <Text style={styles.title}>Connect to Agent</Text>
      <Text style={styles.label}>Agent URL</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder="http://<LAN-IP>:8080"
        value={url}
        onChangeText={setUrl}
        style={styles.input}
      />
      <Text style={styles.help}>Tip: Use your laptop's LAN IP (e.g., 192.168.1.5:8080).</Text>

      <TouchableOpacity disabled={!valid || testing} onPress={onTestAndSave} style={[styles.button, (!valid || testing) && styles.buttonDisabled]}>
        <Text style={styles.buttonText}>{testing ? 'Testing...' : 'Test & Save'}</Text>
      </TouchableOpacity>

      {recentAgents.length > 0 && (
        <View style={styles.recents}>
          <Text style={styles.recentsTitle}>Recent agents</Text>
          <View style={styles.chips}>
            {recentAgents.map((r) => (
              <TouchableOpacity key={r} style={styles.chip} onPress={() => setUrl(r)} onLongPress={() => removeRecent(r)}>
                <Text style={styles.chipText}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 8, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 12 },
  label: { fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  help: { fontSize: 12, opacity: 0.8, marginBottom: 12 },
  button: { backgroundColor: '#2f95dc', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '600' },
  recents: { marginTop: 20 },
  recentsTitle: { fontWeight: '600', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#eee', borderRadius: 999 },
  chipText: { fontSize: 12 },
});

