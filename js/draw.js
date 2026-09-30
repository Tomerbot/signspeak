// Draws what the AI sees on top of the camera picture: the hand skeleton in yellow,
// and in Practice mode a ring where your hand should go.
// The canvas is flipped like a mirror with CSS, so we draw in the camera's own pixels.

const BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];
const TIPS = new Set([4, 8, 12, 16, 20]);

const YELLOW = '#FFC83D';
const INK = 'rgba(12, 52, 64, 0.6)';

export function drawOverlay(ctx, frame, { target = null, targetLit = false } = {}) {
  const { width: W, height: H } = ctx.canvas;
  ctx.clearRect(0, 0, W, H);
  const u = Math.max(W, H) / 900; // line widths grow with the picture

  if (target) drawTarget(ctx, target, targetLit, u);
  if (frame && frame.hand) drawHand(ctx, frame.hand.pts, u);
}

function drawHand(ctx, pts, u) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // A dark shadow first, so the yellow shows on light and dark backgrounds.
  for (const [color, width] of [[INK, 10 * u], [YELLOW, 5 * u]]) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (const [a, b] of BONES) {
      ctx.moveTo(pts[a].x, pts[a].y);
      ctx.lineTo(pts[b].x, pts[b].y);
    }
    ctx.stroke();
  }
  pts.forEach((p, i) => {
    const r = (TIPS.has(i) ? 7 : 4.5) * u;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = YELLOW;
    ctx.fill();
    ctx.lineWidth = 2.5 * u;
    ctx.strokeStyle = INK;
    ctx.stroke();
  });
}

function drawTarget(ctx, t, lit, u) {
  ctx.beginPath();
  ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
  if (lit) {
    ctx.fillStyle = 'rgba(255, 200, 61, 0.35)';
    ctx.fill();
  }
  ctx.setLineDash(lit ? [] : [10 * u, 8 * u]);
  ctx.lineWidth = 4 * u;
  ctx.strokeStyle = YELLOW;
  ctx.stroke();
  ctx.setLineDash([]);
}
