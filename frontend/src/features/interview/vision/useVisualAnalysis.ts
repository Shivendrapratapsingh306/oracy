"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CameraState,
  VisualAnalysisResult,
} from "./types";
import {
  evaluateFace,
  evaluatePose,
  smoothVisualResults,
} from "./postureRules";

const INFERENCE_INTERVAL_MS = 150; // ~6-7 FPS throttled detection avoids UI lag

export function useVisualAnalysis() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>({
    status: "idle",
    errorMessage: null,
    isModelLoading: false,
  });

  const [analysisResult, setAnalysisResult] = useState<VisualAnalysisResult | null>(null);

  // Model references
  const faceDetectorRef = useRef<any>(null);
  const poseLandmarkerRef = useRef<any>(null);
  const historyRef = useRef<VisualAnalysisResult[]>([]);
  const animFrameIdRef = useRef<number | null>(null);
  const lastInferenceTimeRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);

  // Initialize MediaPipe Vision Tasks
  const initModels = useCallback(async () => {
    if (faceDetectorRef.current && poseLandmarkerRef.current) return true;

    setCameraState((prev) => ({ ...prev, isModelLoading: true }));
    try {
      const vision = await import("@mediapipe/tasks-vision");
      const { FilesetResolver, FaceDetector, PoseLandmarker } = vision;

      // Try local WASM first, fallback to CDN
      let wasmResolver;
      try {
        wasmResolver = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      } catch {
        wasmResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
      }

      // Initialize Face Detector
      if (!faceDetectorRef.current) {
        faceDetectorRef.current = await FaceDetector.createFromOptions(wasmResolver, {
          baseOptions: {
            modelAssetPath: "/models/blaze_face_short_range.tflite",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.5,
        }).catch(async () => {
          // Fallback to CPU / remote asset if local GPU fails
          return await FaceDetector.createFromOptions(wasmResolver, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
            },
            runningMode: "VIDEO",
            minDetectionConfidence: 0.5,
          });
        });
      }

      // Initialize Pose Landmarker
      if (!poseLandmarkerRef.current) {
        poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(wasmResolver, {
          baseOptions: {
            modelAssetPath: "/models/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        }).catch(async () => {
          return await PoseLandmarker.createFromOptions(wasmResolver, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
            },
            runningMode: "VIDEO",
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
          });
        });
      }

      setCameraState((prev) => ({ ...prev, isModelLoading: false }));
      return true;
    } catch (error) {
      console.warn("Failed to load MediaPipe models:", error);
      setCameraState((prev) => ({
        ...prev,
        isModelLoading: false,
        errorMessage: "Computer vision models could not be loaded. Check your internet connection.",
      }));
      return false;
    }
  }, []);

  // Draw visual indicators (face bounding box + skeleton line) on overlay canvas
  const drawOverlay = useCallback(
    (
      canvas: HTMLCanvasElement,
      video: HTMLVideoElement,
      result: VisualAnalysisResult
    ) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const videoWidth = video.videoWidth || 640;
      const videoHeight = video.videoHeight || 480;

      if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
        canvas.width = videoWidth;
        canvas.height = videoHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Note: Video is mirrored with CSS scaleX(-1). We align canvas drawing in canvas coordinate space.
      // 1. Draw Face Bounding Box
      const faceBox = result.face.boundingBox;
      if (faceBox && result.face.faceDetected) {
        const isIdeal = result.face.isCentered && result.face.distanceStatus === "optimal";
        const strokeColor = isIdeal ? "#10b981" : "#f59e0b"; // Emerald if optimal, amber if adjusting

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = "round";

        // Draw rounded rectangle
        const r = 12;
        const x = faceBox.originX;
        const y = faceBox.originY;
        const w = faceBox.width;
        const h = faceBox.height;

        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.stroke();

        // Label tag
        ctx.fillStyle = strokeColor;
        ctx.font = "bold 11px system-ui, sans-serif";
        const labelText = isIdeal ? "Face · Centred" : `Face · ${result.face.isCentered ? "Adjust distance" : "Off-centre"}`;
        const textWidth = ctx.measureText(labelText).width;
        ctx.fillRect(x, Math.max(0, y - 22), textWidth + 12, 20);

        ctx.fillStyle = "#ffffff";
        ctx.fillText(labelText, x + 6, Math.max(14, y - 8));
      }

      // 2. Draw Shoulders & Posture Alignment Line
      const landmarks = result.posture.landmarks;
      if (landmarks && result.posture.landmarksVisible) {
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];

        if (leftShoulder && rightShoulder) {
          const lsX = leftShoulder.x * canvas.width;
          const lsY = leftShoulder.y * canvas.height;
          const rsX = rightShoulder.x * canvas.width;
          const rsY = rightShoulder.y * canvas.height;

          const isUpright = result.posture.postureStatus === "upright";
          const poseColor = isUpright ? "#3b82f6" : "#f97316";

          // Shoulder connection line
          ctx.strokeStyle = poseColor;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(lsX, lsY);
          ctx.lineTo(rsX, rsY);
          ctx.stroke();

          // Shoulder joint markers
          for (const [px, py] of [
            [lsX, lsY],
            [rsX, rsY],
          ]) {
            ctx.fillStyle = poseColor;
            ctx.beginPath();
            ctx.arc(px, py, 5, 0, 2 * Math.PI);
            ctx.fill();

            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }
    },
    []
  );

  // Main real-time frame processing loop
  const processFrame = useCallback(() => {
    if (!isRunningRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (
      video &&
      video.readyState >= 2 &&
      !video.paused &&
      !video.ended &&
      faceDetectorRef.current &&
      poseLandmarkerRef.current
    ) {
      const now = performance.now();
      if (now - lastInferenceTimeRef.current >= INFERENCE_INTERVAL_MS) {
        lastInferenceTimeRef.current = now;

        try {
          const width = video.videoWidth || 640;
          const height = video.videoHeight || 480;

          // Run real-time detection on the video frame
          const faceResult = faceDetectorRef.current.detectForVideo(video, now);
          const poseResult = poseLandmarkerRef.current.detectForVideo(video, now);

          // Evaluate with rules
          const faceAnalysis = evaluateFace(faceResult.detections || [], width, height);
          const firstPoseLandmarks = poseResult.landmarks?.[0] || null;
          const postureAnalysis = evaluatePose(firstPoseLandmarks, width, height);

          // Initial raw result
          const rawResult: VisualAnalysisResult = {
            timestamp: now,
            face: faceAnalysis,
            posture: postureAnalysis,
            summaryBadges: [],
            activeHints: [],
          };

          // Smooth detections over rolling frames to avoid UI flicker
          const smoothed = smoothVisualResults(historyRef.current, rawResult);
          historyRef.current = [...historyRef.current.slice(-6), smoothed];

          setAnalysisResult(smoothed);

          // Draw visual landmarks overlay
          if (canvas) {
            drawOverlay(canvas, video, smoothed);
          }
        } catch (inferenceError) {
          console.warn("Video frame inference error:", inferenceError);
        }
      }
    }

    animFrameIdRef.current = requestAnimationFrame(processFrame);
  }, [drawOverlay]);

  // Start Camera Feed & Real-time Visual Analysis
  const startCamera = useCallback(async () => {
    if (cameraState.status === "requesting" || cameraState.status === "running") return;

    setCameraState({
      status: "requesting",
      errorMessage: null,
      isModelLoading: false,
    });

    try {
      // 1. Request user permission explicitly
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraState({
        status: "running",
        errorMessage: null,
        isModelLoading: true,
      });

      // 2. Load Computer Vision models in background
      const modelsReady = await initModels();
      if (!modelsReady) {
        // Models failed to load, but camera feed can still display
        return;
      }

      // 3. Start processing loop
      isRunningRef.current = true;
      animFrameIdRef.current = requestAnimationFrame(processFrame);
    } catch (error: any) {
      console.warn("Camera start error:", error);
      let status: CameraState["status"] = "error";
      let msg = "Could not access camera. Please check your camera connection.";

      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        status = "denied";
        msg =
          "Camera permission was denied. Please allow camera access in your browser address bar and reload.";
      } else if (
        error.name === "NotFoundError" ||
        error.name === "DevicesNotFoundError"
      ) {
        status = "unavailable";
        msg = "No camera found on your device.";
      } else if (
        error.name === "NotReadableError" ||
        error.name === "TrackStartError"
      ) {
        status = "unavailable";
        msg = "Camera is currently being used by another application.";
      }

      setCameraState({
        status,
        errorMessage: msg,
        isModelLoading: false,
      });
    }
  }, [cameraState.status, initModels, processFrame]);

  // Stop Camera & Dispose Stream
  const stopCamera = useCallback(() => {
    isRunningRef.current = false;
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    historyRef.current = [];
    setAnalysisResult(null);
    setCameraState({
      status: "idle",
      errorMessage: null,
      isModelLoading: false,
    });
  }, []);

  // Cleanup on unmount or navigation away
  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (faceDetectorRef.current?.close) {
        try {
          faceDetectorRef.current.close();
        } catch {}
      }
      if (poseLandmarkerRef.current?.close) {
        try {
          poseLandmarkerRef.current.close();
        } catch {}
      }
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    cameraState,
    analysisResult,
    startCamera,
    stopCamera,
  };
}

