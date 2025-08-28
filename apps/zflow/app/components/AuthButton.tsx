'use client'

import React from 'react'
import { useAuth } from '../../contexts/AuthContext'

export default function AuthButton() {
  const { user, signOut, loading } = useAuth()

  if (!user) return null

  return (
    <button
      onClick={signOut}
      disabled={loading}
      className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 disabled:opacity-50"
    >
      Sign out
    </button>
  )
}


