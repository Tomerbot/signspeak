// Tests for the sign rules, without a camera: a 3D hand model plays each sign
// in front of a pretend face, and we check that SignSpeak recognizes the right one.
// Run with: node tests/run.js

import { buildHand, rotate, POSES } from '../js/handmodel.js';
import { handFeatures } from '../js/features.js';
import { scoreAllShapes, bestShape, scoreShape } from '../js/handshapes.js';
import { faceGeometry } from '../js/location.js';
import { Recognizer } from '../js/recognizer.js';
import { SIGNS } from '../js/signs.js';

let passed = 0;
let failed = 0;
function check(name, ok, detail = '') {
  if (ok) passed++;
  else {
    failed++;
    console.log(`  FAIL ${name} ${detail}`);
  }
}

// Seeded random numbers, so every run is the same.
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const jitter = (a) => (rand() * 2 - 1) * a;

// ---- 1. Handshapes from every angle ---------------------------------------
console.log('Handshapes');
const expected = {
  B: 'B',
  FIVE: 'FIVE',
  S: 'FIST',
  A: 'FIST',
  ILY: 'ILY',
  FLAT_O: 'FLAT_O',
  TWO: 'TWO',
  TWO_CLOSED: 'TWO',
  Y: null,
  L: null,
  W: null,
  POINT: null,
};
for (const [pose, want] of Object.entries(expected)) {
  let right = 0;
  const tries = 40;
  for (let i = 0; i < tries; i++) {
    const turned = rotate(buildHand(pose), { yaw: jitter(70), pitch: jitter(40), roll: jitter(180) });
    const noisy = turned.map(([x, y, z]) => ({ x: x + jitter(0.03), y: y + jitter(0.03), z: z + jitter(0.03) }));
    const got = bestShape(scoreAllShapes(handFeatures(noisy)));
    if (got === want) right++;
  }
  check(`${pose} is ${want}`, right >= tries * 0.95, `(${right}/${tries})`);
}

// Hints point at the finger to fix.
{
  const f = handFeatures(buildHand('FIVE').map(([x, y, z]) => ({ x, y, z })));
  const { hint } = scoreShape(f, 'ILY');
  check('hint for FIVE when ILY is wanted', hint === 'Fold your middle finger down', `got "${hint}"`);
}

// ---- 2. Whole signs in front of a pretend face ------------------------------
console.log('Signs');
const W = 960;
const H = 720;
const face = faceGeometry(
  {
    keypoints: [
      { x: 445 / W, y: 230 / H },
      { x: 515 / W, y: 230 / H },
      { x: 480 / W, y: 265 / H },
      { x: 480 / W, y: 300 / H },
    ],
    boundingBox: { width: 180 },
  },
  W,
  H,
);
const fw = face.fw;

// Put a hand in the picture so that point `anchor` (or the palm if -1) lands on (x, y).
function handAt(pose, { x, y }, { anchor = -1, size = 150, roll = 0, yaw = 0 } = {}) {
  const model = rotate(buildHand(pose), { roll, yaw });
  const flat = model.map(([mx, my]) => ({ x: mx * size, y: -my * size }));
  const ref =
    anchor >= 0
      ? flat[anchor]
      : [0, 5, 9, 13, 17].reduce((s, i) => ({ x: s.x + flat[i].x / 5, y: s.y + flat[i].y / 5 }), { x: 0, y: 0 });
  const pts = flat.map((p) => ({ x: p.x - ref.x + x, y: p.y - ref.y + y }));
  const world = model.map(([mx, my, mz]) => ({ x: mx * 0.09, y: -my * 0.09, z: -mz * 0.09 }));
  return { pts, world };
}

const chin = { x: face.mouth.x, y: (face.mouth.y + face.chin.y) / 2 };
const neutral = { x: 640, y: 560 };
const lerp = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });

// Each script is a list of frames at 30 frames per second.
function frames(ms, make) {
  const out = [];
  const n = Math.round(ms / 33);
  for (let i = 0; i < n; i++) out.push(make(n > 1 ? i / (n - 1) : 1));
  return out;
}
const none = (ms) => frames(ms, () => null);

