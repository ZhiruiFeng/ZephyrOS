"use client";

import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import LoginPage from "../components/LoginPage";

export default function SpeechDemoPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">语音转文字（批量回退版）</h1>
      <p className="text-gray-600 mb-6">不存音频，仅用于快速输入文本。默认使用 OpenAI gpt-4o-mini-transcribe。</p>
      <div className="p-4 border rounded-lg">
        <p>语音转文字功能正在开发中...</p>
      </div>
    </div>
  );
}


