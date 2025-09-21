// Test utility for verifying zmemory API integration
// This file can be used to test the connection during development

import { conversationHistoryService } from './service'
import { resolveZmemoryOrigin } from '../../../lib/api/zmemory-api-base'

export async function testZmemoryIntegration(userId: string) {
  console.log('🧪 Testing zmemory API integration...')
  
  try {
    // Test 1: Fetch conversations
    console.log('📋 Testing conversation list fetch...')
    const conversations = await conversationHistoryService.getUserConversations(userId, { limit: 5 })
    console.log(`✅ Found ${conversations.length} conversations`)
    
    // Test 2: Test stats endpoint
    console.log('📊 Testing stats fetch...')
    const stats = await conversationHistoryService.getConversationStats(userId)
    console.log(`✅ Stats: ${stats.totalConversations} total, ${stats.totalMessages} messages`)
    
    // Test 3: Test search (only if there are conversations)
    if (conversations.length > 0) {
      console.log('🔍 Testing search functionality...')
      const searchResults = await conversationHistoryService.searchConversations(userId, 'hello', 5)
      console.log(`✅ Search returned ${searchResults.length} results`)
    }
    
    // Test 4: Test conversation detail (only if there are conversations)
    if (conversations.length > 0) {
      console.log('📖 Testing conversation detail fetch...')
      const detail = await conversationHistoryService.getConversation(conversations[0].id, userId)
      if (detail) {
        console.log(`✅ Loaded conversation with ${detail.messages.length} messages`)
      } else {
        console.log('⚠️  No conversation detail found (might be normal)')
      }
    }
    
    console.log('🎉 All tests passed! Integration working correctly.')
    return true
    
  } catch (error) {
    console.error('❌ Integration test failed:', error)
    
    // Check if it's a network/connection error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.log('💡 Tip: Make sure zmemory API is running on the expected port')
      console.log('   Current API URL:', resolveZmemoryOrigin('http://localhost:3001') || 'http://localhost:3001')
    }
    
    return false
  }
}

// Simple connectivity test
export async function testZmemoryConnectivity() {
  const apiUrl = resolveZmemoryOrigin('http://localhost:3001') || 'http://localhost:3001'
  
  try {
    console.log(`🌐 Testing connection to ${apiUrl}...`)
    
    const response = await fetch(`${apiUrl}/api/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    })
    
    if (response.ok) {
      console.log('✅ Successfully connected to zmemory API')
      return true
    } else {
      console.log(`❌ API responded with status: ${response.status}`)
      return false
    }
    
  } catch (error) {
    console.log(`❌ Failed to connect to zmemory API: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return false
  }
}

// Usage example for development:
// 
// import { testZmemoryIntegration, testZmemoryConnectivity } from '@/lib/conversation-history/test-integration'
// 
// // Test connectivity first
// testZmemoryConnectivity()
// 
// // Then test full integration with a user ID
// testZmemoryIntegration('your-user-id-here')
