/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      }
    ],
    domains: [
      'images.unsplash.com',
      'via.placeholder.com',
      'placehold.co',
      'rxautos.com.br',
      'localhost',
      's2-autoesporte.glbimg.com',
      'i.s3.glbimg.com',
      'cdn.autopapo.com.br',
      'i.bstr.es'
    ],
  },
  async rewrites() {
    return [
      {
        source: '/static/:path*',
        destination: '/_next/static/:path*'
      }
    ]
  }
}

module.exports = nextConfig 