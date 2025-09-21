import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Surface, useTheme } from 'react-native-paper';

export default function FocusScreen() {
  return (
    <Surface style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Focus</Text>
        <Text style={styles.subtitle}>Work sessions and time tracking</Text>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    textAlign: 'center',
  },
});