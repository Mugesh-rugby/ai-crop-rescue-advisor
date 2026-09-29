/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disable StrictMode to prevent double-mount issues with Firestore listeners
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" }, // Google profile photos
    ],
  },
  // TensorFlow.js WASM/WebGL backend support
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    return config;
  },
  // Allow adequate response times from Groq AI API
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

module.exports = nextConfig;
