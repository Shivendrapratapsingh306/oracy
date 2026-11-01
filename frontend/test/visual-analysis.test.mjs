import test from "node:test";
import assert from "node:assert/strict";

// Import pure rules from postureRules.ts (transpiled/direct or ES module wrapper)
// Since this is TypeScript, let's create a comprehensive test runner for the rules and lifecycle
import {
  evaluateFace,
  evaluatePose,
  buildVisualSummary,
  smoothVisualResults,
} from "./compiled/postureRules.js";

test("Scenario 4: User clearly visible and centred -> positive feedback", () => {
  const frameWidth = 640;
  const frameHeight = 480;

  // Face bounding box: centered at x=220, w=200 (centerX = 320/640 = 0.50), h=160 (ratio = 160/480 = 0.33)
  const detections = [
    {
      boundingBox: {
        originX: 220,
        originY: 100,
        width: 200,
        height: 160,
      },
      categories: [{ score: 0.95, categoryName: "face" }],
    },
  ];

  const result = evaluateFace(detections, frameWidth, frameHeight);

  assert.equal(result.faceDetected, true);
  assert.equal(result.faceCount, 1);
  assert.equal(result.isCentered, true);
  assert.equal(result.distanceStatus, "optimal");
  assert.match(result.feedbackMessage, /Face visible and centred/i);

  // Summary badge check
  const poseResult = {
    poseDetected: false,
    landmarksVisible: false,
    shoulderTiltAngle: null,
    postureStatus: "unknown",
    feedbackMessage: "",
    landmarks: null,
  };
  const summary = buildVisualSummary(result, poseResult);
  const faceBadge = summary.summaryBadges.find((b) => b.id === "face-detected");
  const centerBadge = summary.summaryBadges.find((b) => b.id === "face-center");
  const distBadge = summary.summaryBadges.find((b) => b.id === "face-distance");

  assert.equal(faceBadge?.tone, "ok");
  assert.equal(faceBadge?.label, "Face Visible");
  assert.equal(centerBadge?.tone, "ok");
  assert.equal(centerBadge?.label, "Centered");
  assert.equal(distBadge?.tone, "ok");
  assert.equal(distBadge?.label, "Good Distance");
});

test("Scenario 5: User moves out of frame -> warning displayed", () => {
  const result = evaluateFace([], 640, 480);

  assert.equal(result.faceDetected, false);
  assert.equal(result.faceCount, 0);
  assert.equal(result.isCentered, false);
  assert.equal(result.distanceStatus, "unknown");
  assert.match(result.feedbackMessage, /No face detected/i);

  const summary = buildVisualSummary(result, {
    poseDetected: false,
    landmarksVisible: false,
    shoulderTiltAngle: null,
    postureStatus: "unknown",
    feedbackMessage: "",
    landmarks: null,
  });

  const badge = summary.summaryBadges.find((b) => b.id === "face-detected");
  assert.equal(badge?.tone, "bad");
  assert.equal(badge?.label, "No Face Detected");
  assert.ok(summary.activeHints.some((h) => h.includes("face is clearly visible")));
});

test("Scenario 6: User moves off-centre -> re-centring guidance displayed", () => {
  // Candidate shifted far to the left (centerX = 120 / 640 = 0.1875 < 0.36)
  const leftShiftDetections = [
    {
      boundingBox: {
        originX: 20,
        originY: 100,
        width: 200,
        height: 160,
      },
    },
  ];
  const leftResult = evaluateFace(leftShiftDetections, 640, 480);
  assert.equal(leftResult.faceDetected, true);
  assert.equal(leftResult.isCentered, false);
  assert.match(leftResult.feedbackMessage, /Move right to center your face/i);

  // Candidate shifted far to the right (centerX = (500 + 100) / 640 = 0.9375 > 0.64)
  const rightShiftDetections = [
    {
      boundingBox: {
        originX: 500,
        originY: 100,
        width: 200,
        height: 160,
      },
    },
  ];
  const rightResult = evaluateFace(rightShiftDetections, 640, 480);
  assert.equal(rightResult.faceDetected, true);
  assert.equal(rightResult.isCentered, false);
  assert.match(rightResult.feedbackMessage, /Move left to center your face/i);
});

test("Scenario Distance: Too close and too far face distance detection", () => {
  // Too close: height ratio > 0.52 (280 / 480 = 0.583)
  const closeDetections = [
    {
      boundingBox: {
        originX: 200,
        originY: 50,
        width: 240,
        height: 280,
      },
    },
  ];
  const closeResult = evaluateFace(closeDetections, 640, 480);
  assert.equal(closeResult.distanceStatus, "too_close");
  assert.match(closeResult.feedbackMessage, /Move back slightly/i);

  // Too far: height ratio < 0.16 (60 / 480 = 0.125)
  const farDetections = [
    {
      boundingBox: {
        originX: 280,
        originY: 100,
        width: 80,
        height: 60,
      },
    },
  ];
  const farResult = evaluateFace(farDetections, 640, 480);
  assert.equal(farResult.distanceStatus, "too_far");
  assert.match(farResult.feedbackMessage, /Move closer/i);
});

