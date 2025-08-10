"use client";

import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "../../contexts/LanguageContext";
import LoginPage from "../components/LoginPage";

export default function SpeechDemoPage() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

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
      <h1 className="text-2xl font-semibold mb-2">{t.speech.title}</h1>
      <p className="text-gray-600 mb-6">{t.speech.description}</p>
      <div className="p-4 border rounded-lg">
        <p>Speech to text feature is in development...</p>
      </div>
    </div>
  );
}


