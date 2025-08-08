// Environment validation and setup helper

export interface EnvironmentStatus {
  isConfigured: boolean;
  missing: string[];
  mode: 'production' | 'development' | 'mock';
  recommendations: string[];
}

export function checkEnvironment(): EnvironmentStatus {
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  const isConfigured = missing.length === 0;

  let mode: 'production' | 'development' | 'mock' = 'mock';
  const recommendations: string[] = [];

  if (isConfigured) {
    mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
  } else {
    recommendations.push(
      'Configure Supabase environment variables for full functionality',
      'Copy .env.example to .env.local and fill in your Supabase credentials',
      'Get credentials from: https://supabase.com/dashboard/project/[your-project]/settings/api'
    );
  }

  return {
    isConfigured,
    missing,
    mode,
    recommendations
  };
}

export function logEnvironmentStatus(): void {
  const status = checkEnvironment();
  
  console.log('\n🔧 ZMemory API Environment Status:');
  console.log(`   Mode: ${status.mode.toUpperCase()}`);
  
  if (status.isConfigured) {
    console.log('   ✅ Supabase configured - Full functionality available');
  } else {
    console.log('   ⚠️  Running in mock mode - Limited functionality');
    console.log('   Missing environment variables:', status.missing.join(', '));
    
    if (status.recommendations.length > 0) {
      console.log('\n📋 Setup recommendations:');
      status.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }
  }
  
  console.log(`   Health check: http://localhost:3001/api/health`);
  console.log(`   API docs: http://localhost:3001/api/docs`);
  console.log('');
}