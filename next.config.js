/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  // Prevent Vercel from bundling Prisma (which uses __dirname internally)
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
  // Block location & other permission prompts site-wide (including iframes)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Permissions-Policy",
            value: "geolocation=(), camera=(), microphone=()",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
