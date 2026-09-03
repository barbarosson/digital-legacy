"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Circle, RotateCcw, Square, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

type CameraRecorderProps = {
  onRecorded: (file: File | null) => void;
  recordedFile: File | null;
};

type RecorderState = "idle" | "ready" | "recording" | "recorded" | "error";

function pickMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function CameraRecorder({
  onRecorded,
  recordedFile,
}: CameraRecorderProps) {
  const t = useT();
  const previewRef = useRef<HTMLVideoElement>(null);
  const playbackRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [duration, setDuration] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (previewRef.current) {
      previewRef.current.srcObject = null;
    }
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const revokePreviewUrl = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  const openCamera = useCallback(async () => {
    setError("");
    stopStream();
    revokePreviewUrl();
    onRecorded(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setState("error");
      setError(t("camera.notSupported"));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (previewRef.current) {
        previewRef.current.srcObject = stream;
        await previewRef.current.play();
      }
      setState("ready");
      setDuration(0);
    } catch {
      setState("error");
      setError(t("camera.openError"));
    }
  }, [facingMode, onRecorded, revokePreviewUrl, stopStream, t]);

  const switchCamera = useCallback(async () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    if (state === "ready" || state === "recording") {
      stopStream();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: next, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        streamRef.current = stream;
        if (previewRef.current) {
          previewRef.current.srcObject = stream;
          await previewRef.current.play();
        }
      } catch {
        setState("error");
        setError(t("camera.switchError"));
      }
    }
  }, [facingMode, state, stopStream, t]);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;

    const mimeType = pickMimeType();
    if (!mimeType) {
      setError(t("camera.recordNotSupported"));
      setState("error");
      return;
    }

    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      clearTimer();
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `gunluk-video-${Date.now()}.${ext}`, {
        type: mimeType.split(";")[0],
      });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      onRecorded(file);
      setState("recorded");
      stopStream();
    };

    recorder.start(1000);
    setState("recording");
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration((value) => value + 1);
    }, 1000);
  }, [clearTimer, onRecorded, stopStream, t]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    stopStream();
    revokePreviewUrl();
    onRecorded(null);
    setDuration(0);
    setError("");
    setState("idle");
  }, [clearTimer, onRecorded, revokePreviewUrl, stopStream]);

  useEffect(() => {
    if (recordedFile && !previewUrl && state !== "ready" && state !== "recording") {
      const url = URL.createObjectURL(recordedFile);
      setPreviewUrl(url);
      setState("recorded");
    }
  }, [previewUrl, recordedFile, state]);

  useEffect(() => {
    return () => {
      clearTimer();
      stopStream();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [clearTimer, previewUrl, stopStream]);

  useEffect(() => {
    if (state === "recorded" && previewUrl && playbackRef.current) {
      playbackRef.current.src = previewUrl;
    }
  }, [previewUrl, state]);

  return (
    <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 text-sm font-medium text-slate-300">
          <Camera className="h-4 w-4 text-amber-400" />
          {t("camera.heading")}
        </p>
        {state !== "idle" && state !== "error" && (
          <button
            type="button"
            onClick={reset}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            {t("camera.close")}
          </button>
        )}
      </div>

      {state === "idle" && !recordedFile && (
        <Button type="button" variant="secondary" onClick={openCamera}>
          <Video className="h-4 w-4" />
          {t("camera.open")}
        </Button>
      )}

      {error && <p className="text-sm text-rose-400">{error}</p>}

      {(state === "ready" || state === "recording") && (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-black">
            <video
              ref={previewRef}
              playsInline
              muted
              className="aspect-video w-full object-cover"
            />
            {state === "recording" && (
              <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-rose-600/90 px-3 py-1 text-xs font-medium text-white">
                <Circle className="h-2 w-2 fill-current animate-pulse" />
                {formatDuration(duration)}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {state === "ready" && (
              <>
                <Button type="button" onClick={startRecording}>
                  <Circle className="h-4 w-4 fill-current text-rose-500" />
                  {t("camera.start")}
                </Button>
                <Button type="button" variant="ghost" onClick={switchCamera}>
                  <RotateCcw className="h-4 w-4" />
                  {t("camera.switch")}
                </Button>
              </>
            )}
            {state === "recording" && (
              <Button type="button" variant="danger" onClick={stopRecording}>
                <Square className="h-4 w-4 fill-current" />
                {t("camera.stop")}
              </Button>
            )}
          </div>
        </div>
      )}

      {(state === "recorded" || recordedFile) && (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-black">
            <video
              ref={playbackRef}
              src={previewUrl ?? undefined}
              controls
              playsInline
              className="aspect-video w-full object-cover"
            />
          </div>
          <p className="text-xs text-emerald-400">
            {t("camera.ready")}
            {recordedFile
              ? ` (${(recordedFile.size / (1024 * 1024)).toFixed(1)} MB)`
              : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={reset}>
              <X className="h-4 w-4" />
              {t("camera.retake")}
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500">{t("camera.note")}</p>
    </div>
  );
}

export function VideoSourceTabs({
  mode,
  onModeChange,
}: {
  mode: "camera" | "file";
  onModeChange: (mode: "camera" | "file") => void;
}) {
  const t = useT();
  return (
    <div className="flex gap-2 rounded-xl bg-slate-900 p-1">
      <button
        type="button"
        onClick={() => onModeChange("camera")}
        className={cn(
          "flex-1 rounded-lg px-3 py-2 text-sm transition",
          mode === "camera"
            ? "bg-amber-500/15 text-amber-300"
            : "text-slate-400 hover:text-slate-200",
        )}
      >
        {t("calendar.cameraTab")}
      </button>
      <button
        type="button"
        onClick={() => onModeChange("file")}
        className={cn(
          "flex-1 rounded-lg px-3 py-2 text-sm transition",
          mode === "file"
            ? "bg-amber-500/15 text-amber-300"
            : "text-slate-400 hover:text-slate-200",
        )}
      >
        {t("calendar.fileTab")}
      </button>
    </div>
  );
}
