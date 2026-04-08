/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "fluent-ffmpeg",
    "@ffmpeg-installer/ffmpeg",
    "@ffprobe-installer/ffprobe",
    "puppeteer",
    "formidable",
  ],

  webpack(config) {
    config.module.rules.push({
      test: /\.md$/,
      type: "asset/source",
    });
    return config;
  },

  // این خط فقط برای اینکه Next دیگه داد نزنه که webpack داری
  turbopack: {},
};

module.exports = nextConfig;
