// Connects the camera, the AI and the screen.

import { SIGNS } from './signs.js';
import { HANDSHAPES } from './handshapes.js';
import { Recognizer } from './recognizer.js';
import { loadModels, detect } from './vision.js';
import { targetFor } from './location.js';
import { drawOverlay } from './draw.js';
import { handSVG, placeSVG, moveSVG } from './illustrate.js';
import { speak } from './speech.js';
import * as progress from './progress.js';

const $ = (id) => document.getElementById(id);
const video = $('video');
const canvas = $('overlay');
const ctx = canvas.getContext('2d');
const debugOn = new URLSearchParams(location.search).has('debug');

const state = {
  mode: 'talk',
  lesson: 0,
  words: [],
  models: null,
  running: false,
  lastVideoTime: -1,
  lastLabelT: 0,
  successUntil: 0,
};
const recognizer = new Recognizer(SIGNS);

// ---- Build the lists ---------------------------------------------------------

function buildSignList() {
  $('signList').innerHTML = SIGNS.map(
    (s, i) => `
      <li>
        <button class="sign-row" type="button" data-lesson="${i}">
          <span class="mini">${handSVG(s.pose, { title: HANDSHAPES[s.shape].name })}</span>
          <span><strong>${s.word}</strong><small>${s.how.shape}. ${s.how.location}. ${s.how.movement}.</small></span>
          <span class="learned">${progress.isLearned(s.id) ? 'Learned' : ''}</span>
        </button>
      </li>`,
  ).join('');
}

function buildPicker() {
  $('picker').innerHTML = SIGNS.map(
    (s, i) =>
      `<button class="chip" type="button" data-lesson="${i}" aria-current="${i === state.lesson}">${s.word}${
        progress.isLearned(s.id) ? '<span class="check" aria-label="learned">✓</span>' : ''
      }</button>`,
  ).join('');
  $('learnedCount').textContent = `(${progress.learnedCount(SIGNS.map((s) => s.id))} of ${SIGNS.length} learned)`;
}

// ---- Modes -------------------------------------------------------------------

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll('.mode').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  $('talkPanel').hidden = mode !== 'talk';
  $('practicePanel').hidden = mode !== 'practice';
  recognizer.reset();
  if (mode === 'practice') showLesson(state.lesson);
  else renderCaption(false);
}

function showLesson(i) {
  state.lesson = (i + SIGNS.length) % SIGNS.length;
  const s = SIGNS[state.lesson];
  recognizer.reset();
  $('lessonWord').textContent = s.word;
  $('lessonCount').textContent = `Sign ${state.lesson + 1} of ${SIGNS.length}`;

  const tile = (id, art, how) => {
    $(id).querySelector('.art').innerHTML = art;
    $(id).querySelector('.how').textContent = how;
  };
  tile('pShape', handSVG(s.pose, { title: HANDSHAPES[s.shape].name }), s.how.shape);
  tile('pPlace', placeSVG(s.location, { side: s.id === 'hello', title: s.how.location }), s.how.location);
  tile('pMove', moveSVG(s.movement, { title: s.how.movement }), s.how.movement);

  renderReps();
  buildPicker();
  $('hint').textContent = state.running ? 'Show one hand to the camera' : 'Turn on the camera to start.';
  $('caption').hidden = true;
  setLit({ shape: false, place: false, move: false, meter: 0 });
}

function renderReps() {
  const s = SIGNS[state.lesson];
  const n = progress.repsFor(s.id);
  document.querySelectorAll('#reps .dot').forEach((d, i) => d.classList.toggle('on', i < n));
  $('repsText').textContent = progress.isLearned(s.id) ? `You learned ${s.word}!` : 'Sign it 3 times to learn it';
}

function setLit({ shape, place, move, meter }) {
  $('pShape').classList.toggle('lit', shape);
  $('pPlace').classList.toggle('lit', place);
  $('pMove').classList.toggle('lit', move);
  $('pMove').querySelector('.meter span').style.width = `${Math.round(meter * 100)}%`;
}

// ---- Talk: words and captions ------------------------------------------------------

function sentenceText(words) {
  return words.map((w, i) => (i === 0 || w.startsWith('I ') ? w : w.toLowerCase())).join(' ');
}

