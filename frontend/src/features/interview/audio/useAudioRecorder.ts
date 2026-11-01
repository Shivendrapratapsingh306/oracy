"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AudioRecorderStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "paused"
  | "processing"
  | "completed"
  | "error";

export type AudioRecorderState = {
  status: AudioRecorderStatus;
  durationSeconds: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  errorMessage: string | null;
  audioLevel: number; // 0.0 to 1.0 normalized volume level
  assistiveTranscript: string;
};

const MAX_RECORDING_SECONDS = 300; // 5 minutes max per answer

export function useAudioRecorder() {
  const [state, setState] = useState<AudioRecorderState>({
    status: "idle",
    durationSeconds: 0,
    audioBlob: null,
    audioUrl: null,
    errorMessage: null,
    audioLevel: 0,
    assistiveTranscript: "",
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const assistiveTranscriptRef = useRef<string>("");

  // Determine best supported MIME type
  const getSupportedMimeType = () => {
    if (typeof window === "undefined" || !window.MediaRecorder) return "";
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
      "audio/wav",
    ];
    for (const mime of candidates) {
      if (MediaRecorder.isTypeSupported(mime)) return mime;
    }
    return "";
  };

  // Clean up all tracks and audio context
  const cleanupTracks = useCallback(() => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      window.cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }
  }, []);

  // Update volume level meter for UI visual feedback
  const trackAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    const normalized = Math.min(1.0, avg / 128.0);
    setState((prev) => (prev.status === "recording" ? { ...prev, audioLevel: normalized } : prev));

    animFrameRef.current = window.requestAnimationFrame(trackAudioLevel);
  }, []);

  // Stop recording action
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      setState((prev) => ({ ...prev, status: "processing" }));
      mediaRecorderRef.current.stop();
    }
    cleanupTracks();
  }, [cleanupTracks]);

  // Start recording action
  const startRecording = useCallback(async () => {
    cleanupTracks();
    chunksRef.current = [];
    assistiveTranscriptRef.current = "";

    setState({
      status: "requesting",
      durationSeconds: 0,
      audioBlob: null,
      audioUrl: null,
      errorMessage: null,
      audioLevel: 0,
      assistiveTranscript: "",
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Setup audio analyzer for volume pulse
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyserRef.current = analyser;
          animFrameRef.current = window.requestAnimationFrame(trackAudioLevel);
        }
      } catch (audioCtxErr) {
        console.warn("Could not create AudioContext:", audioCtxErr);
      }

      // Optional browser assistive speech recognition while recording
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-US";
          recognition.onresult = (event: any) => {
            let transcript = "";
            for (let i = 0; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript + " ";
            }
            assistiveTranscriptRef.current = transcript.trim();
            setState((prev) => ({ ...prev, assistiveTranscript: transcript.trim() }));
          };
          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch {}
      }

      // Setup MediaRecorder
      const mimeType = getSupportedMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const url = URL.createObjectURL(finalBlob);
        setState((prev) => ({
          ...prev,
          status: "completed",
          audioBlob: finalBlob,
          audioUrl: url,
          audioLevel: 0,
          assistiveTranscript: assistiveTranscriptRef.current,
        }));
      };

      recorder.onerror = () => {
        setState((prev) => ({
          ...prev,
          status: "error",
          errorMessage: "Audio recording encountered an unexpected error.",
        }));
      };

      recorder.start(500); // 500ms chunk intervals
      mediaRecorderRef.current = recorder;

      // Start elapsed timer
      timerIntervalRef.current = window.setInterval(() => {
        setState((prev) => {
          if (prev.status !== "recording") return prev;
          const nextSec = prev.durationSeconds + 1;
          if (nextSec >= MAX_RECORDING_SECONDS) {
            stopRecording();
          }
          return { ...prev, durationSeconds: nextSec };
        });
      }, 1000);

      setState((prev) => ({
        ...prev,
        status: "recording",
        errorMessage: null,
      }));
    } catch (err: any) {
      console.warn("Audio recording error:", err);
      let errorMsg = "Could not access microphone.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorMsg = "Microphone access was denied. Please allow microphone permissions in your browser.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errorMsg = "No microphone found on your device.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        errorMsg = "Microphone is in use by another application.";
      }

      setState({
        status: "error",
        durationSeconds: 0,
        audioBlob: null,
        audioUrl: null,
        errorMessage: errorMsg,
        audioLevel: 0,
        assistiveTranscript: "",
      });
      cleanupTracks();
    }
  }, [cleanupTracks, stopRecording, trackAudioLevel]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setState((prev) => ({ ...prev, status: "paused" }));
    }
  }, []);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setState((prev) => ({ ...prev, status: "recording" }));
    }
  }, []);

  // Reset / Cancel recording
  const cancelRecording = useCallback(() => {
    cleanupTracks();
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }
    chunksRef.current = [];
    assistiveTranscriptRef.current = "";
    setState({
      status: "idle",
      durationSeconds: 0,
      audioBlob: null,
      audioUrl: null,
      errorMessage: null,
      audioLevel: 0,
      assistiveTranscript: "",
    });
  }, [cleanupTracks, state.audioUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupTracks();
    };
  }, [cleanupTracks]);

  return {
    state,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
  };
}

