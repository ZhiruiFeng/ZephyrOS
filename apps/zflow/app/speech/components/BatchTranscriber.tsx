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

      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
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
    <div className="space-y-4">
      {!isSupported && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          {t.speech.notSupported}
        </div>
      )}

      <div className="flex items-center gap-2">
        {!isRecording ? (
          <button
            type="button"
            onClick={start}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
          >
            <Mic size={18} /> {t.speech.startRecording}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStopAndTranscribe}
            className="inline-flex items-center gap-2 rounded-md bg-gray-700 px-3 py-2 text-white hover:bg-gray-800"
          >
            <Square size={18} /> {t.speech.stopRecording}
          </button>
        )}

        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-gray-700 hover:bg-gray-50"
        >
          <RotateCcw size={18} /> {t.speech.reset}
        </button>

        <div className="ml-auto flex items-center gap-2 text-sm">
          <label className="text-gray-600">{t.speech.language}</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="border rounded-md px-2 py-1">
            <option value="zh">{t.speech.chinese}</option>
            <option value="en">{t.speech.english}</option>
            <option value="auto">{t.speech.auto}</option>
          </select>
          <label className="text-gray-600 ml-3">{t.speech.model}</label>
          <select value={model} onChange={(e) => setModel(e.target.value)} className="border rounded-md px-2 py-1">
            <option value="whisper-1">whisper-1</option>
            <option value="gpt-4o-mini-transcribe">gpt-4o-mini-transcribe</option>
          </select>
        </div>
      </div>

      <div className="rounded-md border p-3 text-sm text-gray-800 min-h-[100px] whitespace-pre-wrap">
        {isRecording ? (
          <span className="text-gray-500">{t.speech.recording}</span>
        ) : isUploading ? (
          <span className="text-gray-500">{t.speech.transcribing}</span>
        ) : transcript ? (
          transcript
        ) : (
          <span className="text-gray-400">{t.speech.clickToStart}</span>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-2 text-xs text-yellow-800">
          {t.speech.recordingError}: {error}
        </div>
      )}
    </div>
  );
}


