# API Testing & Documentation Tools for ZMemory

Comprehensive guide to API documentation and testing tools integrated into ZMemory backend.

## 🚀 **Available Tools**

### 1. **Interactive API Documentation (Swagger UI)**

**Access**: http://localhost:3001/api/docs

**Features**:
- Interactive API explorer
- Request/response examples
- Schema validation
- Try-it-out functionality
- OpenAPI 3.0 specification

**Setup**:
```bash
# Install dependencies
npm install next-swagger-doc swagger-jsdoc

# Start development server
npm run dev

# Access documentation
open http://localhost:3001/api/docs
```

**Usage**:
- Browse all API endpoints
- Test endpoints directly from the browser
- View request/response schemas
- Download OpenAPI specification

### 2. **Automated Testing (Jest + Supertest)**

**Features**:
- Unit tests for API routes
- Integration testing
- Mocked database responses
- Custom matchers (UUID validation)
- Coverage reporting

**Commands**:
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test health.test.ts
```

**Example Test**:
```typescript
describe('/api/memories', () => {
  it('should create a new memory', async () => {
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty('id');
    expect(data.id).toBeValidUUID();
  });
});
```

### 3. **Postman Collection**

**Location**: `tests/postman/ZMemory-API.postman_collection.json`

**Features**:
- Complete API test suite
- Environment variables (dev/production)
- Automated test scripts
- Data validation
- Error scenario testing

**Import to Postman**:
1. Open Postman
2. Click Import
3. Select file: `tests/postman/ZMemory-API.postman_collection.json`
4. Import environment: `tests/postman/environments/development.postman_environment.json`

**Run from Command Line**:
```bash
# Install Newman (Postman CLI)
npm install -g newman

# Run collection
npm run test:api

# Or run directly
newman run tests/postman/ZMemory-API.postman_collection.json \
  -e tests/postman/environments/development.postman_environment.json
```

### 4. **Load Testing (Artillery)**

**Features**:
- Performance testing
- Multiple user scenarios
- Realistic load patterns
- Response time monitoring
- Error rate tracking

**Configuration**: `tests/load/artillery.yml`

**Run Load Tests**:
```bash
# Install Artillery
npm install -g artillery

# Run load test
artillery run tests/load/artillery.yml

# Run with custom target
artillery run tests/load/artillery.yml --target http://localhost:3001
```

**Test Scenarios**:
- Health check monitoring
- Memory browsing patterns
- CRUD operations
- Error handling
- High-frequency reads

### 5. **API Monitoring & Health Checks**

**Features**:
- Comprehensive health monitoring
- Database connectivity checks
- Memory usage tracking
- Performance metrics
- Request/error tracking

**Enhanced Health Endpoint**: `GET /api/health`

**Response Example**:
```json
{
  "service": "zmemory-api",
  "status": "healthy",
  "timestamp": "2024-08-01T10:00:00Z",
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "healthy",
      "message": "Database connection successful",
      "responseTime": 45
    },
    "memory": {
      "status": "healthy",
      "message": "Memory usage is normal",
      "details": {
        "usage": 128,
        "limit": 512
      }
    },
    "api": {
      "status": "healthy",
      "message": "API performance is good",
      "responseTime": 12
    }
  },
  "metrics": {
    "responseTime": 12,
    "memoryUsage": 128,
    "uptime": 3600
  }
}
```

## 📋 **Testing Workflow**

### Development Testing

```bash
# 1. Start the API server
npm run dev

# 2. Run unit tests
npm test

# 3. Test with Postman collection
npm run test:api

# 4. Check API documentation
open http://localhost:3001/api/docs

# 5. Verify health status
curl http://localhost:3001/api/health
```

### Pre-Deployment Testing

```bash
# 1. Run full test suite
npm run test:coverage

# 2. Performance testing
artillery run tests/load/artillery.yml

# 3. Build and test production build
npm run build
npm start

# 4. Test production endpoints
newman run tests/postman/ZMemory-API.postman_collection.json \
  -e tests/postman/environments/production.postman_environment.json
```

### Continuous Integration

```yaml
# .github/workflows/api-tests.yml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test
      
      - name: Start API server
        run: npm run dev &
        
      - name: Wait for server
        run: npx wait-on http://localhost:3001/api/health
      
      - name: Run API tests
        run: npm run test:api
      
      - name: Run load tests
        run: artillery run tests/load/artillery.yml --quiet
