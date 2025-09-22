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
import { useNarrativeTheme, MOOD_SUGGESTIONS, ApiSeasonTheme } from '../../hooks/useNarrativeTheme';
import type { CreateEpisodeRequest } from '../../lib/api/narrative-api';

interface CreateEpisodeModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEpisodeRequest) => Promise<void>;
  seasonId: string;
  seasonTheme: ApiSeasonTheme;
}

export function CreateEpisodeModal({
  visible,
  onClose,
  onSubmit,
  seasonId,
  seasonTheme
}: CreateEpisodeModalProps) {
  const theme = useTheme();
  const { theme: seasonThemeConfig } = useNarrativeTheme(seasonTheme);
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    title: '',
    date_range_start: weekAgo,
    date_range_end: today,
    mood_emoji: '',
    reflection: '',
  });

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter an episode title');
      return;
    }

    if (new Date(formData.date_range_start) > new Date(formData.date_range_end)) {
      Alert.alert('Error', 'Start date cannot be later than end date');
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        season_id: seasonId,
        ...formData,
      });
      onClose();
      setFormData({
        title: '',
        date_range_start: weekAgo,
        date_range_end: today,
        mood_emoji: '',
        reflection: '',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to create episode. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderMoodOption = (mood: typeof MOOD_SUGGESTIONS[number]) => {
    const isSelected = formData.mood_emoji === mood.emoji;

    return (
      <TouchableOpacity
        key={mood.emoji}
        style={[
          styles.moodOption,
          {
            backgroundColor: isSelected ? seasonThemeConfig.colors.primary : theme.colors.surface,
            borderColor: isSelected ? seasonThemeConfig.colors.primary : theme.colors.outline,
          },
        ]}
        onPress={() => setFormData(prev => ({
          ...prev,
          mood_emoji: prev.mood_emoji === mood.emoji ? '' : mood.emoji
        }))}
      >
        <Text style={styles.moodEmoji}>{mood.emoji}</Text>
        <Text
          style={[
            styles.moodLabel,
            { color: isSelected ? '#fff' : theme.colors.onSurface },
          ]}
        >
          {mood.label}
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
            Create Episode
          </Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Title Input */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Episode Title
            </Text>
            <TextInput
              mode="outlined"
              placeholder="e.g., Learning React Native"
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              style={styles.input}
            />
          </View>

          {/* Date Range */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Date Range
            </Text>
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                  Start Date
                </Text>
                <TextInput
                  mode="outlined"
                  value={formData.date_range_start}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, date_range_start: text }))}
                  placeholder="YYYY-MM-DD"
                  style={styles.dateInput}
                />
              </View>
              <View style={styles.dateField}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                  End Date
                </Text>
                <TextInput
                  mode="outlined"
                  value={formData.date_range_end}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, date_range_end: text }))}
                  placeholder="YYYY-MM-DD"
                  style={styles.dateInput}
                />
              </View>
            </View>
          </View>

          {/* Mood Selection */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Mood (Optional)
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.moodScroll}
            >
              {MOOD_SUGGESTIONS.slice(0, 10).map(renderMoodOption)}
            </ScrollView>
          </View>

          {/* Reflection Input */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Reflection (Optional)
            </Text>
            <TextInput
              mode="outlined"
              placeholder="What happened during this episode? How did you feel? What did you learn?"
              value={formData.reflection}
              onChangeText={(text) => setFormData(prev => ({ ...prev, reflection: text }))}
              multiline
              numberOfLines={4}
              style={styles.input}
            />
          </View>

          {/* Preview */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Preview
            </Text>
            <View
              style={[
                styles.previewCard,
                {
                  backgroundColor: seasonThemeConfig.colors.background,
                  borderColor: seasonThemeConfig.colors.primary,
                }
              ]}
            >
              <View style={styles.previewHeader}>
                <View style={styles.previewTitleContainer}>
                  {formData.mood_emoji && (
                    <Text style={styles.previewMood}>{formData.mood_emoji}</Text>
                  )}
                  <Text
                    style={[
                      styles.previewTitle,
                      { color: seasonThemeConfig.colors.text }
                    ]}
                  >
                    {formData.title || 'Episode Title'}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.previewDate,
                    { color: seasonThemeConfig.colors.text }
                  ]}
                >
                  {formData.date_range_start === formData.date_range_end
                    ? formData.date_range_end
                    : `${formData.date_range_start} - ${formData.date_range_end}`
                  }
                </Text>
              </View>
              {formData.reflection && (
                <Text
                  style={[
                    styles.previewReflection,
                    { color: seasonThemeConfig.colors.text }
                  ]}
                >
                  {formData.reflection}
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
            style={[styles.button, { backgroundColor: seasonThemeConfig.colors.primary }]}
            loading={loading}
            disabled={loading}
          >
            Create Episode
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
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateField: {
    flex: 1,
  },
  dateInput: {
    fontSize: 14,
  },
  moodScroll: {
    marginBottom: 8,
  },
  moodOption: {
    padding: 8,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 60,
  },
  moodEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  previewCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  previewTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  previewMood: {
    fontSize: 20,
    marginRight: 12,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  previewDate: {
    fontSize: 12,
  },
  previewReflection: {
    fontSize: 14,
    lineHeight: 20,
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