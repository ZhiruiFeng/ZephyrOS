"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface UseAudioRecorderOptions {
  preferredMimeTypes?: string[]; // e.g. ["audio/webm;codecs=opus", "audio/mp4", "audio/wav"]
  timeSliceMs?: number; // chunking for ondataavailable; 0 means only at stop
}

export interface UseAudioRecorderResult {
  isSupported: boolean;
  isRecording: boolean;
  mimeType: string | null;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<Blob | null>;
  reset: () => void;
}

export function useAudioRecorder(options?: UseAudioRecorderOptions): UseAudioRecorderResult {
  const { preferredMimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/wav"], timeSliceMs = 0 } = options || {};

  const [isSupported, setIsSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    setIsSupported(typeof window !== "undefined" && !!window.MediaRecorder);
  }, []);

  const pickMimeType = useCallback(() => {
    if (!window.MediaRecorder) return null;
    for (const type of preferredMimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return ""; // let browser decide
  }, [preferredMimeTypes]);

  const start = useCallback(async () => {
    setError(null);
    if (!isSupported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { noiseSuppression: true, echoCancellation: true } });
      mediaStreamRef.current = stream;

      const type = pickMimeType();
      const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      recorderRef.current = recorder;
      setMimeType(type || recorder.mimeType || null);

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstart = () => setIsRecording(true);
      recorder.onstop = () => setIsRecording(false);
      recorder.onerror = (e) => setError((e as any)?.error?.name || "recorder_error");

      recorder.start(timeSliceMs);
    } catch (e: any) {
      setError(e?.message || "microphone_denied");
    }
  }, [isSupported, pickMimeType, timeSliceMs]);

  const stop = useCallback(async () => {
    if (!recorderRef.current) return null;
    return new Promise<Blob | null>((resolve) => {
      const recorder = recorderRef.current!;
      recorder.onstop = () => {
        setIsRecording(false);
        const blob = new Blob(chunksRef.current, { type: mimeType || undefined });
        chunksRef.current = [];
        resolve(blob);
        // cleanup stream tracks
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        recorderRef.current = null;
      };
      try {
        recorder.stop();
      } catch {
        resolve(null);
      }
    });
  }, [mimeType]);

  const reset = useCallback(() => {
    chunksRef.current = [];
    setError(null);
  }, []);

  return useMemo(
    () => ({ isSupported, isRecording, mimeType, error, start, stop, reset }),
    [isSupported, isRecording, mimeType, error, start, stop, reset]
  );
}