function renderSentence() {
  const el = $('sentence');
  if (!state.words.length) {
    el.textContent = 'Sign something. Your words show up here.';
    el.classList.add('empty');
  } else {
    el.textContent = sentenceText(state.words);
    el.classList.remove('empty');
  }
  $('undoBtn').disabled = !state.words.length;
  $('clearBtn').disabled = !state.words.length;
  $('speakBtn').disabled = !state.words.length;
}

// The caption shows the last few words; the newest one is yellow.
function renderCaption(pop) {
  const el = $('caption');
  if (!state.words.length) {
    el.hidden = true;
    return;
  }
  const all = sentenceText(state.words).split(' ');
  const newestLength = state.words.at(-1).split(' ').length;
  const newest = all.slice(-newestLength).join(' ');
  const before = all.slice(Math.max(0, all.length - newestLength - 5), all.length - newestLength).join(' ');
  el.innerHTML = `${escapeHtml(before)} <mark>${escapeHtml(newest)}</mark>`;
  el.hidden = false;
  if (pop) {
    el.classList.remove('pop');
    void el.offsetWidth; // restart the little animation
    el.classList.add('pop');
  }
}

function addWord(sign) {
  state.words.push(sign.word);
  renderSentence();
  renderCaption(true);
  if ($('autoSpeak').checked) speak(sign.word);
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

// ---- Camera ----------------------------------------------------------------------

async function startCamera() {
  const btn = $('startBtn');
  const error = $('gateError');
  error.hidden = true;

  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    showGateError(
      'The camera only works when SignSpeak is opened from http://localhost or an https:// address. The README explains how.',
    );
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Loading the hand model…';
  try {
    const [stream] = await Promise.all([
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false,
      }),
      state.models ? null : loadModels('VIDEO').then((m) => (state.models = m)),
    ]);
    video.srcObject = stream;
    await video.play();
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    $('mirror').style.setProperty('--ratio', `${video.videoWidth} / ${video.videoHeight}`);
    $('gate').hidden = true;
    $('mirror').classList.remove('off');
    $('seeing').hidden = false;
    state.running = true;
    if (state.mode === 'practice') $('hint').textContent = 'Show one hand to the camera';
    requestAnimationFrame(loop);
  } catch (err) {
    console.error(err);
    const name = err && err.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      showGateError('Camera access is blocked. Allow the camera (the icon in the address bar), then press Try again.');
    } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      showGateError('No camera was found. Connect a camera, then press Try again.');
    } else if (name === 'NotReadableError') {
      showGateError('Another app is using the camera. Close it, then press Try again.');
    } else {
      showGateError("The hand model didn't load. Check the internet connection, then press Try again.");
    }
    btn.disabled = false;
    btn.textContent = 'Try again';
  }
}

function showGateError(text) {
  $('gateError').textContent = text;
  $('gateError').hidden = false;
}

// ---- Every camera frame ------------------------------------------------------------------

function loop() {
  if (!state.running) return;
  tick();
  requestAnimationFrame(loop);
}

// Handles one new camera frame (if there is one).
function tick() {
  if (video.readyState >= 2 && video.currentTime !== state.lastVideoTime) {
    state.lastVideoTime = video.currentTime;
    const t = performance.now();
    const raw = detect(state.models, video, video.videoWidth, video.videoHeight, t);
    raw.t = t;
    if (state.mode === 'talk') onTalkFrame(raw);
    else onPracticeFrame(raw);
    if (t - state.lastLabelT > 150) {
      state.lastLabelT = t;
      updateSeeing();
      if (debugOn) updateDebug();
    }
  }
}

function onTalkFrame(raw) {
  const sign = recognizer.step(raw);
  drawOverlay(ctx, recognizer.frames.at(-1));
  if (sign) addWord(sign);
}

function onPracticeFrame(raw) {
  const sign = SIGNS[state.lesson];
  const r = recognizer.practice(raw, sign);
  const frame = recognizer.frames.at(-1);
  const target = sign.location === 'any' ? null : targetFor(sign.location, frame.face);
  drawOverlay(ctx, frame, { target, targetLit: r.hand && r.loc >= 0.5 });

  if (r.fired) onPracticeSuccess(sign);
  if (raw.t < state.successUntil) return; // keep the "well done" state on screen for a moment

  $('params').classList.remove('success');
  setLit({
    shape: r.hand && r.shape >= 0.6,
    place: r.hand && r.locOk,
    move: r.done,
    meter: r.progress,
  });
  if ($('hint').textContent !== r.hint) $('hint').textContent = r.hint;
}

