/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  env: { NEXT_PUBLIC_SITE_BUILT_AT: new Date().toISOString() },
};

export default nextConfig;
