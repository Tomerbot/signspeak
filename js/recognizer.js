// The recognizer remembers the last 3 seconds of hand and face positions and decides
// when a sign is complete: right handshape + right place + right movement.

import { handFeatures } from './features.js';
import { scoreAllShapes, bestShape, HANDSHAPES, SHAPE_IDS } from './handshapes.js';
import { locationScore, anchorPoints, palmCenter, dist2d, PLACE_WORDS } from './location.js';

const MEMORY_MS = 3000;
const FACE_MEMORY_MS = 1500; // a hand in front of the mouth can hide the face for a moment
const GAP_MS = 250; // short dropouts of the handshape are forgiven
const COOLDOWN_MS = 900; // time between two recognized signs

export class Recognizer {
  constructor(signs) {
    this.signs = signs;
    this.frames = [];
    this.lastFace = null;
    this.cutoff = -Infinity; // frames before this were already used for a sign
    this.lastFireT = -Infinity;
    this.blocked = new Set(); // a sign waits until you drop your hand, so it isn't said twice
  }

  reset() {
    this.frames = [];
    this.cutoff = -Infinity;
    this.lastFireT = -Infinity;
    this.blocked.clear();
  }

  // raw = { t, hand: { pts, world } | null, face: faceGeometry | null }
  // pts = 21 points in video pixels, world = 21 points in 3D (meters).
  push(raw) {
    let face = raw.face;
    if (face) this.lastFace = { face, t: raw.t };
    else if (this.lastFace && raw.t - this.lastFace.t < FACE_MEMORY_MS) face = this.lastFace.face;

    let hand = null;
    if (raw.hand) {
      const feat = handFeatures(raw.hand.world);
      const shapes = scoreAllShapes(feat);
      const prev = this.frames.at(-1);
      if (prev && prev.hand && raw.t - prev.t < 150) {
        // Smooth the scores a little, so one shaky frame doesn't flip the answer.
        for (const id of SHAPE_IDS) {
          shapes[id].score = 0.55 * shapes[id].score + 0.45 * prev.hand.shapes[id].score;
        }
      }
      const pts = raw.hand.pts;
      hand = {
        pts,
        feat,
        shapes,
        best: bestShape(shapes),
        size: dist2d(pts[0], pts[9]),
        palm: palmCenter(pts),
      };
    }

    const frame = { t: raw.t, hand, face };
    this.frames.push(frame);
    while (this.frames.length && raw.t - this.frames[0].t > MEMORY_MS) this.frames.shift();

    for (const id of [...this.blocked]) {
      const sign = this.signs.find((s) => s.id === id);
      if (!this.stillHolding(sign, frame)) this.blocked.delete(id);
    }
    return frame;
  }

  locAt(sign, frame) {
    if (sign.location === 'any') return frame.hand ? 1 : 0;
    if (!frame.hand || !frame.face) return 0;
    let best = 0;
    for (const p of anchorPoints(sign.anchor, frame.hand.pts)) {
      best = Math.max(best, locationScore(sign.location, p, frame.face));
    }
    return best;
  }

  stillHolding(sign, frame) {
    return !!frame.hand && frame.hand.shapes[sign.shape].score >= 0.35 && this.locAt(sign, frame) >= 0.3;
  }

  // The recent frames that show this sign's handshape, oldest first.
  run(sign) {
    const out = [];
    if (!this.frames.length) return out;
    let lastOk = this.frames.at(-1).t;
    for (let i = this.frames.length - 1; i >= 0; i--) {
      const f = this.frames[i];
      if (f.t <= this.cutoff) break;
      if (f.hand && f.hand.shapes[sign.shape].score >= 0.45) {
        out.push(f);
        lastOk = f.t;
      } else if (lastOk - f.t > GAP_MS) {
        break;
      }
    }
    return out.reverse();
  }

  // How far along is this sign right now? Used for Practice feedback and for Talk.
  evaluate(sign) {
    const frame = this.frames.at(-1);
    const r = {
      hand: !!frame?.hand,
      face: !!frame?.face,
      shape: 0,
      shapeHint: '',
      loc: 0,
      locOk: false,
      progress: 0,
      done: false,
      hint: '',
    };
    if (!frame || !frame.hand) {
      r.hint = 'Show one hand to the camera';
      return r;
    }
    const s = frame.hand.shapes[sign.shape];
    r.shape = s.score;
    r.shapeHint = s.hint;
    r.loc = this.locAt(sign, frame);

    const move = MOVES[sign.movement](this.run(sign), sign, this);
    r.progress = move.progress;
    r.done = move.done;
    r.locOk = sign.location === 'any' || move.locOk || r.loc >= 0.5;

    if (sign.location !== 'any' && !frame.face) r.hint = 'Move back so the camera sees your face and your hand';
    else if (r.shape < 0.6 && !r.done) r.hint = r.shapeHint;
    else if (!r.locOk) r.hint = sign.locationHint;
    else if (!r.done) r.hint = move.hint;
    return r;
  }

