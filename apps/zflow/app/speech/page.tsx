"use client";

import React from "react";
import BatchTranscriber from "./components/BatchTranscriber";

export default function SpeechDemoPage() {
  return (
    <div className="py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">语音转文字（批量回退版）</h1>
      <p className="text-gray-600 mb-6">不存音频，仅用于快速输入文本。默认使用 OpenAI gpt-4o-mini-transcribe。</p>
      <BatchTranscriber />
    </div>
  );
}


