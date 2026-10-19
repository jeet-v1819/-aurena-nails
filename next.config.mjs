/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverComponentsExternalPackages: [
      "@prisma/client",
      "@prisma/adapter-pg",
      "@prisma/driver-adapter-utils",
      "pg"
    ],
    // Ensure the Prisma WASM query engine ships with the Netlify function.
    // The pg driver adapter avoids any dependency on a host-specific native
    // query-engine binary in the serverless runtime.
    outputFileTracingIncludes: {
      "/*": [
        "./node_modules/.prisma/client/*.wasm",
        "./node_modules/.prisma/client/*.js",
        "./node_modules/.prisma/client/schema.prisma",
        "./node_modules/@prisma/client/runtime/*.wasm"
      ]
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com"
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      }
    ]
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin"
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on"
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
