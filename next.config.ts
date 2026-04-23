import type { NextConfig } from "next";

// Extend NextConfig to include the experimental reactCompiler property
interface CustomNextConfig extends NextConfig {
  reactCompiler?: boolean | {
    compilationMode?: "annotation" | "infer";
    panicThreshold?: "none" | "critical_errors" | "all_errors";
  };
}

const isProd = process.env.NODE_ENV === 'production';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : '';
const supabaseOrigin = supabaseHostname ? `https://${supabaseHostname}` : '';

const nextConfig: CustomNextConfig = {
  reactCompiler: true,
  // eslint-disable-next-line sonarjs/no-hardcoded-ip
  allowedDevOrigins: ["192.168.1.31", "192.168.56.1"],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  turbopack: {},
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    return config;
  },
  images: {
    remotePatterns: supabaseHostname ? [
      {
        protocol: 'https',
        hostname: supabaseHostname,
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ] : [],
  },
  async headers() {
    const scriptSrc = isProd 
      ? "script-src 'self' 'unsafe-inline';" 
      : "script-src 'self' 'unsafe-eval' 'unsafe-inline';";

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; img-src 'self' ${supabaseOrigin} data: blob:; ${scriptSrc} style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' ${supabaseOrigin}; frame-ancestors 'self';`
          }
        ]
      }
    ];
  }
};

export default nextConfig;
