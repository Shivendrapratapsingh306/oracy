"use client";

import { useVisualAnalysis } from "./useVisualAnalysis";
import { Button } from "@/components/Button";
import { useTranslation } from "@/features/i18n/LanguageContext";

type Props = {
  className?: string;
};

export function VisualAnalyzer({ className = "" }: Props) {
  const { t } = useTranslation();
  const {
    videoRef,
    canvasRef,
    cameraState,
    analysisResult,
    startCamera,
    stopCamera,
  } = useVisualAnalysis();

  const isRunning = cameraState.status === "running";
  const isLoading =
    cameraState.status === "requesting" ||
    (isRunning && cameraState.isModelLoading);

  return (
    <div
      className={`rounded-3xl border border-line bg-card overflow-hidden shadow-card ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5 bg-white">
        <div className="flex items-center gap-2">
          {isRunning ? (
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          ) : (
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          )}
          <span className="text-xs font-semibold uppercase tracking-wider text-ink">
            Live Visual Analysis
          </span>
        </div>

        <div>
          {isRunning ? (
            <button
              type="button"
              onClick={stopCamera}
              className="text-xs font-medium text-red-600 hover:text-red-700 underline"
            >
              Stop Camera
            </button>
          ) : (
            <button
              type="button"
              disabled={isLoading}
              onClick={startCamera}
              className="text-xs font-semibold text-cobalt hover:underline"
            >
              {isLoading ? "Starting…" : "Start Camera"}
            </button>
          )}
        </div>
      </div>

      {/* Video Viewport */}
      <div className="relative aspect-[4/3] w-full bg-slate-900 overflow-hidden flex items-center justify-center">
        {/* Hidden video element when not running */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`h-full w-full object-cover scale-x-[-1] transition-opacity duration-300 ${
            isRunning ? "opacity-100" : "opacity-0 absolute"
          }`}
        />

        {/* Real-time landmark & bounding box canvas overlay */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full pointer-events-none scale-x-[-1] ${
            isRunning ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Idle State Screen */}
        {cameraState.status === "idle" && (
          <div className="flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-xl backdrop-blur-sm">
              📹
            </div>
            <div>
              <p className="text-sm font-medium text-white">Camera is off</p>
              <p className="mt-1 text-xs text-white/60 max-w-[220px]">
                Enable camera to monitor face centering, distance, and sitting posture during your practice.
              </p>
            </div>
            <Button
              type="button"
              onClick={startCamera}
              className="mt-2 text-xs py-2 px-4 bg-white text-slate-900 hover:bg-white/90"
            >
              Enable Camera & Vision Analysis
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 p-6 text-center text-white backdrop-blur-xs z-10 space-y-3">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <p className="text-xs font-medium text-white/90">
              {cameraState.status === "requesting"
                ? "Requesting camera permissions…"
                : "Loading MediaPipe vision models…"}
            </p>
          </div>
        )}

        {/* Permission Denied State */}
        {cameraState.status === "denied" && (
          <div className="flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
            <div className="text-2xl">🚫</div>
            <p className="text-xs font-semibold text-rose-300">
              Camera Permission Denied
            </p>
            <p className="text-xs text-white/70 max-w-[240px] leading-relaxed">
              Camera access was blocked by your browser. Please click the lock or camera icon in your browser address bar to allow access.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={startCamera}
              className="text-xs py-1.5 px-3 border-white/30 text-white hover:bg-white/10"
            >
              Retry Permission
            </Button>
          </div>
        )}

        {/* Camera Unavailable / Error State */}
        {(cameraState.status === "unavailable" ||
          cameraState.status === "error") && (
          <div className="flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
            <div className="text-2xl">⚠️</div>
            <p className="text-xs font-semibold text-amber-300">
              Camera Unavailable
            </p>
            <p className="text-xs text-white/70 max-w-[240px] leading-relaxed">
              {cameraState.errorMessage || "Could not start video stream."}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={startCamera}
              className="text-xs py-1.5 px-3 border-white/30 text-white hover:bg-white/10"
            >
              Try Again
            </Button>
          </div>
        )}
      </div>

      {/* Live Feedback & Analysis Panel */}
      {isRunning && (
        <div className="p-4 space-y-3 bg-white">
          {/* Summary Badges Grid */}
          <div className="flex flex-wrap gap-1.5">
            {analysisResult?.summaryBadges.map((badge) => {
              const toneClasses = {
                ok: "bg-emerald-50 text-emerald-800 border-emerald-200",
                warn: "bg-amber-50 text-amber-800 border-amber-200",
                bad: "bg-rose-50 text-rose-800 border-rose-200",
                neutral: "bg-slate-50 text-slate-700 border-slate-200",
              }[badge.tone];

              return (
                <span
                  key={badge.id}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${toneClasses}`}
                >
                  {badge.label}
                </span>
              );
            })}
          </div>

          {/* Active Coaching Hint */}
          <div className="rounded-xl bg-slate-50 border border-line p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">
              Real-time Guidance
            </p>
            <p className="mt-1 text-xs text-ink/80 leading-relaxed font-medium">
              {analysisResult?.activeHints.length
                ? analysisResult.activeHints[0]
                : analysisResult?.face.feedbackMessage || "Looking good. Keep eye level with the camera."}
            </p>
          </div>

          <p className="text-[10px] text-mute leading-tight">
            Estimates for self-improvement only. Lighting, camera angles, and ergonomics affect results.
          </p>
        </div>
      )}
    </div>
  );
}

