import ffmpeg from "fluent-ffmpeg";

let configured = false;

export async function configureFfmpegPaths() {
  // جلوگیری از set کردن چندباره در یک runtime
  if (configured) return;

  const ffmpegInstaller = await import("@ffmpeg-installer/ffmpeg");
  const ffprobeInstaller = await import("@ffprobe-installer/ffprobe");

  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
  ffmpeg.setFfprobePath(ffprobeInstaller.path);

  configured = true;
}
