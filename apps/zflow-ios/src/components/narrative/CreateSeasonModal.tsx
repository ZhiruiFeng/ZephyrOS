import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Surface,
  Text,
  TextInput,
  Button,
  useTheme,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNarrativeTheme, SEASON_THEMES, mapUIThemeToApi, UISeasonTheme } from '../../hooks/useNarrativeTheme';
import type { CreateSeasonRequest } from '../../lib/api/narrative-api';

interface CreateSeasonModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSeasonRequest) => Promise<void>;
}

export function CreateSeasonModal({ visible, onClose, onSubmit }: CreateSeasonModalProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{
    title: string;
    theme: UISeasonTheme;
    intention: string;
    start_date: string;
  }>({
    title: '',
    theme: 'spring',
    intention: '',
    start_date: new Date().toISOString().split('T')[0],
  });

  const { theme: selectedTheme } = useNarrativeTheme(formData.theme);

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a season title');
      return;
    }

    try {
      setLoading(true);
      // Convert UI theme to API theme
      const apiFormData: CreateSeasonRequest = {
        ...formData,
        theme: mapUIThemeToApi(formData.theme),
      };
      await onSubmit(apiFormData);
      onClose();
      setFormData({
        title: '',
        theme: 'spring',
        intention: '',
        start_date: new Date().toISOString().split('T')[0],
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to create season. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderThemeOption = (themeKey: typeof SEASON_THEMES[number]) => {
    const { theme: themeConfig } = useNarrativeTheme(themeKey);
    const isSelected = formData.theme === themeKey;

    return (
      <TouchableOpacity
        key={themeKey}
        style={[
          styles.themeOption,
          {
            borderColor: isSelected ? themeConfig.colors.primary : theme.colors.outline,
            backgroundColor: isSelected ? themeConfig.colors.background : theme.colors.surface,
          },
        ]}
        onPress={() => setFormData(prev => ({ ...prev, theme: themeKey }))}
      >
        <Text style={styles.themeEmoji}>{themeConfig.emoji}</Text>
        <Text
          style={[
            styles.themeName,
            { color: isSelected ? themeConfig.colors.text : theme.colors.onSurface },
          ]}
        >
          {themeConfig.name}
        </Text>
        <Text
          style={[
            styles.themeDescription,
            { color: isSelected ? themeConfig.colors.text : theme.colors.onSurfaceVariant },
          ]}
        >
          {themeConfig.description}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.outline }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
            Create New Season
          </Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Title Input */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Season Title
            </Text>
            <TextInput
              mode="outlined"
              placeholder="e.g., My Creative Summer"
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              style={styles.input}
            />
          </View>

          {/* Theme Selection */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Choose Your Theme
            </Text>
            <View style={styles.themeGrid}>
              {SEASON_THEMES.map(renderThemeOption)}
            </View>
          </View>

          {/* Intention Input */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Intention (Optional)
            </Text>
            <TextInput
              mode="outlined"
              placeholder="What do you hope to achieve this season?"
              value={formData.intention}
              onChangeText={(text) => setFormData(prev => ({ ...prev, intention: text }))}
              multiline
              numberOfLines={3}
              style={styles.input}
            />
          </View>

          {/* Preview Card */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Preview
            </Text>
            <View
              style={[
                styles.previewCard,
                {
                  backgroundColor: selectedTheme.colors.background,
                  borderColor: selectedTheme.colors.primary,
                }
              ]}
            >
              <View style={styles.previewHeader}>
                <Text style={styles.previewEmoji}>{selectedTheme.emoji}</Text>
                <View style={styles.previewText}>
                  <Text
                    style={[
                      styles.previewTitle,
                      { color: selectedTheme.colors.text }
                    ]}
                  >
                    {formData.title || 'Season Title'}
                  </Text>
                  <Text
                    style={[
                      styles.previewSubtitle,
                      { color: selectedTheme.colors.text }
                    ]}
                  >
                    {selectedTheme.description}
                  </Text>
                </View>
              </View>
              {formData.intention && (
                <Text
                  style={[
                    styles.previewIntention,
                    { color: selectedTheme.colors.text }
                  ]}
                >
                  "{formData.intention}"
                </Text>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: theme.colors.outline }]}>
          <Button
            mode="outlined"
            onPress={onClose}
            style={[styles.button, styles.cancelButton]}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            style={[styles.button, { backgroundColor: selectedTheme.colors.primary }]}
            loading={loading}
            disabled={loading}
          >
            Create Season
          </Button>
        </View>
      </Surface>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  input: {
    marginBottom: 8,
  },
  themeGrid: {
    gap: 12,
  },
  themeOption: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  themeEmoji: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 8,
  },
  themeName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  themeDescription: {
    fontSize: 14,
    textAlign: 'center',
  },
  previewCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  previewText: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewSubtitle: {
    fontSize: 14,
  },
  previewIntention: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
  },
  cancelButton: {
    marginRight: 8,
  },
});