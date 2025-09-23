#!/usr/bin/env node

// Debug: Validate ZMemory API key against Supabase RPC without printing secrets
// Usage: ZM_API_KEY=<your_key> node scripts/check-api-key-auth.js

const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');

(async () => {
  try {
    // 1) Load env from apps/zmemory/.env.local (relative to this script)
    const appEnvPath = path.join(__dirname, '..', '.env.local');
    const rootEnvPath = path.join(__dirname, '..', '..', '..', '.env.local');
    if (fs.existsSync(appEnvPath)) {
      require('dotenv').config({ path: appEnvPath });
      console.log('✅ Loaded env from apps/zmemory/.env.local');
    } else if (fs.existsSync(rootEnvPath)) {
      require('dotenv').config({ path: rootEnvPath });
      console.log('✅ Loaded env from repo root .env.local');
    } else {
      console.log('ℹ️  No .env.local found; relying on process env');
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      process.exit(2);
    }

    const apiKey = process.env.ZM_API_KEY;
    if (!apiKey) {
      console.error('❌ ZM_API_KEY env var not set');
      process.exit(3);
    }

    // 2) Hash the API key (hex SHA-256)
    const hash = createHash('sha256').update(apiKey, 'utf8').digest('hex');

    // 3) Call Supabase RPC using service role key
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase.rpc('authenticate_zmemory_api_key', {
      api_key_hash: hash,
    });

    if (error) {
      console.error('❌ RPC error:', { message: error.message, code: error.code });
      process.exit(4);
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      console.log('🔒 No matching key found (or inactive/expired).');
      process.exit(0);
    }

    const row = Array.isArray(data) ? data[0] : data;
    const safe = {
      found: true,
      user_id: row.user_id,
      key_id: row.key_id,
      scopes_count: Array.isArray(row.scopes) ? row.scopes.length : 0,
    };
    console.log('✅ API key authenticated:', safe);
    process.exit(0);
  } catch (err) {
    console.error('❌ Unexpected error:', err?.message || err);
    process.exit(1);
  }
})();
