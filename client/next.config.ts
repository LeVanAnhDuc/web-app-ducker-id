import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: `${process.env.NEXT_PUBLIC_API_PREFIX}/:path*`,
        destination: `${process.env.API_SERVER_URL}${process.env.NEXT_PUBLIC_API_PREFIX}/:path*`
      }
    ];
  }
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
