const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
const isProjectPage = process.env.GITHUB_ACTIONS === 'true' && !repository.endsWith('.github.io');
const basePath = isProjectPage ? `/${repository}` : '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  basePath,
  assetPrefix: basePath,
};

export default nextConfig;
