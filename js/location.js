// Where is the hand, compared with the face and body?
// MediaPipe's face detector gives 6 points: 2 eyes, nose, mouth and 2 ears.
// From them we estimate the forehead, chin and chest, and measure everything in
// "face widths", so it works close to the camera and far away.

import { ramp } from './features.js';

const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
export const dist2d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// detection = one MediaPipe face. W, H = video size in pixels.
export function faceGeometry(detection, W, H) {
  const k = detection.keypoints;
  if (!k || k.length < 4) return null;
  const P = (i) => ({ x: k[i].x * W, y: k[i].y * H });
  const eyes = mid(P(0), P(1));
  const mouth = P(3);
  const box = detection.boundingBox;
  const fw = box && box.width > 0 ? box.width : dist2d(P(0), P(1)) * 2.3;

  // "Down" for this face, so a tilted head still works.
  let down = { x: mouth.x - eyes.x, y: mouth.y - eyes.y };
  const em = Math.hypot(down.x, down.y) || fw * 0.35;
  down = { x: down.x / em, y: down.y / em };
  const at = (from, amount) => ({ x: from.x + down.x * amount, y: from.y + down.y * amount });

  return {
    fw,
    eyes,
    mouth,
    chin: at(mouth, em * 0.6),
    forehead: at(eyes, -em * 0.95),
    chest: at(mouth, em * 0.6 + fw * 1.15),
  };
}

// The target spot for each place (used for scoring and for the yellow ring on screen).
export function targetFor(where, face) {
  if (!face) return null;
  switch (where) {
    case 'chin':
      return { ...mid(face.mouth, face.chin), r: 0.42 * face.fw };
    case 'mouth':
      return { ...face.mouth, r: 0.36 * face.fw };
    case 'forehead':
      return { ...face.forehead, r: 0.55 * face.fw };
    case 'chest':
      return { ...face.chest, r: 0.9 * face.fw };
    default:
      return null;
  }
}

// 0..1: how well point p is at the place.
export function locationScore(where, p, face) {
  if (where === 'any') return 1;
  if (!face) return 0;
  const fw = face.fw;
  const t = targetFor(where, face);
  switch (where) {
    case 'chin':
      return ramp(dist2d(p, t), 0.8 * fw, 0.42 * fw);
    case 'mouth':
      return ramp(dist2d(p, t), 0.72 * fw, 0.36 * fw);
    case 'forehead':
      return ramp(Math.hypot((p.x - t.x) / (0.7 * fw), (p.y - t.y) / (0.45 * fw)), 1.6, 1);
    case 'chest':
      if (p.y < face.chin.y + 0.15 * fw) return 0;
      return ramp(Math.hypot((p.x - t.x) / (1.25 * fw), (p.y - t.y) / (0.95 * fw)), 1.6, 1);
    default:
      return 0;
  }
}

export function palmCenter(pts) {
  const ids = [0, 5, 9, 13, 17];
  let x = 0;
  let y = 0;
  for (const i of ids) {
    x += pts[i].x;
    y += pts[i].y;
  }
  return { x: x / ids.length, y: y / ids.length };
}

// Which points of the hand have to be at the place.
export function anchorPoints(anchor, pts) {
  switch (anchor) {
    case 'tips':
      return [pts[8], pts[12]];
    case 'thumb':
      return [pts[4]];
    case 'pinch':
      return [pts[4], pts[8], pts[12]];
    default:
      return [palmCenter(pts)];
  }
}

export const PLACE_WORDS = {
  forehead: 'at your forehead',
  chin: 'at your chin',
  mouth: 'at your mouth',
  chest: 'on your chest',
};
