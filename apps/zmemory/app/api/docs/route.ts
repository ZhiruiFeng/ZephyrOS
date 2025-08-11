// Swagger UI endpoint for API documentation
import { getApiDocs } from '../../../lib/swagger';

export async function GET() {
  // In production, disable docs by default unless explicitly enabled
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_API_DOCS !== 'true') {
    return new Response('API docs are disabled in production', { status: 404 });
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

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}