"use client";

import { useState } from "react";
import { useAudioRecorder } from "./useAudioRecorder";
import { Button } from "@/components/Button";
import { SpeakingMetrics, submitAudioAnswer, AudioAnswerResponse } from "@/services/api";
import { useTranslation } from "@/features/i18n/LanguageContext";

type Props = {
  sessionId: string;
  questionId: string;
  onTranscriptReady: (transcript: string, metrics?: SpeakingMetrics) => void;
  language?: string;
  className?: string;
};

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

export function AudioAnswerRecorder({
  sessionId,
  questionId,
  onTranscriptReady,
  language = "en",
  className = "",
}: Props) {
  const { t } = useTranslation();
  const {
    state,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecorder();

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<SpeakingMetrics | null>(null);

  // Handle upload & transcription
  async function handleTranscribeAndSubmit(blobToSubmit?: Blob) {
    const blob = blobToSubmit || state.audioBlob;
    if (!blob) return;

    setIsTranscribing(true);
    setTranscribeError(null);
    try {
      const resp: AudioAnswerResponse = await submitAudioAnswer(
        sessionId,
        questionId,
        blob,
        state.durationSeconds,
        state.assistiveTranscript
      );
      setMetrics(resp.speaking_metrics);
      onTranscriptReady(resp.transcript, resp.speaking_metrics);
    } catch (err: any) {
      setTranscribeError(
        err instanceof Error ? err.message : "Failed to transcribe audio answer."
      );
    } finally {
      setIsTranscribing(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border border-line bg-card p-4 transition-all shadow-xs ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {state.status === "recording" ? (
            <span className="flex h-3 w-3 relative">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"
                style={{
                  transform: `scale(${1 + state.audioLevel * 1.5})`,
                }}
              />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
            </span>
          ) : (
            <span className="text-base">🎙️</span>
          )}
          <span className="text-xs font-semibold uppercase tracking-wider text-ink">
            {state.status === "recording"
              ? "Recording Answer…"
              : state.status === "paused"
              ? "Recording Paused"
              : state.status === "completed"
              ? "Recording Captured"
              : "Voice Recording"}
          </span>
          {state.status === "recording" && (
            <span className="font-mono text-xs font-semibold text-red-600 animate-pulse">
              {formatDuration(state.durationSeconds)} / 05:00
            </span>
          )}
          {state.status === "paused" && (
            <span className="font-mono text-xs font-medium text-amber-600">
              {formatDuration(state.durationSeconds)} (Paused)
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {state.status === "idle" && (
            <Button
              type="button"
              variant="outline"
              onClick={startRecording}
              className="text-xs py-1.5 px-3 border-cobalt/30 text-cobalt hover:bg-cobalt/5 flex items-center gap-1.5"
            >
              <span>●</span> Record Answer
            </Button>
          )}

          {state.status === "recording" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={pauseRecording}
                className="text-xs py-1 px-2.5"
              >
                Pause
              </Button>
              <Button
                type="button"
                onClick={stopRecording}
                className="text-xs py-1 px-3 bg-red-600 text-white hover:bg-red-700"
              >
                Stop Recording
              </Button>
            </>
          )}

          {state.status === "paused" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={resumeRecording}
                className="text-xs py-1 px-2.5 text-cobalt"
              >
                Resume
              </Button>
              <Button
                type="button"
                onClick={stopRecording}
                className="text-xs py-1 px-3 bg-red-600 text-white hover:bg-red-700"
              >
                Stop & Review
              </Button>
            </>
          )}

          {state.status === "completed" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={cancelRecording}
                className="text-xs py-1 px-2.5 text-slate-600"
                disabled={isTranscribing}
              >
                Re-record
              </Button>
              <Button
                type="button"
                onClick={() => handleTranscribeAndSubmit()}
                disabled={isTranscribing}
                className="text-xs py-1 px-3.5"
              >
                {isTranscribing ? "Transcribing & Evaluating…" : "Transcribe & Submit Audio"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Audio Playback & Assistive Transcript Preview */}
      {state.status === "completed" && state.audioUrl && (
        <div className="mt-3 pt-3 border-t border-line/60 flex flex-wrap items-center justify-between gap-3">
          <audio controls src={state.audioUrl} className="h-9 w-full max-w-sm rounded-lg" />
          <span className="text-[11px] text-mute">
            Duration: {formatDuration(state.durationSeconds)}
          </span>
        </div>
      )}

      {/* Error Displays */}
      {(state.errorMessage || transcribeError) && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <p className="font-semibold">Recording error:</p>
          <p className="mt-0.5">{state.errorMessage || transcribeError}</p>
          {state.status === "error" && (
            <Button
              type="button"
              variant="outline"
              onClick={startRecording}
              className="mt-2 text-xs py-1 px-2.5 border-red-300 text-red-800 hover:bg-red-100"
            >
              Retry Microphone
            </Button>
          )}
        </div>
      )}

      {/* Speaking Metrics Pill Banner if available */}
      {metrics && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-emerald-900 uppercase tracking-wider text-[11px]">
              Speech Delivery Analysis
            </span>
            <span className="text-[11px] text-emerald-700">
              {metrics.speaking_rate_category.toUpperCase()} PACING
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-lg bg-white p-2 border border-emerald-100">
              <span className="text-[10px] text-mute uppercase font-semibold">Pace</span>
              <p className="font-display text-sm font-semibold text-emerald-950">
                {metrics.speaking_rate_wpm} <span className="text-[10px] font-normal">WPM</span>
              </p>
            </div>
            <div className="rounded-lg bg-white p-2 border border-emerald-100">
              <span className="text-[10px] text-mute uppercase font-semibold">Pauses / Silence</span>
              <p className="font-display text-sm font-semibold text-emerald-950">
                {metrics.silence_percentage}%
              </p>
            </div>
            <div className="rounded-lg bg-white p-2 border border-emerald-100">
              <span className="text-[10px] text-mute uppercase font-semibold">Filler Words</span>
              <p className="font-display text-sm font-semibold text-emerald-950">
                {metrics.filler_word_count}
              </p>
            </div>
            <div className="rounded-lg bg-white p-2 border border-emerald-100">
              <span className="text-[10px] text-mute uppercase font-semibold">Word Count</span>
              <p className="font-display text-sm font-semibold text-emerald-950">
                {metrics.word_count}
              </p>
            </div>
          </div>

          {metrics.overall_pacing_feedback && (
            <p className="mt-2 text-[11px] text-emerald-900/80 leading-relaxed">
              💡 {metrics.overall_pacing_feedback}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

