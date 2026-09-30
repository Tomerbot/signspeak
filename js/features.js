// Turns the 21 hand points from MediaPipe into a few simple numbers:
// how bent each finger is, how far the thumb sticks out, how spread the fingers are.
//
// MediaPipe's 21 points: 0 = wrist, then 4 points per finger from the knuckle to the tip.
//   thumb 1-4, index 5-8, middle 9-12, ring 13-16, pinky 17-20.

export const FINGER_POINTS = {
  thumb: [1, 2, 3, 4],
  index: [5, 6, 7, 8],
  middle: [9, 10, 11, 12],
  ring: [13, 14, 15, 16],
  pinky: [17, 18, 19, 20],
};

export const FOUR_FINGERS = ['index', 'middle', 'ring', 'pinky'];

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const length = (a) => Math.sqrt(dot(a, a));

export function dist(a, b) {
  return length(sub(a, b));
}

// The angle between two directions, in degrees (0 = same direction).
export function angleDeg(u, v) {
  const lu = length(u);
  const lv = length(v);
  if (lu === 0 || lv === 0) return 0;
  const c = Math.max(-1, Math.min(1, dot(u, v) / (lu * lv)));
  return (Math.acos(c) * 180) / Math.PI;
}

// A soft yes/no: 0 at `from`, 1 at `to`, smooth in between. Works in both directions.
export function ramp(value, from, to) {
  const t = (value - from) / (to - from);
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

// `w` = 21 points in 3D (MediaPipe's "world landmarks", in meters).
// Using 3D points means the numbers stay the same when the hand turns.
export function handFeatures(w) {
  const palm = dist(w[0], w[9]) || 1; // wrist to middle knuckle = our ruler

  const fingers = {};
  for (const name of FOUR_FINGERS) {
    const [k, p, d, t] = FINGER_POINTS[name];
    // Bend at each of the three joints. A straight finger has all three near 0.
    const knuckle = angleDeg(sub(w[k], w[0]), sub(w[p], w[k]));
    const middleJoint = angleDeg(sub(w[p], w[k]), sub(w[d], w[p]));
    const tipJoint = angleDeg(sub(w[d], w[p]), sub(w[t], w[d]));
    fingers[name] = {
      curl: knuckle + middleJoint + tipJoint, // about 20 = straight, 200+ = folded into a fist
      tipToThumb: dist(w[t], w[4]) / palm, // small = fingertip touches the thumb tip
      reach: dist(w[t], w[0]) / palm, // fingertip to wrist: about 1.8 when straight, under 1 in a fist
    };
  }

  return {
    palm,
    fingers,
    // Thumb tip to index knuckle. About 0.8 when the thumb sticks out, 0.3-0.5 when it's tucked in.
    thumbOut: dist(w[4], w[5]) / palm,
    // Index tip to pinky tip, compared with index knuckle to pinky knuckle.
    // About 1.2 with fingers together, 1.8 when they are spread apart.
    spread: dist(w[8], w[20]) / (dist(w[5], w[17]) || 1),
    // How close the index or middle fingertip is to the thumb tip (for the sign NO).
    snapGap: Math.min(dist(w[8], w[4]), dist(w[12], w[4])) / palm,
  };
}
