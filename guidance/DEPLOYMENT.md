# ZephyrOS Deployment Guide

## Architecture Overview

ZephyrOS uses a modern frontend-backend separation architecture deployed on Vercel:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ZFlow App     │    │  ZMemory API    │    │   Supabase      │
│   (Frontend)    │    │  (Backend)      │    │   (Database)    │
│ Port: 3000      │    │ Port: 3001      │    │ PostgreSQL      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Vercel        │
                    │ (Edge Functions) │
                    └─────────────────┘
```

## Deployment Options

### Option 1: Unified Vercel Deployment (Recommended)

Deploy both ZFlow and ZMemory as a single Vercel project with multiple apps.

**Advantages:**
- Simplified deployment pipeline
- Shared environment variables
- Single domain with path-based routing
- Automatic HTTPS and CDN
- Cost-effective for development

**Project Structure:**
```
your-domain.vercel.app/          # ZFlow frontend
your-domain.vercel.app/api/      # ZMemory API routes
```

### Option 2: Separate Deployments

Deploy ZFlow and ZMemory as separate Vercel projects.

**Advantages:**
- Independent scaling
- Separate environment management
- Team-based access control
- Better for production scale

**Project Structure:**
```
zflow.your-domain.com/           # ZFlow frontend
api.your-domain.com/             # ZMemory API
```

## Pre-Deployment Setup

### 1. Supabase Configuration

#### Create Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Wait for database initialization

#### Setup Database Schema
```bash
# Navigate to your project
cd ZephyrOS

# Run schema in Supabase SQL Editor
cat supabase/schema.sql
```

Copy and paste the schema into Supabase SQL Editor and execute.

#### Get API Credentials
1. Go to Settings > API in Supabase Dashboard
2. Copy the following:
   - Project URL
   - Anon (public) key
   - Service role (secret) key

### 2. Environment Variables Setup

Create production environment variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key

# API Configuration (Option 1: Unified)
NEXT_PUBLIC_API_URL=https://your-domain.vercel.app

# API Configuration (Option 2: Separate)
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

## Deployment Strategy 1: Unified Vercel Project

### Step 1: Repository Setup

```bash
# Ensure your repository is pushed to GitHub
git add .
git commit -m "deploy: prepare for production deployment"
git push origin main
```

### Step 2: Vercel Project Creation

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from project root
vercel

# Follow prompts:
# Set up and deploy? Yes
# Which scope? Select your account/team
# Link to existing project? No
# Project name? zephyros (or your preferred name)
# Directory? ./ (project root)
# Override settings? No
```

### Step 3: Configure Build Settings

Create or update `vercel.json`:

```json
{
  "version": 2,
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "functions": {
    "apps/zmemory/app/api/**/*.ts": {
      "runtime": "nodejs18.x",
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/apps/zmemory/app/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/apps/zflow/app/$1"
    }
  ],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-key",
    "NEXT_PUBLIC_API_URL": "@api-url"
  }
}
```

### Step 4: Environment Variables in Vercel

```bash
# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_API_URL production

# Deploy to production
vercel --prod
```

### Step 5: Custom Domain (Optional)

1. Go to Vercel Dashboard > Project > Settings > Domains
2. Add your custom domain
3. Configure DNS settings as instructed
4. Wait for SSL certificate provisioning

## Deployment Strategy 2: Separate Projects

### Deploy ZMemory API

```bash
# Navigate to ZMemory
cd apps/zmemory

# Initialize Vercel project
vercel

# Configure as API-only project
# Set root directory to: apps/zmemory
# Set build command to: npm run build
# Set output directory to: .next

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# Deploy
vercel --prod
```

### Deploy ZFlow Frontend

```bash
# Navigate to ZFlow
cd apps/zflow

# Initialize Vercel project
vercel

# Configure environment variables with API URL
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_API_URL production  # Use ZMemory API URL

# Deploy
vercel --prod
```

