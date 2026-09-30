// The handshapes SignSpeak knows. Each one is a short list of checks.
// Every check gives a score from 0 (no) to 1 (yes) plus a hint that tells you how to fix it.
// The handshape's score is its weakest check, so one wrong finger is enough to say "not yet".

import { ramp } from './features.js';

// The numbers come from real hands: MediaPipe on photos of ASL letters (see tests/real-hands.html).
// Straight fingers bend about 20-75 degrees in total, fingers in a fist 160-270.
const straight = (f, finger) => ramp(f.fingers[finger].curl, 110, 75);
const folded = (f, finger) => ramp(f.fingers[finger].curl, 110, 150);
const notFolded = (f, finger) => ramp(f.fingers[finger].curl, 190, 155);
const touchesThumb = (f, finger, near, far) => ramp(f.fingers[finger].tipToThumb, far, near);
// In a fist the fingertips come back close to the wrist (under 1.05 palm lengths).
const longestReach = (f) => Math.max(f.fingers.index.reach, f.fingers.middle.reach);

export const HANDSHAPES = {
  B: {
    name: 'Flat hand',
    checks: [
      [(f) => straight(f, 'index'), 'Straighten your index finger'],
      [(f) => straight(f, 'middle'), 'Straighten your middle finger'],
      [(f) => straight(f, 'ring'), 'Straighten your ring finger'],
      [(f) => straight(f, 'pinky'), 'Straighten your pinky'],
      [(f) => ramp(f.spread, 1.7, 1.45), 'Keep your fingers together'],
    ],
  },
  FIVE: {
    name: 'Open hand',
    checks: [
      [(f) => straight(f, 'index'), 'Straighten your index finger'],
      [(f) => straight(f, 'middle'), 'Straighten your middle finger'],
      [(f) => straight(f, 'ring'), 'Straighten your ring finger'],
      [(f) => straight(f, 'pinky'), 'Straighten your pinky'],
      [(f) => ramp(f.spread, 1.45, 1.7), 'Spread your fingers apart'],
      [(f) => ramp(f.thumbOut, 0.5, 0.66), 'Stick your thumb out'],
    ],
  },
  FIST: {
    name: 'Fist',
    checks: [
      [(f) => folded(f, 'index'), 'Fold your index finger into a fist'],
      [(f) => folded(f, 'middle'), 'Fold your middle finger into a fist'],
      [(f) => folded(f, 'ring'), 'Fold your ring finger into a fist'],
      [(f) => folded(f, 'pinky'), 'Fold your pinky into a fist'],
      [(f) => ramp(longestReach(f), 1.2, 1.02), 'Squeeze your fingers into your palm'],
    ],
  },
  ILY: {
    name: 'I-love-you hand',
    checks: [
      [(f) => straight(f, 'index'), 'Point your index finger up'],
      [(f) => straight(f, 'pinky'), 'Stick your pinky up'],
      [(f) => folded(f, 'middle'), 'Fold your middle finger down'],
      [(f) => folded(f, 'ring'), 'Fold your ring finger down'],
      [(f) => ramp(f.thumbOut, 0.5, 0.66), 'Stick your thumb out to the side'],
    ],
  },
  FLAT_O: {
    name: 'Flat O',
    checks: [
      [(f) => touchesThumb(f, 'index', 0.32, 0.55), 'Touch your index fingertip to your thumb'],
      [(f) => touchesThumb(f, 'middle', 0.36, 0.6), 'Touch your middle fingertip to your thumb'],
      [(f) => touchesThumb(f, 'ring', 0.5, 0.8), 'Bring your ring finger to your thumb too'],
      [(f) => notFolded(f, 'index'), 'Keep your fingers long, not in a fist'],
      [(f) => ramp(longestReach(f), 1.0, 1.15), 'Keep your fingers long, not in a fist'],
    ],
  },
  TWO: {
    name: 'Two fingers and thumb',
    checks: [
      [(f) => notFolded(f, 'index'), 'Hold your index finger out'],
      [(f) => notFolded(f, 'middle'), 'Hold your middle finger out'],
      [(f) => folded(f, 'ring'), 'Fold your ring finger down'],
      [(f) => folded(f, 'pinky'), 'Fold your pinky down'],
    ],
  },
};

export const SHAPE_IDS = Object.keys(HANDSHAPES);

// Score one handshape: { score, hint }. The hint belongs to the weakest check.
export function scoreShape(features, id) {
  let score = 1;
  let hint = '';
  for (const [check, text] of HANDSHAPES[id].checks) {
    const s = check(features);
    if (s < score) {
      score = s;
      hint = text;
    }
  }
  return { score, hint };
}

export function scoreAllShapes(features) {
  const out = {};
  for (const id of SHAPE_IDS) out[id] = scoreShape(features, id);
  return out;
}

// The best handshape, or null if nothing is a clear match.
export function bestShape(scores, minimum = 0.5) {
  let best = null;
  let bestScore = minimum;
  for (const id of SHAPE_IDS) {
    const s = scores[id].score;
    if (s > bestScore) {
      best = id;
      bestScore = s;
    }
  }
  return best;
}
