/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@gitlens/shared-types', '@gitlens/utils'],
};

module.exports = nextConfig;
