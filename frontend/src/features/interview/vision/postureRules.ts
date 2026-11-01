import {
  BoundingBox,
  FaceAnalysis,
  Point3D,
  PostureAnalysis,
  VisualAnalysisResult,
  VisualFeedbackBadge,
} from "./types";

/**
 * Raw detection input shapes (MediaPipe / custom computer vision).
 */
export type RawFaceDetection = {
  boundingBox?: {
    originX: number;
    originY: number;
    width: number;
    height: number;
  };
  categories?: Array<{ score?: number; categoryName?: string }>;
};

/**
 * Evaluates face detection inputs according to explicit positioning and distance thresholds.
 */
export function evaluateFace(
  detections: RawFaceDetection[],
  frameWidth: number,
  frameHeight: number
): FaceAnalysis {
  const count = detections.length;

  if (count === 0 || frameWidth <= 0 || frameHeight <= 0) {
    return {
      faceDetected: false,
      faceCount: 0,
      isCentered: false,
      distanceStatus: "unknown",
      boundingBox: null,
      feedbackMessage: "No face detected in camera view",
    };
  }

  if (count > 1) {
    const firstBox = detections[0].boundingBox;
    return {
      faceDetected: true,
      faceCount: count,
      isCentered: false,
      distanceStatus: "unknown",
      boundingBox: firstBox
        ? {
            originX: firstBox.originX,
            originY: firstBox.originY,
            width: firstBox.width,
            height: firstBox.height,
          }
        : null,
      feedbackMessage: "Multiple faces detected — ensure you are alone in frame",
    };
  }

  const rawBox = detections[0].boundingBox;
  if (!rawBox || rawBox.width <= 0 || rawBox.height <= 0) {
    return {
      faceDetected: true,
      faceCount: 1,
      isCentered: false,
      distanceStatus: "unknown",
      boundingBox: null,
      feedbackMessage: "Face visible",
    };
  }

  const box: BoundingBox = {
    originX: rawBox.originX,
    originY: rawBox.originY,
    width: rawBox.width,
    height: rawBox.height,
  };

  // Calculate center relative to frame dimensions (0.0 to 1.0)
  const centerX = (box.originX + box.width / 2) / frameWidth;
  const heightRatio = box.height / frameHeight;

  // Horizontal Centering: Center zone is between 36% and 64% of frame width
  const isCentered = centerX >= 0.36 && centerX <= 0.64;

  // Distance estimation based on face height relative to frame height
  let distanceStatus: FaceAnalysis["distanceStatus"] = "optimal";
  if (heightRatio > 0.52) {
    distanceStatus = "too_close";
  } else if (heightRatio < 0.16) {
    distanceStatus = "too_far";
  }

  // Generate actionable, non-flickering message
  let feedbackMessage = "Face visible and centred";
  if (!isCentered) {
    feedbackMessage =
      centerX < 0.36
        ? "Move right to center your face"
        : "Move left to center your face";
  } else if (distanceStatus === "too_close") {
    feedbackMessage = "Move back slightly from the camera";
  } else if (distanceStatus === "too_far") {
    feedbackMessage = "Move closer to the camera";
  }

  return {
    faceDetected: true,
    faceCount: 1,
    isCentered,
    distanceStatus,
    boundingBox: box,
    feedbackMessage,
  };
}

/**
 * Evaluates pose landmarks (MediaPipe 33 keypoints) for upper-body posture,
 * shoulder alignment, and torso lean.
 */
