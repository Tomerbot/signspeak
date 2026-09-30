// Draws the teaching pictures as SVG:
//   handSVG  - a handshape, drawn from the same 21-point hand model the AI uses
//   placeSVG - a head and shoulders with a yellow spot where the sign happens
//   moveSVG  - one arrow that shows the movement

import { buildHand, rotate } from './handmodel.js';

const INK = 'var(--ink, #0C3440)';
const FILL = 'var(--card, #FFFFFF)';
const HAND = 'var(--hand, #FFC83D)';

// Which way to turn each handshape so it's easiest to recognize.
const VIEWS = {
  B: { yaw: -10, roll: 0 },
  FIVE: { yaw: 0, roll: 0 },
  S: { yaw: -30, pitch: 10 },
  A: { yaw: -35, pitch: 10 },
  ILY: { yaw: 0, roll: 0 },
  FLAT_O: { yaw: -60, pitch: 15, roll: -10 },
  TWO: { yaw: -40, roll: -10 },
};

const FINGER_CHAINS = [
  { ids: [1, 2, 3, 4], width: 0.22 },
  { ids: [5, 6, 7, 8], width: 0.19 },
  { ids: [9, 10, 11, 12], width: 0.2 },
  { ids: [13, 14, 15, 16], width: 0.19 },
  { ids: [17, 18, 19, 20], width: 0.165 },
];

const BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