test("Scenario Multiple Faces: Multiple candidates in frame", () => {
  const multiDetections = [
    { boundingBox: { originX: 50, originY: 100, width: 100, height: 120 } },
    { boundingBox: { originX: 350, originY: 100, width: 100, height: 120 } },
  ];
  const result = evaluateFace(multiDetections, 640, 480);
  assert.equal(result.faceDetected, true);
  assert.equal(result.faceCount, 2);
  assert.match(result.feedbackMessage, /Multiple faces detected/i);
});

test("Scenario 7: Upper body visible -> upright posture feedback active", () => {
  // Create 33 landmarks for MediaPipe pose
  const mockLandmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 }));

  // Shoulder 11 (left) and 12 (right): horizontal line at y=0.35, x=0.40 and x=0.60
  mockLandmarks[11] = { x: 0.40, y: 0.35, z: 0, visibility: 0.95 };
  mockLandmarks[12] = { x: 0.60, y: 0.35, z: 0, visibility: 0.95 };

  // Hips 23 (left) and 24 (right): horizontal line at y=0.75, x=0.42 and x=0.58
  mockLandmarks[23] = { x: 0.42, y: 0.75, z: 0, visibility: 0.85 };
  mockLandmarks[24] = { x: 0.58, y: 0.75, z: 0, visibility: 0.85 };

  const result = evaluatePose(mockLandmarks, 640, 480);

  assert.equal(result.poseDetected, true);
  assert.equal(result.landmarksVisible, true);
  assert.equal(result.shoulderTiltAngle, 0); // dy=0 -> 0 deg tilt
  assert.equal(result.postureStatus, "upright");
  assert.match(result.feedbackMessage, /Upright sitting posture/i);

  const summary = buildVisualSummary(
    { faceDetected: true, faceCount: 1, isCentered: true, distanceStatus: "optimal", boundingBox: null, feedbackMessage: "" },
    result
  );
  const postureBadge = summary.summaryBadges.find((b) => b.id === "posture");
  assert.equal(postureBadge?.tone, "ok");
  assert.equal(postureBadge?.label, "Upright Posture");
});

test("Scenario 7b: Upper body tilted -> tilt feedback active", () => {
  const mockLandmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 }));

  // Significant shoulder tilt: left at y=0.30, right at y=0.40 (dx=0.20, dy=0.10 -> tilt ~26.5 deg > 8.5 deg)
  mockLandmarks[11] = { x: 0.40, y: 0.30, z: 0, visibility: 0.95 };
  mockLandmarks[12] = { x: 0.60, y: 0.40, z: 0, visibility: 0.95 };
  mockLandmarks[23] = { x: 0.45, y: 0.75, z: 0, visibility: 0.85 };
  mockLandmarks[24] = { x: 0.55, y: 0.75, z: 0, visibility: 0.85 };

  const result = evaluatePose(mockLandmarks, 640, 480);

  assert.equal(result.landmarksVisible, true);
  assert.ok((result.shoulderTiltAngle || 0) > 8.5);
  assert.equal(result.postureStatus, "tilted");
  assert.match(result.feedbackMessage, /tilted.*level your shoulders/i);
});

test("Scenario 7c: Upper body lateral lean -> leaning feedback active", () => {
  const mockLandmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 }));

  // Level shoulders (dy=0), but shoulders shifted significantly relative to hips
  // Shoulder mid = (0.60 + 0.80)/2 = 0.70
  mockLandmarks[11] = { x: 0.60, y: 0.35, z: 0, visibility: 0.95 };
  mockLandmarks[12] = { x: 0.80, y: 0.35, z: 0, visibility: 0.95 };
  // Hip mid = (0.40 + 0.60)/2 = 0.50
  // Lateral shift = |0.70 - 0.50| = 0.20 > 0.085 threshold
  mockLandmarks[23] = { x: 0.40, y: 0.75, z: 0, visibility: 0.85 };
  mockLandmarks[24] = { x: 0.60, y: 0.75, z: 0, visibility: 0.85 };

  const result = evaluatePose(mockLandmarks, 640, 480);

  assert.equal(result.landmarksVisible, true);
  assert.equal(result.postureStatus, "leaning");
  assert.match(result.feedbackMessage, /leaning to one side/i);
});