export function evaluatePose(
  landmarks: Point3D[] | null | undefined,
  _frameWidth: number,
  _frameHeight: number
): PostureAnalysis {
  if (!landmarks || landmarks.length < 25) {
    return {
      poseDetected: false,
      landmarksVisible: false,
      shoulderTiltAngle: null,
      postureStatus: "unknown",
      feedbackMessage: "Full upper body is not visible",
      landmarks: null,
    };
  }

  // Key landmark indices (MediaPipe Pose specification)
  // 11: left_shoulder, 12: right_shoulder, 23: left_hip, 24: right_hip
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  const minVisibility = 0.45;
  const shouldersVisible =
    (leftShoulder?.visibility ?? 1.0) >= minVisibility &&
    (rightShoulder?.visibility ?? 1.0) >= minVisibility;

  if (!shouldersVisible) {
    return {
      poseDetected: true,
      landmarksVisible: false,
      shoulderTiltAngle: null,
      postureStatus: "partial",
      feedbackMessage: "Full upper body is not visible — adjust camera angle",
      landmarks,
    };
  }

  // Calculate shoulder tilt angle deviation from horizontal in degrees
  const dx = rightShoulder.x - leftShoulder.x;
  const dy = rightShoulder.y - leftShoulder.y;
  const angleRad = Math.atan2(dy, dx);
  // Normal horizontal line has angle 0 or PI. Deviation from horizontal:
  let tiltDeg = Math.abs((angleRad * 180) / Math.PI);
  if (tiltDeg > 90) {
    tiltDeg = Math.abs(180 - tiltDeg);
  }
  const roundedTilt = Math.round(tiltDeg * 10) / 10;

  // Torso lean: compare shoulder midpoint with hip midpoint if hips are visible
  const hipsVisible =
    (leftHip?.visibility ?? 1.0) >= 0.4 && (rightHip?.visibility ?? 1.0) >= 0.4;

  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
  let isLeaning = false;
  if (hipsVisible) {
    const hipMidX = (leftHip.x + rightHip.x) / 2;
    const lateralShift = Math.abs(shoulderMidX - hipMidX);
    if (lateralShift > 0.085) {
      isLeaning = true;
    }
  }

  // Classify posture
  const isTilted = roundedTilt > 8.5;

  let postureStatus: PostureAnalysis["postureStatus"] = "upright";
  let feedbackMessage = "Upright sitting posture";

  if (isTilted) {
    postureStatus = "tilted";
    feedbackMessage = "Upper body appears tilted — level your shoulders";
  } else if (isLeaning) {
    postureStatus = "leaning";
    feedbackMessage = "Upper body is leaning to one side — sit upright";
  } else if (!hipsVisible) {
    // Shoulders are level and visible, but hips aren't in frame
    postureStatus = "upright";
    feedbackMessage = "Good shoulder alignment";
  }

  return {
    poseDetected: true,
    landmarksVisible: true,
    shoulderTiltAngle: roundedTilt,
    postureStatus,
    feedbackMessage,
    landmarks,
  };
}

/**
 * Builds compact summary status badges and active hints based on smoothed results.
 */
export function buildVisualSummary(
  face: FaceAnalysis,
  posture: PostureAnalysis
): { summaryBadges: VisualFeedbackBadge[]; activeHints: string[] } {
  const summaryBadges: VisualFeedbackBadge[] = [];
  const activeHints: string[] = [];

  // 1. Face visibility badge
  if (!face.faceDetected) {
    summaryBadges.push({
      id: "face-detected",
      label: "No Face Detected",
      tone: "bad",
    });
    activeHints.push("Make sure your face is clearly visible to the camera.");
  } else if (face.faceCount > 1) {
    summaryBadges.push({
      id: "face-count",
      label: "Multiple Faces",
      tone: "warn",
    });
    activeHints.push("Multiple people detected in view. Maintain a solo interview setting.");
  } else {
    summaryBadges.push({
      id: "face-detected",
      label: "Face Visible",
      tone: "ok",
    });

    // Centering & Framing badge
    if (face.isCentered) {
      summaryBadges.push({
        id: "face-center",
        label: "Centered",
        tone: "ok",
      });
    } else {
      summaryBadges.push({
        id: "face-center",
        label: "Off-Center",
        tone: "warn",
      });
      activeHints.push(face.feedbackMessage);
    }

    // Distance badge
    if (face.distanceStatus === "optimal") {
      summaryBadges.push({
        id: "face-distance",
        label: "Good Distance",
        tone: "ok",
      });
    } else if (face.distanceStatus === "too_close") {
      summaryBadges.push({
        id: "face-distance",
        label: "Too Close",
        tone: "warn",
      });
      activeHints.push("Move back slightly to maintain professional interview framing.");
    } else if (face.distanceStatus === "too_far") {
      summaryBadges.push({
        id: "face-distance",
        label: "Too Far",
        tone: "warn",
      });
      activeHints.push("Move a little closer so your facial expressions are clear.");
    }
  }

  // 2. Posture badge
  if (posture.postureStatus === "upright") {
    summaryBadges.push({
      id: "posture",
      label: "Upright Posture",
      tone: "ok",
    });
  } else if (posture.postureStatus === "tilted") {
    summaryBadges.push({
      id: "posture",
      label: "Shoulders Tilted",
      tone: "warn",
    });
    activeHints.push("Upper body appears tilted. Keep your shoulders level and relaxed.");
  } else if (posture.postureStatus === "leaning") {
    summaryBadges.push({
      id: "posture",
      label: "Leaning",
      tone: "warn",
    });
    activeHints.push("Avoid leaning to one side. Sit centered and balanced.");
  } else if (posture.postureStatus === "partial") {
    summaryBadges.push({
      id: "posture",
      label: "Partial Pose",
      tone: "neutral",
    });
    activeHints.push("Adjust your camera so your head and upper chest/shoulders are visible.");
  }

  return { summaryBadges, activeHints };
}

