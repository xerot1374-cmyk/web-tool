import type { NextConfig } from "next";
import type { SizeLimit } from "next/dist/types";

import { nextAllowedDevOrigins } from "./next-env";

function getProxyClientMaxBodySize(): SizeLimit {
  const raw = process.env.NEXT_PROXY_CLIENT_MAX_BODY_SIZE?.trim();
  if (!raw) return "100mb";

  const asNumber = Number(raw);
  if (Number.isFinite(asNumber) && asNumber > 0) return asNumber;

  if (/^\d+(?:\.\d+)?[kKmMgGtTpP][bB]$/.test(raw)) {
    return raw as SizeLimit;
  }

  return "100mb";
}

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    proxyClientMaxBodySize: getProxyClientMaxBodySize(),
  },
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
