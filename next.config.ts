import type { NextConfig } from "next";

const r2PublicHost = process.env.NEXT_PUBLIC_R2_PUBLIC_HOST;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.dev" },
      ...(r2PublicHost
        ? [{ protocol: "https" as const, hostname: r2PublicHost }]
        : []),
    ],
  },
};

export default nextConfig;
