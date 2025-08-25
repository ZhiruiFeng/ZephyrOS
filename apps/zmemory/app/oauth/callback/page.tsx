"use client"

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function OAuthCallbackContent() {
  const params = useSearchParams()
  const code = params.get('code')
  const state = params.get('state')
  const error = params.get('error')
  const errorDescription = params.get('error_description')
  
  const [copied, setCopied] = React.useState(false)

  const handleCopyCode = async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = code
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Error case
  if (error) {
    return (
      <div style={{ 
        maxWidth: 520, 
        margin: '4rem auto', 
        padding: 24, 
        border: '1px solid #ef4444', 
        borderRadius: 12, 
        fontFamily: 'system-ui, -apple-system',
        backgroundColor: '#fef2f2'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 24, color: '#ef4444', marginRight: 8 }}>❌</div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#dc2626', margin: 0 }}>授权失败</h1>
        </div>
        
        <div style={{ color: '#dc2626', fontSize: 14, marginBottom: 12 }}>
          <strong>错误：</strong>{error}
        </div>
        {errorDescription && (
          <div style={{ color: '#7f1d1d', fontSize: 13, marginBottom: 16 }}>
            {errorDescription}
          </div>
        )}
        
        <div style={{ color: '#374151', fontSize: 13 }}>
          请返回应用程序重新尝试授权流程。
        </div>
      </div>
    )
  }

  // No code case
  if (!code) {
    return (
      <div style={{ 
        maxWidth: 520, 
        margin: '4rem auto', 
        padding: 24, 
        border: '1px solid #f59e0b', 
        borderRadius: 12, 
        fontFamily: 'system-ui, -apple-system',
        backgroundColor: '#fffbeb'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 24, color: '#f59e0b', marginRight: 8 }}>⚠️</div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#d97706', margin: 0 }}>授权码缺失</h1>
        </div>
        
        <div style={{ color: '#92400e', fontSize: 14, marginBottom: 16 }}>
          未找到授权码。这通常意味着：
        </div>
        <ul style={{ color: '#92400e', fontSize: 13, marginBottom: 16, paddingLeft: 20 }}>
          <li>授权流程未完成</li>
          <li>URL 参数被修改</li>
          <li>授权码已过期</li>
        </ul>
        
        <div style={{ color: '#374151', fontSize: 13 }}>
          请返回应用程序重新开始授权流程。
        </div>
      </div>
    )
  }

  // Success case
  return (
    <div style={{ 
      maxWidth: 520, 
      margin: '4rem auto', 
      padding: 24, 
      border: '1px solid #10b981', 
      borderRadius: 12, 
      fontFamily: 'system-ui, -apple-system',
      backgroundColor: '#f0fdf4'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 24, color: '#10b981', marginRight: 8 }}>✅</div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#065f46', margin: 0 }}>授权成功！</h1>
      </div>
      
      <div style={{ color: '#065f46', fontSize: 14, marginBottom: 20 }}>
        您已成功授权访问 ZephyrOS。请复制下面的授权码：
      </div>
      
      <div style={{ 
        backgroundColor: '#ffffff', 
        border: '2px solid #d1d5db', 
        borderRadius: 8, 
        padding: 16, 
        marginBottom: 16,
        position: 'relative'
      }}>
        <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>授权码</div>
        <div style={{ 
          fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          fontSize: 13,
          color: '#111827',
          wordBreak: 'break-all',
          lineHeight: '1.5',
          marginBottom: 12
        }}>
          {code}
        </div>
        
        <button
          onClick={handleCopyCode}
          style={{ 
            width: '100%',
            padding: '10px 16px', 
            backgroundColor: copied ? '#10b981' : '#111827',
            color: '#ffffff', 
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => {
            if (!copied) e.currentTarget.style.backgroundColor = '#374151'
          }}
          onMouseOut={(e) => {
            if (!copied) e.currentTarget.style.backgroundColor = '#111827'
          }}
        >
          {copied ? '✓ 已复制!' : '📋 复制授权码'}
        </button>
      </div>
      
      {state && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>状态参数</div>
          <div style={{ 
            fontSize: 11, 
            color: '#374151', 
            backgroundColor: '#f9fafb',
            padding: 8,
            borderRadius: 4,
            fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            wordBreak: 'break-all'
          }}>
            {state}
          </div>
        </div>
      )}
      
      <div style={{ 
        backgroundColor: '#e0f2fe', 
        border: '1px solid #0284c7', 
        borderRadius: 6, 
        padding: 12, 
        marginBottom: 16
      }}>
        <div style={{ color: '#0c4a6e', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
          📝 下一步
        </div>
        <div style={{ color: '#075985', fontSize: 12, lineHeight: '1.4' }}>
          1. 复制上面的授权码<br/>
          2. 返回到 Claude 或您的应用程序<br/>
          3. 使用授权码完成认证流程
        </div>
      </div>
      
      <div style={{ 
        color: '#6b7280', 
        fontSize: 11, 
        textAlign: 'center',
        borderTop: '1px solid #e5e7eb',
        paddingTop: 12
      }}>
        此授权码将在 10 分钟后过期，但生成的访问令牌有效期为 8 小时
      </div>
    </div>
  )
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        maxWidth: 520, 
        margin: '4rem auto', 
        padding: 24, 
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system'
      }}>
        Loading...
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  )
}