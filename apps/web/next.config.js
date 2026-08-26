/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@gitlens/shared-types', '@gitlens/utils'],
  output: process.env.DOCKER_BUILD ? 'standalone' : undefined,
};

module.exports = nextConfig;
