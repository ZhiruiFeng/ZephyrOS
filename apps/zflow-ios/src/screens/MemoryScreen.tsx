import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Surface, useTheme } from 'react-native-paper';

export default function MemoryScreen() {
  return (
    <Surface style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Memory</Text>
        <Text style={styles.subtitle}>Your knowledge base and insights</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.comingSoon}>Coming Soon</Text>
        <Text style={styles.description}>Knowledge management and AI insights</Text>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  comingSoon: {
    fontSize: 20,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
});