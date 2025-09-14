import React from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View as RNView } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { useHosts } from '@/context/HostsContext';

export default function WelcomeScreen() {
  const router = useRouter();
  const { hosts, remove } = useHosts();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Remote Terminal</Text>
      <Text style={styles.subtitle}>Connect to your computer over LAN and use the terminal from your phone.</Text>

      <TouchableOpacity style={styles.primary} onPress={() => router.push('/terminal')}>
        <Text style={styles.primaryText}>Connect to Computer</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() =>
          Alert.alert(
            'Find your computer IP',
            'macOS/Linux: open Wi‑Fi details or run ifconfig.\nWindows: run ipconfig and use the IPv4 address.\nTypical ranges: 192.168.x.x, 10.x.x.x, 172.16–31.x.x'
          )
        }
      >
        <Text style={styles.helpLink}>How to find my IP</Text>
      </TouchableOpacity>

      <RNView style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Saved Hosts</Text>
        <Text style={styles.sectionHint}>(tap to quick connect, long-press to remove)</Text>
      </RNView>
      <FlatList
        data={hosts}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No saved hosts yet.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.hostItem}
            onPress={() =>
              router.push({ pathname: '/terminal', params: { host: item.host, port: String(item.port), username: item.username } } as any)
            }
            onLongPress={() =>
              Alert.alert('Remove saved host?', `${item.alias ?? item.host}`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => remove(item.id) },
              ])
            }
          >
            <Text style={styles.hostTitle}>{item.alias ?? item.host}</Text>
            <Text style={styles.hostSub}>
              {item.username}@{item.host}:{item.port}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { opacity: 0.8 },
  helpLink: { color: '#2f95dc', marginTop: 6 },
  primary: { backgroundColor: '#2f95dc', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  primaryText: { color: '#fff', fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  sectionHint: { fontSize: 12, opacity: 0.7 },
  hostItem: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ccc' },
  hostTitle: { fontWeight: '600' },
  hostSub: { fontSize: 12, opacity: 0.8 },
  empty: { opacity: 0.7, marginTop: 8 },
});
