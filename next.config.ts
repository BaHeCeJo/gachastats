import type { NextConfig } from "next";

// Extend NextConfig to include the experimental reactCompiler property
interface CustomNextConfig extends NextConfig {
  reactCompiler?: boolean | {
    compilationMode?: "annotation" | "infer";
    panicThreshold?: "none" | "critical_errors" | "all_errors";
  };
}

const nextConfig: CustomNextConfig = {
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gkyszugmxkkdlqlmxggd.supabase.co', // Replace with your actual Supabase hostname
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
