/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "imgcdn.stablediffusionweb.com",
        pathname: "/2025/1/16/**",
      },
      {
        protocol: "https",
        hostname: "www.lightxeditor.com",
        pathname: "/blog/wp-content/uploads/2026/06/**",
      },
    ],
  },
  // Keep the older prototype URLs working.
  async redirects() {
    return [
      { source: "/sign-in", destination: "/login", permanent: true },
      { source: "/sign-up", destination: "/signup", permanent: true },
    ];
  },
};

export default nextConfig;
