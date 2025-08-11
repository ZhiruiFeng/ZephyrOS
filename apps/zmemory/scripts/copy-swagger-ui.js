#!/usr/bin/env node

// Copy required Swagger UI assets from node_modules to public directory
const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

try {
  const distDir = path.dirname(require.resolve('swagger-ui-dist/swagger-ui.css'));
  const publicDir = path.join(process.cwd(), 'public', 'swagger-ui');

  const files = [
    'swagger-ui.css',
    'swagger-ui-bundle.js',
    'swagger-ui-standalone-preset.js',
  ];

  files.forEach((file) => {
    const src = path.join(distDir, file);
    const dest = path.join(publicDir, file);
    copyFile(src, dest);
    console.log(`[swagger-ui] Copied ${file} -> ${path.relative(process.cwd(), dest)}`);
  });
} catch (err) {
  console.error('[swagger-ui] Failed to copy assets:', err.message);
  process.exit(1);
}


