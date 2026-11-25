import type { NextConfig } from "next";

// Supabase self-hosted diakses lewat domain website: /supabase/... diteruskan oleh server Next.js
// ke Kong di jaringan Docker (mis. http://supabase-kong-xxxx:8000). Diisi saat build.
// Hanya API yang dipakai aplikasi yang diteruskan (auth, rest, storage); Studio tidak.
const SUPABASE_INTERNAL_URL = process.env.SUPABASE_INTERNAL_URL?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "edcnjwycpxpifdcetkof.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "gamblewatch-supabase.caiis.ai.id",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "gamblewatch.caiis.ai.id",
        port: "",
        pathname: "/supabase/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    if (!SUPABASE_INTERNAL_URL) return [];
    return [
      {
        source: "/supabase/:service(auth|rest|storage)/v1/:path*",
        destination: `${SUPABASE_INTERNAL_URL}/:service/v1/:path*`,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
