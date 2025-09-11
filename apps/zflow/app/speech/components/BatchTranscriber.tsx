"use client";

import React from "react";
import { Mic, Square, RotateCcw, Upload } from "lucide-react";
import { useAudioRecorder } from "../../../hooks/useAudioRecorder";
import { useTranslation } from "../../../contexts/LanguageContext";

export default function BatchTranscriber() {
  const { isSupported, isRecording, error, start, stop, mimeType, reset } = useAudioRecorder();
  const { t } = useTranslation();
  const [transcript, setTranscript] = React.useState<string>("");
  const [isUploading, setIsUploading] = React.useState(false);
  const [language, setLanguage] = React.useState("zh");
  const [model, setModel] = React.useState("whisper-1");

  const handleStopAndTranscribe = async () => {
    const blob = await stop();
    if (!blob) return;
    setIsUploading(true);
    setTranscript("");
    try {
      const fd = new FormData();
      const file = new File([blob], `recording.${mimeType?.includes("mp4") ? "mp4" : mimeType?.includes("wav") ? "wav" : "webm"}`, { type: blob.type || mimeType || "application/octet-stream" });
      fd.append("file", file);
      fd.append("language", language);
      fd.append("model", model);

      const { getAuthHeader } = await import('../../../lib/supabase')
      const authHeaders = await getAuthHeader()
      const res = await fetch("/api/transcribe", { method: "POST", headers: authHeaders, body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`${data?.error || "transcribe_failed"}${data?.detail ? `: ${data.detail}` : ""}`);
      setTranscript(data.text || "");
    } catch (e: any) {
      alert(`${t.speech.transcribeError}: ${e?.message || e}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {!isSupported && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 shadow-sm">
          {t.speech.notSupported}
        </div>
      )}

      {/* Controls Section */}
      <div className="flex flex-col gap-4">
        {/* Main Controls */}
        <div className="flex items-center justify-center gap-4">
          {!isRecording ? (
            <button
              type="button"
              onClick={start}
              className="inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              <Mic size={20} /> {t.speech.startRecording}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStopAndTranscribe}
              className="inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              <Square size={20} /> {t.speech.stopRecording}
            </button>
          )}

          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-700 font-medium shadow-sm hover:bg-gray-50 hover:shadow-md transition-all duration-200"
          >
            <RotateCcw size={18} /> {t.speech.reset}
          </button>
        </div>

        {/* Settings Controls */}
        <div className="flex flex-wrap items-center justify-center gap-4 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">{t.speech.language}</label>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)} 
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="zh">{t.speech.chinese}</option>
              <option value="en">{t.speech.english}</option>
              <option value="auto">{t.speech.auto}</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">{t.speech.model}</label>
            <select 
              value={model} 
              onChange={(e) => setModel(e.target.value)} 
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="whisper-1">whisper-1</option>
              <option value="gpt-4o-mini-transcribe">gpt-4o-mini-transcribe</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transcript Display */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm min-h-[150px]">
        <div className="whitespace-pre-wrap text-gray-800">
          {isRecording ? (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="font-medium">{t.speech.recording}</span>
            </div>
          ) : isUploading ? (
            <div className="flex items-center gap-2 text-indigo-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
              <span className="font-medium">{t.speech.transcribing}</span>
            </div>
          ) : transcript ? (
            <div className="text-gray-900 leading-relaxed">{transcript}</div>
          ) : (
            <span className="text-gray-400 italic">{t.speech.clickToStart}</span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm">
          <strong>{t.speech.recordingError}:</strong> {error}
        </div>
      )}
    </div>
  );
}
