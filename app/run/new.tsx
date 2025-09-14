import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';

export default function NewRunScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>New Run – Composer (stub)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 18 },
});