  fire(sign, t) {
    this.lastFireT = t;
    // Ignore the next moment too: dropping your hand after a sign shouldn't start a new one.
    this.cutoff = t + COOLDOWN_MS;
    this.blocked.add(sign.id);
  }

  // Talk mode: returns a sign when one is complete, otherwise null.
  step(raw) {
    const frame = this.push(raw);
    if (!frame.hand || frame.t - this.lastFireT < COOLDOWN_MS) return null;
    const top = Math.max(...SHAPE_IDS.map((id) => frame.hand.shapes[id].score));
    let winner = null;
    let winnerScore = 0;
    for (const sign of this.signs) {
      if (this.blocked.has(sign.id)) continue;
      const shape = frame.hand.shapes[sign.shape].score;
      // Only signs whose handshape is (one of) the clearest right now.
      if (shape < 0.5 || shape < top - 0.2) continue;
      const r = this.evaluate(sign);
      if (r.done && shape > winnerScore) {
        winner = sign;
        winnerScore = shape;
      }
    }
    if (winner) this.fire(winner, frame.t);
    return winner;
  }

  // Practice mode: checks one sign. r.fired is true once each time you complete it.
  practice(raw, sign) {
    const frame = this.push(raw);
    const r = this.evaluate(sign);
    r.fired = false;
    if (this.blocked.has(sign.id)) {
      r.done = false;
      r.progress = 0;
      r.hint = 'Great! Drop your hand, then sign it again';
    } else if (r.done && frame.t - this.lastFireT >= COOLDOWN_MS) {
      this.fire(sign, frame.t);
      r.fired = true;
    }
    return r;
  }

  // For the "I see" label: "Flat hand at your chin".
  describe() {
    const frame = this.frames.at(-1);
    if (!frame || !frame.hand) return null;
    const shape = frame.hand.best ? HANDSHAPES[frame.hand.best].name : null;
    let place = '';
    if (frame.face) {
      for (const where of ['forehead', 'mouth', 'chin', 'chest']) {
        const points = [...anchorPoints('tips', frame.hand.pts), frame.hand.pts[4], frame.hand.palm];
        if (points.some((p) => locationScore(where, p, frame.face) >= 0.7)) {
          place = PLACE_WORDS[where];
          break;
        }
      }
    }
    return { shape, place };
  }
}

// ---- Movements ------------------------------------------------------------
// Each one looks at the run of frames and returns { progress 0..1, done, hint, locOk? }.

const within = (run, ms) => {
  if (!run.length) return run;
  const end = run.at(-1).t;
  return run.filter((f) => end - f.t <= ms);
};
const faceWidth = (...frames) => frames.find((f) => f && f.face)?.face.fw;

