// A small 3D hand model. It builds the same 21 points MediaPipe finds, for any handshape.
// SignSpeak uses it to draw the handshape pictures, and the tests use it to check the
// handshape rules without a camera.
//
// Units: wrist to middle knuckle = 1. A right hand with the palm toward you, seen in a
// mirror, so the thumb is on the left. x = right, y = up, z = toward you.

const FINGERS = {
  index: { knuckle: [-0.34, 0.93, 0], bones: [0.44, 0.27, 0.22], together: -4, apart: -17 },
  middle: { knuckle: [-0.11, 1.0, 0], bones: [0.48, 0.31, 0.24], together: 0, apart: -3 },
  ring: { knuckle: [0.12, 0.95, 0], bones: [0.45, 0.29, 0.23], together: 4, apart: 10 },
  pinky: { knuckle: [0.32, 0.83, 0], bones: [0.35, 0.22, 0.2], together: 8, apart: 25 },
};
const THUMB_BASE = [-0.27, 0.24, 0.08];
const THUMB_BONES = [0.46, 0.36, 0.3];

const STRAIGHT = [4, 3, 2];
const FOLDED = [88, 100, 60];

// Thumb positions, as the direction of each of its three bones.
const THUMBS = {
  out: [[-0.72, 0.62, 0.3], [-0.8, 0.55, 0.15], [-0.85, 0.5, 0.05]],
  side: [[-0.45, 0.85, 0.2], [-0.2, 1, 0.15], [-0.1, 1, 0.05]],
  across: [[-0.3, 0.9, 0.35], [0.55, 0.6, 0.55], [0.9, 0.1, 0.35]],
  up: [[-0.4, 0.85, 0.4], [-0.1, 1, 0.3], [0, 1, 0.1]],
  forward: [[-0.55, 0.7, 0.45], [-0.4, 0.8, 0.45], [-0.3, 0.85, 0.4]],
  pinky: [[-0.25, 0.8, 0.45], [0.6, 0.5, 0.5], [0.9, 0.1, 0.3]],
};

export const POSES = {
  B: { flex: all(STRAIGHT), spread: 0, thumb: 'side' },
  FIVE: { flex: all(STRAIGHT), spread: 1, thumb: 'out' },
  S: { flex: all(FOLDED), spread: 0, thumb: 'across' },
  A: { flex: all(FOLDED), spread: 0, thumb: 'up' },
  ILY: { flex: { index: STRAIGHT, middle: FOLDED, ring: FOLDED, pinky: STRAIGHT }, spread: 0.6, thumb: 'out' },
  FLAT_O: { flex: all([60, 45, 20]), spread: -0.8, thumb: 'touch' },
  TWO: { flex: { index: STRAIGHT, middle: STRAIGHT, ring: FOLDED, pinky: FOLDED }, spread: 0, thumb: 'forward' },
  TWO_CLOSED: {
    flex: { index: [60, 40, 15], middle: [60, 40, 15], ring: FOLDED, pinky: FOLDED },
    spread: -0.3,
    thumb: 'touch',
  },
  // Shapes SignSpeak should NOT mix up with its own (used by the tests).
  Y: { flex: { index: FOLDED, middle: FOLDED, ring: FOLDED, pinky: STRAIGHT }, spread: 0.6, thumb: 'out' },
  L: { flex: { index: STRAIGHT, middle: FOLDED, ring: FOLDED, pinky: FOLDED }, spread: 0, thumb: 'out' },
  W: { flex: { index: STRAIGHT, middle: STRAIGHT, ring: STRAIGHT, pinky: FOLDED }, spread: 1, thumb: 'pinky' },
  POINT: { flex: { index: STRAIGHT, middle: FOLDED, ring: FOLDED, pinky: FOLDED }, spread: 0, thumb: 'across' },
};

function all(f) {
  return { index: f, middle: f, ring: f, pinky: f };
}

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const minus = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => scale(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));
const rad = (d) => (d * Math.PI) / 180;

// Returns 21 points [x, y, z] in MediaPipe's order.
export function buildHand(poseName) {
  const pose = POSES[poseName];
  const points = new Array(21);
  points[0] = [0, 0, 0];

  const order = ['index', 'middle', 'ring', 'pinky'];
  order.forEach((name, i) => {
    const f = FINGERS[name];
    const angle = rad(f.together + pose.spread * (f.apart - f.together));
    const along = [Math.sin(angle), Math.cos(angle), 0];
    const toward = [0, 0, 1];
    let p = f.knuckle;
    let bend = 0;
    const base = 5 + i * 4;
    points[base] = p;
    pose.flex[name].forEach((jointBend, j) => {
      bend += rad(jointBend);
      const dir = add(scale(along, Math.cos(bend)), scale(toward, Math.sin(bend)));
      p = add(p, scale(dir, f.bones[j]));
      points[base + j + 1] = p;
    });
  });

  points[1] = THUMB_BASE;
  if (pose.thumb === 'touch') {
    // Reach the thumb tip to the index and middle fingertips.
    const target = scale(add(points[8], points[12]), 0.5);
    const knuckle = add(THUMB_BASE, scale(norm([-0.25, 0.75, 0.6]), THUMB_BONES[0]));
    points[2] = knuckle;
    points[3] = reach(knuckle, target, THUMB_BONES[1], THUMB_BONES[2], [-1, 0, 0.3]);
    points[4] = add(points[3], scale(norm(minus(target, points[3])), THUMB_BONES[2]));
  } else {
    let p = THUMB_BASE;
    THUMBS[pose.thumb].forEach((dir, j) => {
      p = add(p, scale(norm(dir), THUMB_BONES[j]));
      points[2 + j] = p;
    });
  }
  return points;
}

// Two-bone reach: where the middle joint goes so the end touches `target`.
function reach(start, target, a, b, pole) {
  const toTarget = minus(target, start);
  const d = Math.min(a + b - 1e-3, Math.max(Math.abs(a - b) + 1e-3, Math.hypot(...toTarget)));
  const t = norm(toTarget);
  const side = norm(minus(pole, scale(t, dot3(pole, t))));
  const cos = (a * a + d * d - b * b) / (2 * a * d);
  const sin = Math.sqrt(Math.max(0, 1 - cos * cos));
  return add(start, scale(add(scale(t, cos), scale(side, sin)), a));
}

// Turn the hand in 3D: `yaw` turns it left/right, `pitch` tips it forward, `roll` tilts it.
export function rotate(points, { yaw = 0, pitch = 0, roll = 0 } = {}) {
  const [cy, sy] = [Math.cos(rad(yaw)), Math.sin(rad(yaw))];
  const [cp, sp] = [Math.cos(rad(pitch)), Math.sin(rad(pitch))];
  const [cr, sr] = [Math.cos(rad(roll)), Math.sin(rad(roll))];
  return points.map(([x, y, z]) => {
    // roll around z
    let x1 = x * cr - y * sr;
    let y1 = x * sr + y * cr;
    let z1 = z;
    // pitch around x
    const y2 = y1 * cp - z1 * sp;
    const z2 = y1 * sp + z1 * cp;
    // yaw around y
    const x3 = x1 * cy + z2 * sy;
    const z3 = -x1 * sy + z2 * cy;
    return [x3, y2, z3];
  });
}

// As objects {x, y, z}, like MediaPipe gives them.
export function asLandmarks(points) {
  return points.map(([x, y, z]) => ({ x, y, z }));
}
