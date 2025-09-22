import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useSTTConfig } from '../contexts/STTConfigContext';
import { useAuth } from '../contexts/AuthContext';

interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  audioUri: string | null;
  rmsLevel: number;
  error: string | null;
}

interface VoiceInputControllerProps {
  onTranscriptionReceived: (text: string) => void;
  style?: any;
  buttonStyle?: any;
  iconSize?: number;
  iconColor?: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const VoiceInputController: React.FC<VoiceInputControllerProps> = ({
  onTranscriptionReceived,
  style,
  buttonStyle,
  iconSize = 20,
  iconColor = '#8B5CF6',
}) => {
  const { config: sttConfig } = useSTTConfig();
  const { user } = useAuth();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recorderState, setRecorderState] = useState<RecorderState>({
    isRecording: false,
    isPaused: false,
    audioUri: null,
    rmsLevel: 0,
    error: null,
  });

  const animatedValue = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync().catch(console.error);
      }
    };
  }, [recording]);

  const setupAudioMode = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    } catch (error) {
      console.error('Failed to setup audio mode:', error);
      throw error;
    }
  };

  const startPulseAnimation = () => {
    pulseAnimation.current = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.current.start();
  };

  const stopPulseAnimation = () => {
    if (pulseAnimation.current) {
      pulseAnimation.current.stop();
      animatedValue.setValue(0);
    }
  };

  const startRecording = async () => {
    try {
      await setupAudioMode();

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setRecorderState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        error: null,
      }));

      startPulseAnimation();
    } catch (error) {
      console.error('Failed to start recording:', error);
      setRecorderState(prev => ({
        ...prev,
        error: 'Failed to start recording. Please check microphone permissions.',
      }));
    }
  };

  const pauseRecording = async () => {
    if (recording && recorderState.isRecording) {
      try {
        await recording.pauseAsync();
        setRecorderState(prev => ({ ...prev, isPaused: true }));
        stopPulseAnimation();
      } catch (error) {
        console.error('Failed to pause recording:', error);
      }
    }
  };

  const resumeRecording = async () => {
    if (recording && recorderState.isPaused) {
      try {
        await recording.startAsync();
        setRecorderState(prev => ({ ...prev, isPaused: false }));
        startPulseAnimation();
      } catch (error) {
        console.error('Failed to resume recording:', error);
      }
    }
  };

  const stopRecording = async (): Promise<string | null> => {
    if (!recording) return null;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      stopPulseAnimation();

      setRecorderState(prev => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        audioUri: uri,
      }));

      setRecording(null);
      return uri;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return null;
    }
  };

  const handleComplete = async () => {
    setIsTranscribing(true);

    try {
      let audioUri: string | null = null;

      if (recorderState.isRecording) {
        audioUri = await stopRecording();
      } else if (recorderState.audioUri) {
        audioUri = recorderState.audioUri;
      }

      if (!audioUri) {
        throw new Error('No audio recording available');
      }

      const text = await transcribeAudio(audioUri);
      onTranscriptionReceived(text);
      handleClose();
    } catch (error) {
      console.error('Transcription failed:', error);
      Alert.alert(
        'Transcription Failed',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const transcribeAudio = async (audioUri: string): Promise<string> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Convert recording to the format needed by the API
      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        name: 'recording.m4a',
        type: 'audio/m4a',
      } as any);

      let endpoint = '/api/transcribe'; // Default to OpenAI

      if (sttConfig.provider === 'elevenlabs') {
        endpoint = '/api/elevenlabs-transcribe';
        formData.append('model_id', 'scribe_v1');
        formData.append('diarize', 'false');
        formData.append('tag_audio_events', 'true');
      }

      // Get auth header (assuming similar to web version)
      const authHeaders: Record<string, string> = {};
      if (user.id) {
        authHeaders['Authorization'] = `Bearer ${user.id}`;
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}${endpoint}`, {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return result.text || 'No transcription available';
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  };

  const handleCancel = async () => {
    if (recorderState.isRecording && recording) {
      await recording.stopAndUnloadAsync();
      setRecording(null);
    }
    handleClose();
  };

  const handleClose = () => {
    setIsModalVisible(false);
    setRecorderState({
      isRecording: false,
      isPaused: false,
      audioUri: null,
      rmsLevel: 0,
      error: null,
    });
    stopPulseAnimation();
  };

  const WaveformVisualizer: React.FC<{ isActive: boolean }> = ({ isActive }) => {
    const bars = Array.from({ length: 5 }, (_, i) => {
      const animatedHeight = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [4, Math.random() * 40 + 8],
      });

      return (
        <Animated.View
          key={i}
          style={[
            styles.waveBar,
            {
              height: isActive ? animatedHeight : 4,
              opacity: isActive ? 1 : 0.3,
            },
          ]}
        />
      );
    });

    return <View style={styles.waveformContainer}>{bars}</View>;
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.voiceButton, buttonStyle]}
        onPress={() => setIsModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="mic" size={iconSize} color={iconColor} />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {recorderState.error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{recorderState.error}</Text>
              </View>
            )}

            <View style={styles.visualizerContainer}>
              <WaveformVisualizer
                isActive={recorderState.isRecording && !recorderState.isPaused}
              />

              <Text style={styles.statusText}>
                {recorderState.isRecording
                  ? recorderState.isPaused
                    ? 'Recording paused'
                    : 'Recording...'
                  : 'Ready to record'}
              </Text>

              {sttConfig.showProviderInUI && (
                <Text style={styles.providerText}>
                  Using {sttConfig.provider === 'elevenlabs' ? 'ElevenLabs Scribe' : 'OpenAI Whisper'}
                </Text>
              )}
            </View>

            <View style={styles.controlsContainer}>
              {!recorderState.isRecording && (
                <TouchableOpacity style={styles.startButton} onPress={startRecording}>
                  <Text style={styles.buttonText}>Start</Text>
                </TouchableOpacity>
              )}

              {recorderState.isRecording && !recorderState.isPaused && (
                <TouchableOpacity style={styles.pauseButton} onPress={pauseRecording}>
                  <Text style={styles.buttonText}>Pause</Text>
                </TouchableOpacity>
              )}

              {recorderState.isRecording && recorderState.isPaused && (
                <TouchableOpacity style={styles.resumeButton} onPress={resumeRecording}>
                  <Text style={styles.buttonText}>Resume</Text>
                </TouchableOpacity>
              )}

              {recorderState.isRecording && (
                <>
                  <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
                    <Text style={styles.buttonText}>✓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                    <Text style={styles.buttonText}>✕</Text>
                  </TouchableOpacity>
                </>
              )}

              {!recorderState.isRecording && (
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                  <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {isTranscribing && (
          <View style={styles.transcribingOverlay}>
            <View style={styles.transcribingContainer}>
              <Text style={styles.transcribingText}>Transcribing audio...</Text>
            </View>
          </View>
        )}
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  voiceButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    minHeight: 300,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
  },
  visualizerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 48,
    marginBottom: 16,
  },
  waveBar: {
    width: 4,
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
    marginHorizontal: 2,
  },
  statusText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  providerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  startButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pauseButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resumeButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  completeButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  transcribingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transcribingContainer: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  transcribingText: {
    fontSize: 16,
    color: '#374151',
  },
});

export default VoiceInputController;