export const MOVES = {
  // Hold the handshape still for half a second (I love you).
  hold(run) {
    if (!run.length) return { progress: 0, done: false, hint: 'Hold it still' };
    const end = run.at(-1);
    let startT = end.t;
    for (let i = run.length - 1; i >= 0; i--) {
      if (dist2d(run[i].hand.palm, end.hand.palm) > 0.7 * end.hand.size) break;
      startT = run[i].t;
    }
    const progress = Math.min(1, (end.t - startT) / 500);
    return { progress, done: progress >= 1, hint: 'Hold it still' };
  },

  // Keep touching the place for a moment; taps count (Mother, Father, Eat).
  touch(run, sign, rec) {
    let time = 0;
    for (let i = 1; i < run.length; i++) {
      if (rec.locAt(sign, run[i]) >= 0.5 && rec.locAt(sign, run[i - 1]) >= 0.5) {
        time += Math.min(100, run[i].t - run[i - 1].t);
      }
    }
    const progress = Math.min(1, time / 350);
    return { progress, done: progress >= 1, hint: sign.locationHint };
  },

  // Start at the place, then move away from it (Hello).
  away(run, sign, rec) {
    return startThenMove(run, sign, rec, 'Now move your hand out, away from your head', (s, f, fw) => {
      const from = s.face ? s.face.forehead : s.hand.palm;
      const moved = dist2d(f.hand.palm, s.hand.palm);
      const furtherOut = dist2d(f.hand.palm, from) - dist2d(s.hand.palm, from);
      return Math.min(moved / (0.6 * fw), furtherOut / (0.4 * fw));
    });
  },

  // Start at the chin, then move forward and down (Thank you).
  downOut(run, sign, rec) {
    return startThenMove(run, sign, rec, 'Now move your hand forward and down', (s, f, fw) => {
      const down = (f.hand.palm.y - s.hand.palm.y) / fw;
      const closer = f.hand.size / s.hand.size - 1; // the hand looks bigger when it comes toward the camera
      if (down < 0.08) return 0;
      return Math.max(down / 0.35, down >= 0.1 ? closer / 0.25 : 0);
    });
  },

  // Fist nodding up and down (Yes).
  nod(run) {
    const recent = within(run, 1600);
    if (recent.length < 4) return { progress: 0, done: false, hint: 'Nod your fist up and down' };
    const size = recent.reduce((sum, f) => sum + f.hand.size, 0) / recent.length;
    const step = 0.2 * size;
    let swings = 0;
    let dir = 0;
    let lo = Infinity;
    let hi = -Infinity;
    let peak = 0;
    let minX = Infinity;
    let maxX = -Infinity;
    for (const f of recent) {
      const { x, y } = f.hand.pts[9];
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      if (dir === 0) {
        lo = Math.min(lo, y);
        hi = Math.max(hi, y);
        if (hi - lo > step) {
          dir = y === hi ? 1 : -1;
          swings = 1;
          peak = y;
        }
      } else if (dir === 1) {
        if (y > peak) peak = y;
        else if (peak - y > step) {
          dir = -1;
          peak = y;
          swings++;
        }
      } else if (y < peak) peak = y;
      else if (y - peak > step) {
        dir = 1;
        peak = y;
        swings++;
      }
    }
    const ys = recent.map((f) => f.hand.pts[9].y);
    const upDown = Math.max(...ys) - Math.min(...ys);
    const mostlyVertical = maxX - minX < 0.8 * upDown + 0.1 * size;
    const progress = mostlyVertical ? Math.min(1, swings / 3) : 0;
    return { progress, done: progress >= 1, hint: 'Nod your fist up and down' };
  },

  // Two fingers open, then snap shut on the thumb (No).
  snap(run) {
    let openT = null;
    let done = false;
    for (const f of within(run, 1500)) {
      const gap = f.hand.feat.snapGap;
      if (gap >= 0.55) openT = f.t;
      else if (gap <= 0.3 && openT !== null && f.t - openT <= 800) done = true;
    }
    return {
      progress: done ? 1 : openT !== null ? 0.5 : 0,
      done,
      hint: openT !== null ? 'Now snap your fingers shut on your thumb' : 'Open your two fingers and thumb wide',
    };
  },

  // Rub in a circle at the place (Please, Sorry).
  circle(run, sign, rec) {
    const recent = within(run, 1800);
    const here = recent.filter((f) => rec.locAt(sign, f) >= 0.4);
    const fw = faceWidth(...here);
    if (recent.length < 8 || here.length < 0.7 * recent.length || !fw) {
      return { progress: 0, done: false, hint: sign.locationHint, locOk: false };
    }
    // Smooth the path a little.
    const path = here.map((f, i) => {
      const a = here[Math.max(0, i - 1)].hand.palm;
      const b = f.hand.palm;
      const c = here[Math.min(here.length - 1, i + 1)].hand.palm;
      return { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3 };
    });
    const cx = path.reduce((s, p) => s + p.x, 0) / path.length;
    const cy = path.reduce((s, p) => s + p.y, 0) / path.length;
    const xs = path.map((p) => p.x);
    const ys = path.map((p) => p.y);
    const wide = Math.max(...xs) - Math.min(...xs) >= 0.15 * fw;
    const tall = Math.max(...ys) - Math.min(...ys) >= 0.15 * fw;
    let turned = 0;
    let prev = null;
    for (const p of path) {
      if (Math.hypot(p.x - cx, p.y - cy) < 0.05 * fw) continue;
      const a = Math.atan2(p.y - cy, p.x - cx);
      if (prev !== null) {
        let d = a - prev;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        if (Math.abs(d) < 0.6 * Math.PI) turned += d; // a jump across the middle is a back-and-forth, not a circle
      }
      prev = a;
    }
    const goal = 1.4 * Math.PI; // about 3/4 of a circle
    const progress = wide && tall ? Math.min(1, Math.abs(turned) / goal) : 0;
    return { progress, done: progress >= 1, hint: 'Rub your hand in a circle', locOk: true };
  },
};

// Shared by Hello and Thank you: remember the moments the hand rested at the place
// (still for at least 0.15 s, so a hand just passing by doesn't count), then measure
// how far it moved from there (within 1.2 seconds).
function startThenMove(run, sign, rec, moveHint, measure) {
  const starts = [];
  let best = 0;
  let done = false;
  let resting = []; // the frames of the current stay at the place
  for (const f of run) {
    while (starts.length && f.t - starts[0].t > 1200) starts.shift();
    const fw = faceWidth(f);
    if (fw) {
      for (const s of starts) {
        const amount = measure(s, f, fw);
        best = Math.max(best, amount);
        if (amount >= 1) done = true;
      }
    }
    if (rec.locAt(sign, f) >= 0.5) {
      resting.push(f);
      const earlier = resting.filter((r) => f.t - r.t >= 150).at(-1);
      if (earlier && fw && dist2d(earlier.hand.palm, f.hand.palm) < 0.25 * fw) starts.push(f);
    } else {
      resting = [];
    }
  }
  if (!starts.length && !done) return { progress: 0, done: false, hint: sign.locationHint, locOk: false };
  return { progress: 0.35 + 0.65 * Math.min(1, best), done, hint: moveHint, locOk: true };
}
