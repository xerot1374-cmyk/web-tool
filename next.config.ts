import type { NextConfig } from "next";

import { nextAllowedDevOrigins } from "./next-env";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: nextAllowedDevOrigins,
  async rewrites() {
    return [
      {
        source: "/avatar.png",
        destination: "/profile.jpg",
      },
    ];
  },
  serverExternalPackages: [
    "fluent-ffmpeg",
    "@ffmpeg-installer/ffmpeg",
    "@ffprobe-installer/ffprobe",
    "puppeteer",
  ],
  webpack(config) {
    config.module.rules.push({
      test: /\.md$/,
      type: "asset/source",
    });
    return config;
  },
  // Keeps Next from warning about the custom webpack config.
  turbopack: {},
};

export default nextConfig;
