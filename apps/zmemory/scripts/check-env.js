#!/usr/bin/env node

// Environment check script for ZMemory API
// Run with: node scripts/check-env.js

const fs = require('fs');
const path = require('path');

function checkEnvironment() {
  console.log('🔧 ZMemory API Environment Check\n');

  // Check for .env.local files (local first, then root)
  const localEnvPath = path.join(process.cwd(), '.env.local');
  const rootEnvPath = path.join(process.cwd(), '../../.env.local');
  const envExamplePath = path.join(process.cwd(), '.env.example');

  let envPath = null;
  let envLocation = '';

  if (fs.existsSync(localEnvPath)) {
    envPath = localEnvPath;
    envLocation = 'local (.env.local)';
    console.log('✅ Found local .env.local file');
  } else if (fs.existsSync(rootEnvPath)) {
    envPath = rootEnvPath;
    envLocation = 'root (../../.env.local)';
    console.log('✅ Found root .env.local file');
  } else {
    console.log('❌ No .env.local file found');
    console.log('💡 Choose one of these options:');
    console.log('   Option 1: Create local env file: cp .env.example .env.local');
    console.log('   Option 2: Create symlink to root: ln -s ../../.env.local .env.local');
    console.log('   Option 3: Run in mock mode (no setup needed)\n');
    return false;
  }

  console.log(`   Using ${envLocation}`);

  // Load environment variables
  require('dotenv').config({ path: envPath });

  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missing = [];
  const configured = [];

  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      configured.push(varName);
    } else {
      missing.push(varName);
    }
  });

  if (configured.length > 0) {
    console.log('\n✅ Configured environment variables:');
    configured.forEach(varName => {
      const value = process.env[varName];
      const maskedValue = varName.includes('KEY') 
        ? `${value.substring(0, 8)}...` 
        : value;
      console.log(`   ${varName}=${maskedValue}`);
    });
  }

  if (missing.length > 0) {
    console.log('\n❌ Missing environment variables:');
    missing.forEach(varName => {
      console.log(`   ${varName}`);
    });

    console.log('\n📋 Setup instructions:');
    console.log('   1. Go to https://supabase.com/dashboard');
    console.log('   2. Create a new project or select existing project');
    console.log('   3. Go to Settings > API');
    console.log('   4. Copy Project URL and Service Role Key');
    console.log('   5. Update your .env.local file\n');

    return false;
  }

  console.log('\n🎉 Environment is fully configured!');
  console.log('\n🚀 Available endpoints:');
  console.log('   Health Check: http://localhost:3001/api/health');
  console.log('   API Docs:     http://localhost:3001/api/docs');
  console.log('   Memories API: http://localhost:3001/api/memories\n');

  return true;
}

if (require.main === module) {
  const isConfigured = checkEnvironment();
  process.exit(isConfigured ? 0 : 1);
}

module.exports = { checkEnvironment };