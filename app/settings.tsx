import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/Themed';
import { useSettings } from '@/context/SettingsContext';

export default function SettingsScreen() {
  const { agentBaseUrl } = useSettings();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text>Agent URL: {agentBaseUrl ?? 'Not set'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
});
