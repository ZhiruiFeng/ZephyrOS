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

    headers.push({
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: allowedOrigins.join(',') },
        { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        { key: 'Access-Control-Allow-Credentials', value: 'true' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        // Do NOT set a generic CSP here
      ],
    })

    return headers;
  },
};

module.exports = nextConfig; 