## Production Configuration

### 1. Supabase Production Setup

#### Row Level Security (RLS)
```sql
-- Enable RLS on memories table
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view their own memories" ON memories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memories" ON memories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories" ON memories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories" ON memories
  FOR DELETE USING (auth.uid() = user_id);
```

#### Performance Indexes
```sql
-- Add performance indexes
CREATE INDEX idx_memories_user_type ON memories(user_id, type);
CREATE INDEX idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX idx_memories_updated_at ON memories(updated_at DESC);
CREATE INDEX idx_memories_tags ON memories USING GIN(tags);

-- Full-text search index
CREATE INDEX idx_memories_content_search ON memories USING GIN(to_tsvector('english', content::text));
```

### 2. API Rate Limiting

Add rate limiting to ZMemory API:

```typescript
// apps/zmemory/lib/rateLimit.ts
import { NextRequest } from 'next/server';

const RATE_LIMIT = 100; // requests per minute
const WINDOW_SIZE = 60 * 1000; // 1 minute

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(request: NextRequest): boolean {
  const ip = request.ip || 'anonymous';
  const now = Date.now();
  
  const record = requestCounts.get(ip);
  
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, {
      count: 1,
      resetTime: now + WINDOW_SIZE
    });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}
```

### 3. Error Monitoring

#### Sentry Setup (Optional)

```bash
# Install Sentry
npm install @sentry/nextjs

# Initialize Sentry
npx @sentry/wizard@latest -i nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

### 4. Analytics Setup

#### Vercel Analytics

```bash
# Install Vercel Analytics
npm install @vercel/analytics
```

```typescript
// apps/zflow/app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

## Monitoring and Maintenance

### 1. Health Checks

Create comprehensive health check endpoint:

```typescript
// apps/zmemory/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    service: 'zmemory-api',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
    database: 'unknown',
    status: 'unknown'
  };

  try {
    // Test database connection
    const { error } = await supabase.from('memories').select('id').limit(1);
    checks.database = error ? 'error' : 'connected';
    checks.status = error ? 'unhealthy' : 'healthy';
    
    return NextResponse.json(checks, {
      status: error ? 503 : 200,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    checks.database = 'error';
    checks.status = 'unhealthy';
    
    return NextResponse.json(checks, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
  }
}
```

### 2. Logging Strategy

```typescript
// apps/zmemory/lib/logger.ts
interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export function log(entry: Omit<LogEntry, 'timestamp'>) {
  const logEntry: LogEntry = {
    ...entry,
    timestamp: new Date().toISOString()
  };
  
  if (process.env.NODE_ENV === 'production') {
    // Send to external logging service
    console.log(JSON.stringify(logEntry));
  } else {
    console.log(`[${logEntry.level.toUpperCase()}] ${logEntry.message}`, logEntry.metadata);
  }
}
```

### 3. Performance Monitoring

#### Core Web Vitals Tracking

```typescript
// apps/zflow/lib/vitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  if (process.env.NODE_ENV === 'production') {
    // Send to your analytics service
    console.log('Web Vital:', metric);
  }
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

## Continuous Deployment

### GitHub Actions Setup

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run type check
        run: npm run type-check
      
      - name: Run build
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### Environment Secrets

Add to GitHub repository secrets:
- `VERCEL_TOKEN`: From Vercel account settings
- `ORG_ID`: From Vercel project settings
- `PROJECT_ID`: From Vercel project settings

## Security Considerations

### 1. Environment Variables Security

- Never commit `.env` files to repository
- Use Vercel's environment variable management
- Rotate Supabase keys regularly
- Use different keys for development/production

### 2. API Security

```typescript
// apps/zmemory/lib/security.ts
import { NextRequest } from 'next/server';

export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'https://your-domain.vercel.app',
    'https://your-custom-domain.com'
  ];
  
  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:3000');
  }
  
  return origin ? allowedOrigins.includes(origin) : false;
}