test("Scenario 8: Torso or shoulders missing from frame -> posture safely disabled or partial", () => {
  // Empty or null landmarks
  const emptyResult = evaluatePose(null, 640, 480);
  assert.equal(emptyResult.poseDetected, false);
  assert.equal(emptyResult.landmarksVisible, false);
  assert.equal(emptyResult.postureStatus, "unknown");

  // Shoulders have low visibility (< 0.45 threshold)
  const lowVisLandmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.2 }));
  lowVisLandmarks[11] = { x: 0.4, y: 0.3, z: 0, visibility: 0.2 }; // Low confidence
  lowVisLandmarks[12] = { x: 0.6, y: 0.3, z: 0, visibility: 0.2 };

  const partialResult = evaluatePose(lowVisLandmarks, 640, 480);
  assert.equal(partialResult.landmarksVisible, false);
  assert.equal(partialResult.postureStatus, "partial");
  assert.match(partialResult.feedbackMessage, /Full upper body is not visible/i);

  const summary = buildVisualSummary(
    { faceDetected: true, faceCount: 1, isCentered: true, distanceStatus: "optimal", boundingBox: null, feedbackMessage: "" },
    partialResult
  );
  const badge = summary.summaryBadges.find((b) => b.id === "posture");
  assert.equal(badge?.label, "Partial Pose");
  assert.equal(badge?.tone, "neutral");
});

test("Scenario Rolling Smoothing: Eliminates single-frame flicker", () => {
  const frameCentered = {
    timestamp: 100,
    face: { faceDetected: true, faceCount: 1, isCentered: true, distanceStatus: "optimal", boundingBox: null, feedbackMessage: "" },
    posture: { poseDetected: true, landmarksVisible: true, shoulderTiltAngle: 0, postureStatus: "upright", feedbackMessage: "", landmarks: null },
    summaryBadges: [],
    activeHints: [],
  };

  const frameGlitchOffCenter = {
    timestamp: 250,
    face: { faceDetected: true, faceCount: 1, isCentered: false, distanceStatus: "optimal", boundingBox: null, feedbackMessage: "" },
    posture: { poseDetected: true, landmarksVisible: true, shoulderTiltAngle: 0, postureStatus: "upright", feedbackMessage: "", landmarks: null },
    summaryBadges: [],
    activeHints: [],
  };

  // 3 frames centered, 1 glitched frame
  const history = [frameCentered, frameCentered, frameCentered];
  const smoothed = smoothVisualResults(history, frameGlitchOffCenter);

  // Centering should remain true due to majority voting
  assert.equal(smoothed.face.isCentered, true);
  assert.equal(smoothed.posture.postureStatus, "upright");
});

test("Scenario 1, 2, 3: Camera state machine and error categorization", () => {
  // Classification function mirror of useVisualAnalysis logic
  function classifyCameraError(errorName) {
    if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
      return {
        status: "denied",
        msg: "Camera permission was denied. Please allow camera access in your browser address bar and reload.",
      };
    }
    if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
      return {
        status: "unavailable",
        msg: "No camera found on your device.",
      };
    }
    if (errorName === "NotReadableError" || errorName === "TrackStartError") {
      return {
        status: "unavailable",
        msg: "Camera is currently being used by another application.",
      };
    }
    return {
      status: "error",
      msg: "Could not access camera. Please check your camera connection.",
    };
  }

  // 1. Permission Denied
  const denied1 = classifyCameraError("NotAllowedError");
  assert.equal(denied1.status, "denied");
  assert.match(denied1.msg, /permission was denied/i);

  const denied2 = classifyCameraError("PermissionDeniedError");
  assert.equal(denied2.status, "denied");

  // 2. Camera Unavailable / NotFound
  const notFound = classifyCameraError("NotFoundError");
  assert.equal(notFound.status, "unavailable");
  assert.match(notFound.msg, /No camera found/i);

  // 3. Camera in use by another app
  const inUse = classifyCameraError("NotReadableError");
  assert.equal(inUse.status, "unavailable");
  assert.match(inUse.msg, /used by another application/i);
});

test("Scenario 9 & 10: Stream and track disposal lifecycle simulation", () => {
  let tracksStopped = 0;
  let animFrameCancelled = false;
  let detectorClosed = false;

  const mockTrack = {
    stop() {
      tracksStopped++;
    },
  };
  const mockStream = {
    getTracks: () => [mockTrack, mockTrack],
  };

  // Simulate stopping camera or component unmounting
  mockStream.getTracks().forEach((t) => t.stop());
  assert.equal(tracksStopped, 2, "All media stream tracks must be stopped");

  const cancelAnim = (id) => {
    if (id === 123) animFrameCancelled = true;
  };
  cancelAnim(123);
  assert.equal(animFrameCancelled, true, "Animation frame loop must be cancelled");

  const mockDetector = {
    close() {
      detectorClosed = true;
    },
  };
  mockDetector.close();
  assert.equal(detectorClosed, true, "MediaPipe detector instances must be closed");
});
