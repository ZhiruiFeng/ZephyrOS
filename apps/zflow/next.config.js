/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@zephyros/shared', '@zephyros/backend'],
  async rewrites() {
    // 将前端同源下的 /api/* 代理到后端服务（zmemory）3001 端口
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
}

module.exports = nextConfig 