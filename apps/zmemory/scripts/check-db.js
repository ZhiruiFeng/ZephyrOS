#!/usr/bin/env node

// Database connection check script
const path = require('path');
const fs = require('fs');

// Try to load environment from local or root .env.local file
const localEnvPath = path.join(process.cwd(), '.env.local');
const rootEnvPath = path.join(process.cwd(), '../../.env.local');

if (fs.existsSync(localEnvPath)) {
  require('dotenv').config({ path: localEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  require('dotenv').config({ path: rootEnvPath });
} else {
  require('dotenv').config(); // fallback to default
}
const { createClient } = require('@supabase/supabase-js');

async function checkDatabase() {
  console.log('🔍 Database Connection Check\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase environment variables');
    return false;
  }

  console.log('✅ Environment variables found');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Key: ${supabaseKey.substring(0, 20)}...\n`);

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test basic connection
    console.log('🔗 Testing database connection...');
    const { data, error } = await supabase.from('memories').select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      console.log('❌ Database connection failed:');
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      console.log(`   Details: ${JSON.stringify(error.details, null, 2)}`);
      return false;
    }

    console.log('✅ Database connection successful');
    console.log(`   Total memories: ${data?.length || 0}\n`);

    // Test table structure
    console.log('📋 Checking table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('memories')
      .select('*')
      .limit(1);

    if (tableError) {
      console.log('❌ Table structure check failed:');
      console.log(`   Error: ${tableError.message}`);
      return false;
    }

    console.log('✅ Table structure is accessible');

    // Test insert operation
    console.log('📝 Testing insert operation...');
    const testMemory = {
      type: 'test',
      content: { message: 'Database test', timestamp: new Date().toISOString() },
      tags: ['test'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: insertedData, error: insertError } = await supabase
      .from('memories')
      .insert(testMemory)
      .select()
      .single();

    if (insertError) {
      console.log('❌ Insert operation failed:');
      console.log(`   Error: ${insertError.message}`);
      console.log(`   Code: ${insertError.code}`);
      console.log(`   Details: ${JSON.stringify(insertError.details, null, 2)}`);
      return false;
    }

    console.log('✅ Insert operation successful');
    console.log(`   Created memory ID: ${insertedData.id}`);

    // Clean up test data
    await supabase.from('memories').delete().eq('id', insertedData.id);
    console.log('🧹 Test data cleaned up\n');

    console.log('🎉 Database is fully functional!');
    return true;

  } catch (error) {
    console.log('❌ Unexpected error:');
    console.log(`   ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
    return false;
  }
}

if (require.main === module) {
  checkDatabase().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { checkDatabase };