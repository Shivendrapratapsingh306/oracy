export type BoundingBox = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

export type Point3D = {
  x: number;
  y: number;
  z: number;
  visibility?: number;
};

export type FaceAnalysis = {
  faceDetected: boolean;
  faceCount: number;
  isCentered: boolean;
  distanceStatus: "optimal" | "too_close" | "too_far" | "unknown";
  boundingBox: BoundingBox | null;
  feedbackMessage: string;
};

export type PostureAnalysis = {
  poseDetected: boolean;
  landmarksVisible: boolean;
  shoulderTiltAngle: number | null;
  postureStatus: "upright" | "tilted" | "leaning" | "partial" | "unknown";
  feedbackMessage: string;
  landmarks: Point3D[] | null;
};

export type VisualFeedbackBadge = {
  id: string;
  label: string;
  tone: "ok" | "warn" | "neutral" | "bad";
};

export type VisualAnalysisResult = {
  timestamp: number;
  face: FaceAnalysis;
  posture: PostureAnalysis;
  summaryBadges: VisualFeedbackBadge[];
  activeHints: string[];
};

export type CameraStatus =
  | "idle"
  | "requesting"
  | "running"
  | "denied"
  | "unavailable"
  | "error";

export type CameraState = {
  status: CameraStatus;
  errorMessage: string | null;
  isModelLoading: boolean;
};