// skeleton: also draw the 21 points in yellow, the way the AI sees the hand.
export function handSVG(pose, { title = '', skeleton = false } = {}) {
  const p = rotate(buildHand(pose), VIEWS[pose] || {});
  const lerp = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

  // The palm: wrist corners, thumb base, and the four knuckles.
  const across = norm2(sub3(p[17], p[5]));
  const wristL = sub3(p[0], scale3(across, 0.34));
  const wristR = add3(p[0], scale3(across, 0.3));
  const palm = [wristL, p[1], lerp(p[1], p[2], 0.55), p[5], p[9], p[13], p[17], wristR];
  const up = norm2(sub3(p[9], p[0]));
  const wristMid = scale3(add3(wristL, wristR), 0.5);
  const arm = [add3(wristMid, scale3(up, 0.06)), sub3(wristMid, scale3(up, 0.6))];
  const palmDepth = avgZ(palm) - 0.08;

  const parts = [
    { kind: 'poly', pts: palm, depth: palmDepth },
    // The arm is drawn right after the palm, with flat ends, so it hides the line across the wrist.
    { kind: 'line', pts: arm, width: 0.6, depth: palmDepth + 1e-4, cap: 'butt' },
    ...FINGER_CHAINS.map((c) => {
      const pts = c.ids.map((i) => p[i]);
      return { kind: 'line', pts, width: c.width, depth: avgZ(pts) };
    }),
  ].sort((a, b) => a.depth - b.depth);

  // Fit everything in the picture.
  const all = [...p, ...arm];
  const xs = all.map((q) => q[0]);
  const ys = all.map((q) => -q[1]);
  const pad = 0.2;
  const minX = Math.min(...xs) - pad;
  const maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad;
  const maxY = Math.min(Math.max(...ys), -p[0][1] + 0.35) + 0.02; // cut the arm off just below the wrist
  const w = maxX - minX;
  const h = maxY - minY;
  const outline = 0.055;

  const path = (pts) => pts.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(3)} ${(-q[1]).toFixed(3)}`).join(' ');
  const body = parts
    .map((part) => {
      if (part.kind === 'poly') {
        const d = `${path(part.pts)} Z`;
        return `<path d="${d}" fill="${FILL}" stroke="${INK}" stroke-width="${outline * 2}" stroke-linejoin="round"/>`;
      }
      const d = path(part.pts);
      const cap = part.cap || 'round';
      return (
        `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${(part.width + outline * 2).toFixed(3)}" stroke-linecap="${cap}" stroke-linejoin="round"/>` +
        `<path d="${d}" fill="none" stroke="${FILL}" stroke-width="${part.width.toFixed(3)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
      );
    })
    .join('');

  let bones = '';
  if (skeleton) {
    const xy = (q) => `${q[0].toFixed(3)} ${(-q[1]).toFixed(3)}`;
    const d = BONES.map(([a, b]) => `M${xy(p[a])} L${xy(p[b])}`).join(' ');
    bones =
      `<path d="${d}" fill="none" stroke="${INK}" stroke-width="0.075" stroke-linecap="round"/>` +
      `<path d="${d}" fill="none" stroke="${HAND}" stroke-width="0.04" stroke-linecap="round"/>` +
      p.map((q) => `<circle cx="${q[0].toFixed(3)}" cy="${(-q[1]).toFixed(3)}" r="0.045" fill="${HAND}" stroke="${INK}" stroke-width="0.018"/>`).join('');
  }

  const label = title ? `<title>${title}</title>` : '';
  return `<svg class="hand-art" viewBox="${minX.toFixed(3)} ${minY.toFixed(3)} ${w.toFixed(3)} ${h.toFixed(3)}" role="img" aria-label="${title}">${label}${body}${bones}</svg>`;
}

// Head and shoulders, with the place of the sign in yellow.
const SPOTS = {
  forehead: { x: 60, y: 24, r: 8 },
  'forehead-side': { x: 76, y: 27, r: 8 },
  chin: { x: 60, y: 70, r: 8 },
  mouth: { x: 60, y: 58, r: 8 },
  chest: { x: 60, y: 104, r: 10 },
};

export function placeSVG(where, { side = false, title = '' } = {}) {
  const person = `
    <path d="M14 124 C16 100 30 92 46 90 L74 90 C90 92 104 100 106 124" fill="${FILL}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M50 78 L50 90 M70 78 L70 90" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="60" cy="45" rx="23" ry="29" fill="${FILL}" stroke="${INK}" stroke-width="3"/>
    <circle cx="51" cy="42" r="2.4" fill="${INK}"/><circle cx="69" cy="42" r="2.4" fill="${INK}"/>
    <path d="M54 58 Q60 61 66 58" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`;
  let mark;
  if (where === 'any') {
    mark = `<rect x="16" y="82" width="88" height="38" rx="16" fill="${HAND}" fill-opacity="0.45" stroke="${INK}" stroke-width="2.5" stroke-dasharray="6 5"/>`;
  } else {
    const s = SPOTS[side && where === 'forehead' ? 'forehead-side' : where];
    mark = `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="${HAND}" stroke="${INK}" stroke-width="2.5"/>`;
  }
  return `<svg class="place-art" viewBox="0 0 120 124" role="img" aria-label="${title}"><title>${title}</title>${person}${mark}</svg>`;
}

// One arrow per movement.
export function moveSVG(movement, { title = '' } = {}) {
  const head = (x, y, angleDeg) => {
    const a = (angleDeg * Math.PI) / 180;
    const l = 13;
    const s = 0.5;
    const p1 = [x - l * Math.cos(a - s), y - l * Math.sin(a - s)];
    const p2 = [x - l * Math.cos(a + s), y - l * Math.sin(a + s)];
    return `<path d="M${p1[0].toFixed(1)} ${p1[1].toFixed(1)} L${x} ${y} L${p2[0].toFixed(1)} ${p2[1].toFixed(1)}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
  };
  const stroke = (d) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
  const start = (x, y) => `<circle cx="${x}" cy="${y}" r="9" fill="${HAND}" stroke="${INK}" stroke-width="2.5"/>`;
  const times = (x, y, n = 2) => `<text x="${x}" y="${y}" font-size="20" font-weight="800" fill="${INK}" font-family="inherit">×${n}</text>`;

  let art = '';
  switch (movement) {
    case 'away':
      art = start(30, 50) + stroke('M42 52 C62 56 78 58 98 52') + head(98, 52, -12);
      break;
    case 'downOut':
      art = start(34, 30) + stroke('M40 42 C46 70 64 86 92 92') + head(92, 92, 12);
      break;
    case 'nod':
      art = stroke('M60 24 L60 96') + head(60, 24, -90) + head(60, 96, 90) + times(76, 66);
      break;
    case 'snap':
      // An open "beak" (two fingers above, thumb below) that snaps shut.
      art =
        stroke('M26 86 L88 86') +
        stroke('M26 86 L80 36') +
        `<circle cx="26" cy="86" r="6" fill="${INK}"/>` +
        stroke('M92 44 C102 56 102 68 96 78') +
        head(96, 78, 110) +
        times(52, 112);
      break;
    case 'circle':
      art = stroke('M60 26 A34 34 0 1 1 27 68') + head(27, 68, -120);
      break;
    case 'hold':
      art = `<circle cx="60" cy="60" r="36" fill="none" stroke="${INK}" stroke-width="5"/>` + stroke('M50 44 L50 76') + stroke('M70 44 L70 76');
      break;
    case 'touch':
      art =
        start(60, 70) +
        stroke('M40 50 C44 38 52 32 60 30') +
        stroke('M80 50 C76 38 68 32 60 30') +
        times(78, 104);
      break;
    default:
      art = '';
  }
  return `<svg class="move-art" viewBox="0 0 120 120" role="img" aria-label="${title}"><title>${title}</title>${art}</svg>`;
}

// ---- small 3D helpers -------------------------------------------------------
function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function add3(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function scale3(a, s) {
  return [a[0] * s, a[1] * s, a[2] * s];
}
function norm2(a) {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}
function avgZ(pts) {
  return pts.reduce((s, q) => s + q[2], 0) / pts.length;
}