```

## 🔧 **Configuration**

### Environment Variables

```env
# Development
NODE_ENV=development
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=test-service-role-key

# Testing
NODE_ENV=test
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=test-service-role-key

# Production
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-production-service-key
```

### Jest Configuration

```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  collectCoverageFrom: [
    'app/api/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
}

module.exports = createJestConfig(customJestConfig)
```

## 📊 **Monitoring & Analytics**

### Request Tracking

```typescript
// Example usage in API routes
import { createRequestTracker } from '../../../lib/monitoring';

const tracker = createRequestTracker();

export async function GET(request: NextRequest) {
  return tracker.trackRequest('GET', '/api/memories', async () => {
    // Your API logic here
    return NextResponse.json(data);
  });
}
```

### Error Tracking

```typescript
// Automatic error tracking
try {
  // API operation
} catch (error) {
  await monitoring.trackError(error, {
    endpoint: '/api/memories',
    method: 'POST',
    userId: 'user-id',
  });
  throw error;
}
```

### Performance Metrics

The monitoring system automatically tracks:
- Response times
- Memory usage
- Database query performance
- Error rates
- Uptime statistics

## 🚨 **Troubleshooting**

### Common Issues

1. **Tests Failing Due to Environment**:
```bash
# Check environment variables
echo $NODE_ENV
echo $NEXT_PUBLIC_SUPABASE_URL

# Reset test environment
rm -rf node_modules/.cache
npm test
```

2. **Swagger Documentation Not Loading**:
```bash
# Check if server is running
curl http://localhost:3001/api/health

# Rebuild documentation
npm run docs:generate

# Clear Next.js cache
rm -rf .next
npm run dev
```

3. **Postman Tests Failing**:
```bash
# Check collection and environment files
newman run tests/postman/ZMemory-API.postman_collection.json \
  -e tests/postman/environments/development.postman_environment.json \
  --verbose

# Update environment URLs
# Edit tests/postman/environments/development.postman_environment.json
```

4. **Load Tests Failing**:
```bash
# Check server capacity
curl http://localhost:3001/api/health

# Reduce load test intensity
# Edit tests/load/artillery.yml - reduce arrivalRate

# Run single scenario
artillery run tests/load/artillery.yml --scenario "Health Check"
```

### Performance Optimization

1. **Database Query Optimization**:
```sql
-- Add indexes for common queries
CREATE INDEX idx_memories_type ON memories(type);
CREATE INDEX idx_memories_created_at ON memories(created_at DESC);
```

2. **Response Caching**:
```typescript
// Add caching headers
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, max-age=60, s-maxage=60',
  },
});
```

3. **Load Balancing** (for production):
- Use Vercel's automatic scaling
- Implement connection pooling
- Add CDN for static responses

## 📈 **Best Practices**

### Test Driven Development

1. **Write tests first** for new endpoints
2. **Use descriptive test names** that explain the behavior
3. **Test both success and error scenarios**
4. **Mock external dependencies** appropriately
5. **Maintain high test coverage** (aim for >80%)

### API Documentation

1. **Keep documentation up-to-date** with code changes
2. **Provide realistic examples** in all endpoints
3. **Document error responses** thoroughly
4. **Include rate limiting information**
5. **Use consistent naming conventions**

### Performance Testing

1. **Test realistic user scenarios** not just theoretical limits
2. **Monitor database performance** during load tests
3. **Test error handling** under load
4. **Measure resource usage** during tests
5. **Test gradually increasing loads**

### Monitoring

1. **Set up alerts** for critical health checks
2. **Monitor response times** and error rates
3. **Track API usage patterns** for optimization
4. **Log performance metrics** for analysis
5. **Implement graceful degradation** for high load

---

**Tools Summary**:
- 📚 **Documentation**: Swagger UI + OpenAPI
- 🧪 **Unit Testing**: Jest + Supertest
- 🔄 **API Testing**: Postman + Newman
- ⚡ **Load Testing**: Artillery.io
- 📊 **Monitoring**: Custom health checks + metrics

**Access Points**:
- API Docs: http://localhost:3001/api/docs
- Health Check: http://localhost:3001/api/health
- OpenAPI Spec: http://localhost:3001/api/docs/spec

Your ZMemory API now has enterprise-grade testing and documentation capabilities! 🚀