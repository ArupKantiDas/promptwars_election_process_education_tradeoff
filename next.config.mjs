/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true
  },
  async rewrites() {
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backend) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${backend}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
