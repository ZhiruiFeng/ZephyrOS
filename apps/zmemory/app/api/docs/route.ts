import { NextResponse } from 'next/server';
import { withPublicMiddleware, type EnhancedRequest } from '@/middleware';
import { getApiDocs } from '@/lib/config/swagger';

/**
 * Handle API documentation request
 */
async function handleDocsRequest(request: EnhancedRequest): Promise<NextResponse> {
  // In production, disable docs by default unless explicitly enabled
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_API_DOCS !== 'true') {
    return new NextResponse('API docs are disabled in production', { status: 404 });
  }

  const spec = await getApiDocs();

  // Serve Swagger UI assets from local public folder (self-hosted)
  const cssHref = '/swagger-ui/swagger-ui.css';
  const bundleJs = '/swagger-ui/swagger-ui-bundle.js';
  const presetJs = '/swagger-ui/swagger-ui-standalone-preset.js';
  const initJs = '/swagger-ui/docs-init.js';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>ZMemory API Documentation</title>
        <link rel="stylesheet" type="text/css" href="${cssHref}" />
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="${bundleJs}"></script>
        <script src="${presetJs}"></script>
        <script src="${initJs}"></script>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}

// Apply public middleware - no auth required for docs, but get CORS and rate limiting
export const GET = withPublicMiddleware(handleDocsRequest, {
  rateLimit: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 30 // Reasonable limit for documentation access
  }
});