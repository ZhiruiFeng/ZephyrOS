/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    const isProd = process.env.NODE_ENV === 'production'
    const allowedOrigins = isProd
      ? [process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com']
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];

    const headers = [];

    // Only in development: relax CSP for /api/docs to load Swagger UI from CDN
    if (!isProd) {
      headers.push({
        source: '/api/docs',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self'",
              "style-src 'self'",
              "img-src 'self' data:",
              "font-src 'self' data:",
              "object-src 'none'",
              "connect-src 'self'"
            ].join('; ')
          }
        ],
      })
    }

    // CORS headers are handled dynamically in lib/security.ts
    // Only set non-CORS security headers here
    headers.push({
      source: '/api/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    })

    return headers;
  },
};

module.exports = nextConfig; 