export function sanitizeInput(input: any): any {
  // Implement input sanitization
  if (typeof input === 'string') {
    return input.trim().slice(0, 10000); // Limit input length
  }
  return input;
}
```

### 3. Database Security

- Enable RLS on all tables
- Use service role key only in server-side code
- Implement proper authentication
- Regular security audits

## Scaling Considerations

### 1. Database Scaling

```sql
-- Monitor query performance
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Add connection pooling
-- Configure in Supabase Dashboard > Settings > Database
```

### 2. CDN and Caching

```typescript
// apps/zmemory/app/api/memories/route.ts
export async function GET() {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      'CDN-Cache-Control': 'public, s-maxage=60',
      'Vercel-CDN-Cache-Control': 'public, s-maxage=3600'
    }
  });
}
```

### 3. Edge Functions

For better global performance, consider moving API functions to Vercel Edge Runtime:

```typescript
// apps/zmemory/app/api/health/route.ts
export const runtime = 'edge';

export async function GET() {
  return new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    region: process.env.VERCEL_REGION
  }), {
    headers: {
      'content-type': 'application/json',
    },
  });
}
```

## Cost Optimization

### Vercel Pricing Tiers

- **Hobby Plan**: $0/month
  - 100GB bandwidth
  - Unlimited static sites
  - Serverless function executions

- **Pro Plan**: $20/month
  - 1TB bandwidth
  - Advanced analytics
  - Team collaboration

### Supabase Pricing

- **Free Tier**: $0/month
  - 500MB database
  - 2GB bandwidth
  - 50,000 monthly active users

- **Pro Tier**: $25/month
  - 8GB database
  - 250GB bandwidth
  - 100,000 monthly active users

### Optimization Tips

1. **Minimize API calls** with proper caching
2. **Optimize images** using Next.js Image component
3. **Use static generation** where possible
4. **Implement proper pagination** for large datasets
5. **Monitor usage** through dashboards

## Troubleshooting

### Common Deployment Issues

1. **Build Failures**:
```bash
# Check build logs in Vercel dashboard
# Common fixes:
npm run build  # Test locally
npm run type-check  # Fix TypeScript errors
```

2. **Environment Variable Issues**:
```bash
# Verify in Vercel dashboard
vercel env ls

# Pull environment variables locally
vercel env pull .env.local
```

3. **Database Connection Issues**:
- Verify Supabase URL and keys
- Check RLS policies
- Monitor Supabase logs

4. **Performance Issues**:
- Check Vercel function logs
- Monitor Supabase query performance
- Use Vercel Analytics insights

## Backup and Recovery

### Database Backups

1. **Automated Backups**: Enabled by default in Supabase
2. **Manual Backups**:
```bash
# Using Supabase CLI
supabase db dump > backup.sql

# Restore from backup
supabase db reset --db-url "postgresql://..."
```

### Application Backups

1. **Code Repository**: Always in GitHub
2. **Environment Variables**: Document separately
3. **Configuration Files**: Version controlled

## Post-Deployment Checklist

- [ ] Health check endpoint returns 200
- [ ] All API routes are accessible
- [ ] Database connection is working
- [ ] Environment variables are set correctly
- [ ] Custom domain is configured (if applicable)
- [ ] SSL certificate is active
- [ ] Monitoring is configured
- [ ] Error tracking is enabled
- [ ] Performance metrics are tracked
- [ ] Backup strategy is in place

---

**Last Updated**: January 2025  
**Version**: 1.0.0

## Latest Deployment Enhancements

### January 2025 Updates
- **Optimized Build Process**: Improved build times with better dependency management
- **Enhanced Security**: Strengthened production security configurations
- **Performance Monitoring**: Integrated performance tracking and monitoring
- **i18n Production Support**: Full internationalization in production deployments
- **Automated Testing**: CI/CD pipeline with comprehensive test coverage