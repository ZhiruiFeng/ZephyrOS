# Environment Setup Guide

Quick guide to configure your ZMemory API environment variables.

## 🚀 Quick Setup

### Option 1: Development with Mock Data (No Setup Required)

Your API will work immediately with mock data - perfect for testing the API structure without a database.

```bash
cd apps/zmemory
npm run dev
```

**What you get:**
- ✅ All API endpoints working
- ✅ Mock data responses
- ✅ Interactive API documentation
- ✅ Health checks with "degraded" status
- ⚠️ Data doesn't persist between restarts

### Option 2: Full Supabase Integration

For persistent data and full functionality:

#### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and fill project details
4. Wait for database to initialize (~2 minutes)

#### Step 2: Get API Credentials

1. Go to **Settings** > **API** in your Supabase dashboard
2. Copy these values:
   - **Project URL** (starts with `https://`)
   - **Service Role Key** (starts with `eyJ`)

#### Step 3: Configure Environment

**Option A: Use Root Environment File (Recommended)**
```bash
# Create symlink to share root .env.local file
cd apps/zmemory
ln -s ../../.env.local .env.local

# Also create for zflow if needed
cd ../zflow
ln -s ../../.env.local .env.local
```

**Option B: Create Local Environment File**
```bash
# Navigate to ZMemory directory
cd apps/zmemory

# Copy environment template
cp .env.example .env.local

# Edit the file with your credentials
nano .env.local
```

**Update `.env.local` (Option B only):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Step 4: Setup Database Schema

1. Open **SQL Editor** in Supabase dashboard
2. Run this schema:

```sql
-- Create memories table
CREATE TABLE memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  content JSONB NOT NULL,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_memories_type ON memories(type);
CREATE INDEX idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX idx_memories_tags ON memories USING GIN(tags);
```

#### Step 5: Start Development

```bash
npm run dev
```

## 🔧 Environment Check

**Check your setup anytime:**
```bash
npm run dev:check
```

**Expected output when configured:**
```
🔧 ZMemory API Environment Check

✅ Found .env.local file

✅ Configured environment variables:
   NEXT_PUBLIC_SUPABASE_URL=https://your-project...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...

🎉 Environment is fully configured!

🚀 Available endpoints:
   Health Check: http://localhost:3001/api/health
   API Docs:     http://localhost:3001/api/docs
   Memories API: http://localhost:3001/api/memories
```

## 🩺 Health Check Status

### Healthy (Green) ✅
- Database connected
- All systems operational
- Environment fully configured

```json
{
  "status": "healthy",
  "environment": {
    "mode": "development",
    "configured": true
  }
}
```

### Degraded (Yellow) ⚠️ 
- Running with mock data
- API functional but data not persistent
- Environment not configured

```json
{
  "status": "degraded",
  "environment": {
    "mode": "mock",
    "configured": false,
    "missing_vars": ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    "recommendations": [
      "Configure Supabase environment variables for full functionality",
      "Copy .env.example to .env.local and fill in your Supabase credentials"
    ]
  }
}
```

### Unhealthy (Red) ❌
- Database connection failed
- Service errors
- Critical issues

## 🚨 Troubleshooting

### "Missing Supabase environment variables" Error

**Problem:** API fails to start with environment variable error.

**Solution:**
1. Create `.env.local` file in `apps/zmemory/`
2. Either add Supabase credentials OR remove the file to use mock mode
3. Restart the development server

### Environment Variables Not Loading

**Problem:** Variables in `.env.local` not being recognized.

**Solutions:**
1. **Check file location**: Must be in `apps/zmemory/.env.local`
2. **Check file format**: No spaces around `=`, no quotes needed
3. **Restart server**: Environment variables only load on startup
4. **Check syntax**: 
   ```env
   # ✅ Correct
   NEXT_PUBLIC_SUPABASE_URL=https://abc.supabase.co
   
   # ❌ Incorrect  
   NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co"
   ```

### Database Connection Issues

**Problem:** Health check shows database as unhealthy.

**Solutions:**
1. **Verify credentials** in Supabase dashboard
2. **Check project status** - ensure not paused
3. **Regenerate keys** if needed
4. **Test connection**:
   ```bash
   curl http://localhost:3001/api/health
   ```

### Mock Data vs Real Data

**Problem:** Confused about when mock data is used.

**Explanation:**
- **Mock data**: Used when environment variables are missing
- **Real data**: Used when Supabase is properly configured
- **Check current mode**: Look at health endpoint or dev:check command

## 📝 Environment File Templates

### Development (.env.local)
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001

# Optional: Development Settings
NODE_ENV=development
```

### Testing (.env.test)
```env
# Test Environment
NODE_ENV=test
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=test-service-role-key
```

## 🎯 Quick Commands Reference

```bash
# Check environment status
npm run dev:check

# Start with environment check
npm run dev

# Start without environment check
next dev -p 3001

# Test health endpoint
curl http://localhost:3001/api/health

# View API documentation
open http://localhost:3001/api/docs
```

---

**Need help?** Check the health endpoint at http://localhost:3001/api/health for detailed status and recommendations!