/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // firebase-admin uses Node.js built-ins (node:fs, node:crypto, etc.)
    // that webpack cannot bundle — keep it in the Node runtime only.
    serverComponentsExternalPackages: ["firebase-admin"],
  },
};

export default nextConfig;
