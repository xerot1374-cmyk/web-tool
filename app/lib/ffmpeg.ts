import ffmpeg from "fluent-ffmpeg";

let configured = false;

export async function configureFfmpegPaths() {
  // Prevent configuring the paths multiple times in the same runtime.
  if (configured) return;

  if (process.env.FFMPEG_PATH) {
    ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
  }

  if (process.env.FFPROBE_PATH) {
    ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
  }

  if (process.env.FFMPEG_PATH && process.env.FFPROBE_PATH) {
    configured = true;
    return;
  }

  const ffmpegInstaller = await import("@ffmpeg-installer/ffmpeg");
  const ffprobeInstaller = await import("@ffprobe-installer/ffprobe");

  if (!process.env.FFMPEG_PATH) {
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
  }

  if (!process.env.FFPROBE_PATH) {
    ffmpeg.setFfprobePath(ffprobeInstaller.path);
  }

  configured = true;
}