function onPracticeSuccess(sign) {
  const n = progress.addRep(sign.id);
  state.successUntil = performance.now() + 1200;
  $('params').classList.add('success');
  $('hint').textContent =
    n >= progress.REPS_TO_LEARN ? `You learned ${sign.word}! Press the arrow for the next sign.` : `Yes! That's ${sign.word}.`;
  const cap = $('caption');
  cap.innerHTML = `<mark>${escapeHtml(sign.word)}</mark>`;
  cap.hidden = false;
  cap.classList.remove('pop');
  void cap.offsetWidth;
  cap.classList.add('pop');
  if ($('autoSpeak').checked) speak(sign.word);
  renderReps();
  buildPicker();
  buildSignList();
}

function updateSeeing() {
  const el = $('seeing');
  const d = recognizer.describe();
  if (!d) {
    el.textContent = 'No hand yet';
    el.classList.remove('has-hand');
    return;
  }
  const shape = d.shape ? d.shape.toLowerCase() : 'your hand';
  el.textContent = `I see: ${shape}${d.place ? ` ${d.place}` : ''}`;
  el.classList.add('has-hand');
}

function updateDebug() {
  const el = $('debug');
  el.hidden = false;
  const f = recognizer.frames.at(-1);
  if (!f || !f.hand) {
    el.textContent = `no hand${f && f.face ? ` · face ${Math.round(f.face.fw)} px wide` : ''}`;
    return;
  }
  const { feat, shapes } = f.hand;
  const fingers = Object.entries(feat.fingers)
    .map(([n, v]) => `${n.padEnd(6)} bend ${String(Math.round(v.curl)).padStart(3)}  reach ${v.reach.toFixed(2)}  to thumb ${v.tipToThumb.toFixed(2)}`)
    .join('\n');
  const top = Object.entries(shapes)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 3)
    .map(([k, v]) => `${k} ${v.score.toFixed(2)} ${v.hint}`)
    .join('\n');
  el.textContent = `${fingers}\nspread ${feat.spread.toFixed(2)}  thumb out ${feat.thumbOut.toFixed(2)}  snap gap ${feat.snapGap.toFixed(2)}\nface: ${f.face ? `${Math.round(f.face.fw)} px wide` : 'not seen'}\n${top}`;
}

// ---- Buttons ----------------------------------------------------------------------

$('startBtn').addEventListener('click', startCamera);
document.querySelectorAll('.mode').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
$('speakBtn').addEventListener('click', () => speak(sentenceText(state.words)));
$('undoBtn').addEventListener('click', () => {
  state.words.pop();
  renderSentence();
  renderCaption(false);
});
$('clearBtn').addEventListener('click', () => {
  state.words = [];
  renderSentence();
  renderCaption(false);
});
$('prevBtn').addEventListener('click', () => showLesson(state.lesson - 1));
$('nextBtn').addEventListener('click', () => showLesson(state.lesson + 1));
$('picker').addEventListener('click', (e) => {
  const b = e.target.closest('[data-lesson]');
  if (b) showLesson(Number(b.dataset.lesson));
});
$('signList').addEventListener('click', (e) => {
  const b = e.target.closest('[data-lesson]');
  if (!b) return;
  state.lesson = Number(b.dataset.lesson);
  setMode('practice');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
$('aboutBtn').addEventListener('click', () => $('about').showModal());
$('resetBtn').addEventListener('click', () => {
  progress.resetProgress();
  buildSignList();
  buildPicker();
  renderReps();
});
document.addEventListener('keydown', (e) => {
  if (state.mode !== 'practice' || e.target.closest('input, textarea, dialog')) return;
  if (e.key === 'ArrowLeft') showLesson(state.lesson - 1);
  if (e.key === 'ArrowRight') showLesson(state.lesson + 1);
});

// With ?debug, the numbers behind every decision are shown under the mirror (and in the console).
if (debugOn) window.signspeak = { recognizer, state, tick };

buildSignList();
buildPicker();
renderSentence();
showLesson(0);
if (location.hash === '#practice') setMode('practice');
