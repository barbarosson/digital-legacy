"use client";

/**
 * Bir video dosyasından ilk kareyi yakalayıp JPEG data-URL döndürür.
 * Tamamen tarayıcı tarafında çalışır; video buluta gönderilmez.
 */
export async function captureVideoThumbnail(
  file: File,
  maxWidth = 480,
): Promise<string | null> {
  if (typeof document === "undefined") return null;

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    let settled = false;
    const finish = (result: string | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(result);
    };

    const timeout = setTimeout(() => finish(null), 8000);

    const grab = () => {
      try {
        const ratio = video.videoWidth ? maxWidth / video.videoWidth : 1;
        const width = Math.min(maxWidth, video.videoWidth || maxWidth);
        const height = Math.round((video.videoHeight || maxWidth) * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          clearTimeout(timeout);
          finish(null);
          return;
        }
        ctx.drawImage(video, 0, 0, width, height);
        clearTimeout(timeout);
        finish(canvas.toDataURL("image/jpeg", 0.7));
      } catch {
        clearTimeout(timeout);
        finish(null);
      }
    };

    video.onloadeddata = () => {
      const target = Math.min(0.5, (video.duration || 1) / 2);
      const onSeeked = () => grab();
      video.onseeked = onSeeked;
      try {
        video.currentTime = target;
      } catch {
        grab();
      }
    };

    video.onerror = () => {
      clearTimeout(timeout);
      finish(null);
    };
  });
}
