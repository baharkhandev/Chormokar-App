import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Produces .next/standalone for the slim Docker runtime image.
  output: 'standalone',
  poweredByHeader: false,
};

export default nextConfig;
