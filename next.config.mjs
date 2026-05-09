/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile Firebase client SDK through Next.js's webpack pipeline to ensure
  // a single bundled copy — prevents duplicate class instances that break
  // Firebase's instanceof checks (e.g. collection() validation).
  transpilePackages: [
    "firebase",
    "@firebase/app",
    "@firebase/auth",
    "@firebase/firestore",
    "@firebase/storage",
    "@firebase/component",
    "@firebase/util",
    "@firebase/logger",
  ],
  experimental: {
    // firebase-admin uses Node.js built-ins (node:fs, node:crypto, etc.)
    // that webpack cannot bundle — keep it in the Node runtime only.
    serverComponentsExternalPackages: ["firebase-admin"],
  },
  async headers() {
    return [
      {
        // Override Vercel's default COOP header — same-origin blocks Firebase
        // popup auth from communicating back to the parent window.
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
