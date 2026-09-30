// Loads Google's MediaPipe models and runs them on each camera frame.
// Both models run inside the browser (WebAssembly + the graphics chip). No video is uploaded.
//   Hand Landmarker: finds 21 points on your hand, in 2D (on the picture) and in 3D.
//   Face Detector:  finds your face and 6 points on it (eyes, nose, mouth, ears).

import { faceGeometry } from './location.js';

const VERSION = '1.0.1';
const BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}`;
const HAND_MODEL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const FACE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';

// mode: 'VIDEO' for the camera, 'IMAGE' for single pictures (used by the tests page).
export async function loadModels(mode = 'VIDEO') {
  const { FilesetResolver, HandLandmarker, FaceDetector } = await import(`${BASE}/vision_bundle.mjs`);
  const fileset = await FilesetResolver.forVisionTasks(`${BASE}/wasm`);

  const create = (delegate) =>
    Promise.all([
      HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: HAND_MODEL, delegate },
        runningMode: mode,
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      }),
      FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: FACE_MODEL, delegate },
        runningMode: mode,
        minDetectionConfidence: 0.5,
      }),
    ]);

  let hands;
  let faces;
  let delegate = 'GPU';
  try {
    [hands, faces] = await create('GPU');
  } catch (err) {
    // Some computers can't use the graphics chip from the browser. The processor works everywhere.
    console.warn('GPU not available, using CPU', err);
    delegate = 'CPU';
    [hands, faces] = await create('CPU');
  }
  return { hands, faces, delegate };
}

// Runs both models on one frame. Returns { hand: { pts, world } | null, face | null }.
// pts are in pixels of the source picture (not mirrored).
// t = the frame time in ms for video; leave it out for a single picture.
export function detect(models, source, W, H, t) {
  const isVideo = t !== undefined;
  const handResult = isVideo ? models.hands.detectForVideo(source, t) : models.hands.detect(source);
  const faceResult = isVideo ? models.faces.detectForVideo(source, t) : models.faces.detect(source);

  let hand = null;
  if (handResult.landmarks && handResult.landmarks.length) {
    const lm = handResult.landmarks[0];
    hand = {
      pts: lm.map((p) => ({ x: p.x * W, y: p.y * H })),
      world: handResult.worldLandmarks[0],
    };
  }

  let face = null;
  if (faceResult.detections && faceResult.detections.length) {
    // The biggest face is the person in front of the camera.
    const biggest = faceResult.detections.reduce((a, b) =>
      (b.boundingBox?.width || 0) > (a.boundingBox?.width || 0) ? b : a,
    );
    face = faceGeometry(biggest, W, H);
  }
  return { hand, face };
}