/**
 * Smooths analysis results across a sliding window of recent frames (hysteresis)
 * to eliminate single-frame flickering while maintaining responsive feedback.
 */
export function smoothVisualResults(
  history: VisualAnalysisResult[],
  latest: VisualAnalysisResult
): VisualAnalysisResult {
  if (history.length === 0) return latest;

  const windowSize = 4;
  const recent = [...history.slice(-(windowSize - 1)), latest];

  // Majority vote for face detection presence
  const faceDetectedVotes = recent.filter((r) => r.face.faceDetected).length;
  const isFaceDetected = faceDetectedVotes >= Math.ceil(recent.length / 2);

  // Majority vote for centering
  const centeredVotes = recent.filter((r) => r.face.isCentered).length;
  const isCentered = centeredVotes >= Math.ceil(recent.length / 2);

  // Majority vote for posture status
  const postureCounts: Record<string, number> = {};
  for (const r of recent) {
    postureCounts[r.posture.postureStatus] =
      (postureCounts[r.posture.postureStatus] || 0) + 1;
  }
  let dominantPosture = latest.posture.postureStatus;
  let maxVotes = 0;
  for (const [status, count] of Object.entries(postureCounts)) {
    if (count > maxVotes) {
      maxVotes = count;
      dominantPosture = status as PostureAnalysis["postureStatus"];
    }
  }

  const smoothedFace: FaceAnalysis = {
    ...latest.face,
    faceDetected: isFaceDetected,
    isCentered: isCentered,
    feedbackMessage: isFaceDetected
      ? isCentered
        ? latest.face.distanceStatus === "optimal"
          ? "Face visible and centred"
          : latest.face.feedbackMessage
        : latest.face.feedbackMessage
      : "No face detected in camera view",
  };

  const smoothedPosture: PostureAnalysis = {
    ...latest.posture,
    postureStatus: dominantPosture,
    feedbackMessage:
      dominantPosture === "upright"
        ? "Upright sitting posture"
        : dominantPosture === "tilted"
        ? "Upper body appears tilted — level your shoulders"
        : dominantPosture === "leaning"
        ? "Upper body is leaning to one side — sit upright"
        : dominantPosture === "partial"
        ? "Full upper body is not visible — adjust camera angle"
        : "Position yourself in front of the camera",
  };

  const { summaryBadges, activeHints } = buildVisualSummary(
    smoothedFace,
    smoothedPosture
  );

  return {
    timestamp: latest.timestamp,
    face: smoothedFace,
    posture: smoothedPosture,
    summaryBadges,
    activeHints,
  };
}