const scripts = {
  hello: [
    ...none(300),
    ...frames(400, () => handAt('B', face.forehead, { anchor: 8, roll: 20 })),
    ...frames(400, (k) => handAt('B', lerp(face.forehead, { x: face.forehead.x + 1.2 * fw, y: face.forehead.y + 0.2 * fw }, k), { anchor: 8, roll: 20 })),
    ...frames(300, () => handAt('B', { x: face.forehead.x + 1.2 * fw, y: face.forehead.y + 0.2 * fw }, { anchor: 8, roll: 20 })),
  ],
  thankyou: [
    ...none(300),
    ...frames(400, () => handAt('B', chin, { anchor: 12 })),
    ...frames(450, (k) => handAt('B', lerp(chin, { x: chin.x + 0.2 * fw, y: chin.y + 0.7 * fw }, k), { anchor: 12, size: 150 * (1 + 0.3 * k) })),
    ...frames(300, () => handAt('B', { x: chin.x + 0.2 * fw, y: chin.y + 0.7 * fw }, { anchor: 12, size: 195 })),
  ],
  yes: [
    ...none(300),
    ...frames(1400, (k) => {
      const nod = Math.sin(k * Math.PI * 2 * 2.5) * 0.3 * 150;
      return handAt('S', { x: neutral.x, y: neutral.y + nod }, {});
    }),
  ],
  no: [
    ...none(300),
    ...frames(400, () => handAt('TWO', neutral, { roll: -60 })),
    ...frames(150, () => handAt('TWO_CLOSED', neutral, { roll: -60 })),
    ...frames(150, () => handAt('TWO', neutral, { roll: -60 })),
    ...frames(150, () => handAt('TWO_CLOSED', neutral, { roll: -60 })),
  ],
  please: [
    ...none(300),
    ...frames(1800, (k) => {
      const a = k * Math.PI * 2 * 1.3;
      return handAt('B', { x: face.chest.x + Math.cos(a) * 0.35 * fw, y: face.chest.y + Math.sin(a) * 0.35 * fw }, { roll: 80 });
    }),
  ],
  sorry: [
    ...none(300),
    ...frames(1800, (k) => {
      const a = -k * Math.PI * 2 * 1.3;
      return handAt('A', { x: face.chest.x + Math.cos(a) * 0.35 * fw, y: face.chest.y + Math.sin(a) * 0.35 * fw }, {});
    }),
  ],
  iloveyou: [...none(300), ...frames(800, () => handAt('ILY', neutral, {}))],
  mother: [...none(300), ...frames(700, () => handAt('FIVE', chin, { anchor: 4 }))],
  father: [...none(300), ...frames(700, () => handAt('FIVE', face.forehead, { anchor: 4 }))],
  eat: [...none(300), ...frames(700, () => handAt('FLAT_O', face.mouth, { anchor: 8, yaw: -50 }))],

  // Things that should NOT become a sign.
  'resting flat hand': [...none(300), ...frames(2000, () => handAt('B', neutral, {}))],
  'open hand waving': [
    ...none(300),
    ...frames(1500, (k) => handAt('FIVE', { x: neutral.x + Math.sin(k * Math.PI * 6) * 0.5 * fw, y: neutral.y }, {})),
  ],
  'fist moving sideways': [
    ...none(300),
    ...frames(1500, (k) => handAt('S', { x: neutral.x + Math.sin(k * Math.PI * 5) * 0.6 * fw, y: neutral.y }, {})),
  ],
  'fingers pointing': [...none(300), ...frames(1500, () => handAt('POINT', neutral, {}))],
};

function play(script, recognizer) {
  const fired = [];
  script.forEach((hand, i) => {
    const got = recognizer.step({ t: i * 33, hand, face });
    if (got) fired.push(got.id);
  });
  return fired;
}

for (const [name, script] of Object.entries(scripts)) {
  const fired = play(script, new Recognizer(SIGNS));
  const want = SIGNS.some((s) => s.id === name) ? [name] : [];
  check(`${name} → [${want}]`, JSON.stringify(fired) === JSON.stringify(want), `got [${fired}]`);
}

// A held sign is said once, not again and again.
{
  const long = [...none(300), ...frames(4000, () => handAt('ILY', neutral, {}))];
  const fired = play(long, new Recognizer(SIGNS));
  check('holding I love you for 4 s says it once', fired.length === 1, `got [${fired}]`);
}

// Dropping an open hand after Eat is not "Thank you".
{
  const drop = [
    ...none(300),
    ...frames(1500, () => handAt('FLAT_O', face.mouth, { anchor: 8, yaw: -50 })),
    ...frames(100, () => handAt('B', face.mouth, { anchor: 12 })),
    ...frames(400, (k) => handAt('B', lerp(face.mouth, { x: face.mouth.x + 0.3 * fw, y: face.mouth.y + 1.4 * fw }, k), { anchor: 12 })),
  ];
  const fired = play(drop, new Recognizer(SIGNS));
  check('eat, then drop an open hand', JSON.stringify(fired) === '["eat"]', `got [${fired}]`);
}

// Two signs in a row make a sentence.
{
  const sentence = [...scripts.hello, ...none(500), ...scripts.thankyou];
  const fired = play(sentence, new Recognizer(SIGNS));
  check('hello + thank you', JSON.stringify(fired) === '["hello","thankyou"]', `got [${fired}]`);
}

// Practice mode lights up the parameters one by one.
{
  const rec = new Recognizer(SIGNS);
  const mother = SIGNS.find((s) => s.id === 'mother');
  let r = rec.practice({ t: 0, hand: handAt('FIVE', neutral, {}), face }, mother);
  check('practice: shape right, place wrong', r.shape > 0.6 && !r.locOk && r.hint === mother.locationHint, JSON.stringify(r));
  r = rec.practice({ t: 33, hand: handAt('B', chin, { anchor: 4 }), face }, mother);
  check('practice: flat hand instead of open hand', r.shape < 0.6 && r.hint === 'Spread your fingers apart', r.hint);
  let firedAt = -1;
  for (let i = 2; i < 30; i++) {
    r = rec.practice({ t: i * 33, hand: handAt('FIVE', chin, { anchor: 4 }), face }, mother);
    if (r.fired && firedAt < 0) firedAt = i;
  }
  check('practice: success after about 0.4 s', firedAt > 0 && firedAt < 20, `at frame ${firedAt}`);
  check('practice: asks you to drop your hand', r.hint.startsWith('Great!'), r.hint);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
