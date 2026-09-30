# SignSpeak: Devpost submission

> Before you paste: read it, and change anything that doesn't sound like you.
> The judges want *your* voice.

---

**Project name:** SignSpeak

**Tagline (Elevator pitch):** Learn your first 10 signs in American Sign Language with an AI
that watches your hand, shows the words as captions and says them out loud.

---

## Inspiration

I wanted to give people a little taste of sign language. Trying your first sign can feel
strange, because nobody tells you if you're doing it right. So I built an app where anyone can
try their first signs in front of their own camera and see right away what they got right.
I hope it makes people curious enough to keep learning, from real Deaf teachers.

## Problem statement

Millions of Deaf and hard-of-hearing people use sign language every day, but most hearing
people can't say even "hello" or "thank you" in it. Learning from videos is hard because
nobody tells you what you're doing wrong: is it your hand, where you hold it, or how you move
it?

## What it does

SignSpeak turns your camera into a mirror that understands signs.

- **Talk mode:** sign one of 10 ASL signs (hello, thank you, yes, no, please, sorry, I love you,
  mother, father, eat). The word appears as a live caption under your video and is spoken out
  loud. Signs build a sentence you can play again.
- **Practice mode:** each sign is shown as three tiles: **handshape**, **place** and
  **movement**, the three parts sign linguists use to describe a sign. Each tile lights up
  yellow the moment you get that part right, and a hint says exactly what to fix ("Spread your
  fingers apart", "Touch your chin with your thumb"). A yellow ring on the video shows where your
  hand should go. Sign it 3 times and it's learned.
- **"I see" label:** the app always shows what the AI sees right now ("I see: open hand at your
  chin"), so it never feels like a black box.
- **Private:** everything runs in the browser. The video is never recorded or uploaded, and
  there's no account.

Some sign pairs are there on purpose: **Mother** and **Father** use the same handshape in a
different place, and **Please** and **Sorry** use the same movement with a different handshape.
They show learners that every part of a sign matters.

## Target users

Hearing kids, teens, families and classmates who want to take a first step toward
communicating with Deaf people: a Deaf classmate, a neighbor, a family member. Teachers can use
it to introduce sign language in class.

## How we built it

- **Hand and face tracking:** Google's **MediaPipe** Hand Landmarker finds 21 points on the hand
  (in 2D and in 3D) and the Face Detector finds 6 points on the face. Both are neural networks
  that run inside the browser on WebAssembly and the graphics chip, so there's no server and no
  paid API.
- **Handshape:** from the 3D points I compute simple features for each finger: how much it bends
  (the sum of the angles at its three joints), how far the fingertip reaches from the wrist, how
  close it is to the thumb, plus how spread the fingers are. Each handshape is a list of fuzzy
  checks that each score 0 to 1. The weakest check decides the score, and it's also the hint
  the app shows.
- **Place:** from the eyes and mouth the app estimates the forehead, chin and chest, measured in
  "face widths" so it works close to the camera and far away.
- **Movement:** the recognizer remembers the last 3 seconds and runs a small detector per
  movement: counting up-and-down swings for "yes", adding up rotation for a circle, "open then
  closed" for "no", and how far the hand moved from where it rested for "hello" and
  "thank you".
- **Testing without a camera:** I made a small 3D hand model that builds any handshape. It
  powers 34 automated tests that "play" every sign in front of a pretend face at random angles
  with noise, and also draws the teaching pictures, so the pictures and the AI use the same
  21-point hand.
- **Testing on real hands:** I ran MediaPipe on photos of ASL alphabet letters from a public
  Hugging Face dataset, because several letters share SignSpeak's handshapes. The rules got fists
  right 75 of 79 times, two-finger shapes 39 of 39, flat hands 22 of 28, and did not confuse
  other letters (Y, L, W, I) with SignSpeak's handshapes in 109 of 110 photos.
- **Design:** captions are the everyday tool of Deaf and hard-of-hearing viewers, so recognized
  words appear as big captions under the mirror. Yellow always means "the AI sees it". The
  typeface, Atkinson Hyperlegible, was designed by the Braille Institute for readers with low
  vision.
- **Stack:** plain HTML, CSS and JavaScript (no framework, no build step), MediaPipe Tasks Vision,
  the Web Speech API for the voice.
- I built it with **Claude** (an AI assistant by Anthropic) as my coding partner. I chose the
  idea and how the app should work, tested it with my own camera, and Claude helped me write the
  code and explained how every part works.

## Challenges we ran into

- **A hand alone isn't enough.** In ASL, "mother" and "father" have the same handshape; only
  the place is different (chin or forehead). So I added face detection and measure every place
  in face widths.
- **Real hands don't match textbook numbers.** My first rules came from the 3D model. On real
  photos, the ring finger in a "V" only bent about 135 degrees instead of 200+, and a fist and
  the letter O looked alike. I added a "fingertip reach" feature and tuned the thresholds on real
  data.
- **False alarms.** Dropping an open hand after signing "eat" looked exactly like "thank you"
  (flat hand at the chin, moving down). Now a movement only starts after the hand rests still for
  a moment, and the second after a sign is ignored.
- **Signs that repeat.** Holding "I love you" shouldn't say it 20 times, so each sign waits until
  you drop your hand.

## Accomplishments that we're proud of

- It gives feedback like a teacher: not just "wrong", but *which part* is wrong and how to fix it.
- It runs completely in the browser, even on a normal laptop, with no data leaving the device.
- 34 automated tests plus a check on real photos of hands.

## What we learned

- How hand tracking works: 21 landmarks, 2D vs. 3D coordinates, and why 3D makes the rules
  stay the same when the hand turns.
- That sign languages have their own "phonology" (handshape, place, movement), and that ASL and
  Israeli Sign Language are different languages.
- How to test an AI feature honestly: synthetic data for the logic, real data for the numbers,
  and saying clearly what the numbers mean.

## Social impact

SignSpeak lowers the first barrier between hearing and Deaf people: not knowing a single word.
It's free, needs only a browser and a camera, and keeps the video private. It doesn't pretend
to be a translator: the app says clearly that ASL is a full language and points learners to
Deaf teachers.

## What's next for SignSpeak

- More signs, including two-handed ones (MediaPipe can track two hands).
- Israeli Sign Language, made together with Deaf signers so the signs are right.
- A small model trained on short videos of signs, on top of today's rules.
- A quiz mode and a way for teachers to share lessons with a class.

## Team

Solo project: ✏️ *[your first name only]*.

---

**Built with:** javascript, html5, css3, mediapipe, webassembly, web-speech-api,
machine-learning, computer-vision, claude

**Try it out:**
- GitHub: `https://github.com/Tomerbot/signspeak`
- Live demo: `https://tomerbot.github.io/signspeak/` (after GitHub Pages is on)

**Video:** YouTube link (Unlisted), in the form `https://www.youtube.com/watch?v=...`

**Image gallery:** `SignSpeak_thumbnail.png` first, then 2–3 screenshots from your own recording
(Talk with a caption, Practice with lit tiles).

---

## Notes for judges (the "additional info" field, if there is one)

```
How to test:
- Live demo: https://tomerbot.github.io/signspeak/ (Chrome or Edge, allow the camera).
- Code: https://github.com/Tomerbot/signspeak. The README explains how to run it locally
  (python -m http.server 8000) and how it works.
- Quickest path: press Turn on camera, then sign "I love you" (thumb, index and pinky out) and
  hold it still. Then open Practice and try Mother, then Father.
- Add ?debug to the address to see the numbers behind every decision.
- Tests: node tests/run.js (34 tests).

I built this with Claude (an AI assistant by Anthropic) as my coding partner. I chose the idea,
tested it and recorded the demo myself.
```
