# Security Guidelines for ZephyrOS

## Security Measures Implemented

### 1. Authentication & Authorization
- ✅ JWT-based authentication via Supabase
- ✅ Row Level Security (RLS) enabled on database tables
- ✅ User ID validation on all API endpoints
- ✅ Bearer token validation for API requests

### 2. CORS Configuration
- ✅ Restricted CORS origins (no wildcard `*` in production)
- ✅ Environment-based origin configuration
- ✅ Proper preflight handling

### 3. Security Headers
- ✅ `X-Content-Type-Options: nosniff`
- ✅ `X-Frame-Options: DENY`
- ✅ `X-XSS-Protection: 1; mode=block`
- ✅ `Referrer-Policy: strict-origin-when-cross-origin`
- ✅ Content Security Policy (CSP)

### 4. Input Validation
- ✅ Zod schema validation for all API inputs
- ✅ SQL injection prevention via Supabase parameterized queries
- ✅ Data sanitization and type checking

### 5. Rate Limiting
- ✅ Basic rate limiting implementation
- ✅ Different limits for GET vs POST endpoints
- ✅ IP-based tracking

### 6. Error Handling
- ✅ Sanitized error messages in production
- ✅ No sensitive information disclosure
- ✅ Proper error logging

## Environment Configuration Security

### Production Environment Variables
Required for secure production deployment:

```env
# Application URLs (replace with your actual domains)
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
PRODUCTION_FRONTEND_URL=https://your-frontend-domain.com

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Node Environment
NODE_ENV=production
```

### Security Checklist Before Production

#### Database Security
- [ ] Enable Row Level Security on all tables
- [ ] Verify user data isolation policies
- [ ] Review database permissions
- [ ] Enable database audit logging

#### Environment Security  
- [ ] Use strong, unique secrets
- [ ] Store secrets in secure environment variable system
- [ ] Never commit `.env*` files to version control
- [ ] Rotate API keys regularly

#### Network Security
- [ ] Configure HTTPS/SSL certificates
- [ ] Set up proper firewall rules
- [ ] Enable DDoS protection
- [ ] Configure CDN security settings

#### Application Security
- [ ] Update all dependencies to latest versions
- [ ] Run security vulnerability scans
- [ ] Enable CSP (Content Security Policy)
- [ ] Implement proper session management

#### Monitoring & Logging
- [ ] Set up error monitoring (e.g., Sentry)
- [ ] Enable access logging
- [ ] Configure security alerts
- [ ] Implement audit trails

### Security Headers Configuration

The application automatically sets these security headers:

```javascript
// Security Headers
'X-Content-Type-Options': 'nosniff',
'X-Frame-Options': 'DENY', 
'X-XSS-Protection': '1; mode=block',
'Referrer-Policy': 'strict-origin-when-cross-origin',
'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; object-src 'none';"
```

### Rate Limiting

Default rate limits:
- GET endpoints: 100 requests per 15 minutes
- POST endpoints: 50 requests per 15 minutes

### API Security Features

- **Authentication Required**: All API endpoints require valid JWT token
- **Input Validation**: All inputs validated with Zod schemas  
- **SQL Injection Prevention**: Supabase handles parameterization
- **CORS Restriction**: Only allowed origins can access APIs
- **Error Sanitization**: Generic error messages in production

## Common Security Issues to Avoid

1. **Don't expose sensitive data in error messages**
2. **Don't use `Access-Control-Allow-Origin: *` in production**
3. **Don't log sensitive information (passwords, tokens)**
4. **Don't trust client-side validation alone**
5. **Don't store secrets in client-side code**

## CI Secret Scanning

This repository runs automated secret scanning with Gitleaks on every push and pull request. See .github/workflows/secret-scan.yml.

Run locally:

```bash
# Using Homebrew
brew install gitleaks

# Scan the repo (redacted output)
gitleaks detect --redact

# Or using Docker
docker run --rm -v $(pwd):/path zricethezav/gitleaks:latest detect -v --redact -s /path
```

If a potential secret is flagged:
- Verify whether it’s a real secret. If so, rotate it immediately and force-push a commit that removes it.
- Replace occurrences in docs with placeholders (e.g., {{OAUTH_CLIENT_SECRET}}) and reference environment variables instead.

## Security Updates

- Regularly update dependencies: `npm audit fix`
- Monitor security advisories for used packages
- Review and update security policies quarterly
- Test security measures in staging environment

## Incident Response

If you suspect a security breach:

1. **Immediate**: Rotate all API keys and secrets
2. **Document**: Log all relevant information
3. **Investigate**: Review access logs and audit trails  
4. **Notify**: Contact your security team/administrator
5. **Remediate**: Fix vulnerabilities and update code
6. **Monitor**: Increase monitoring for suspicious activity

---

*Last updated: $(date)*
*Review this document quarterly and after major releases*