# SignSpeak design

## Concept: "Mirror and captions"

Learning a sign feels like standing in front of a mirror, copying a teacher. SignSpeak is that
mirror. Your camera image is flipped like a real mirror, the AI draws the hand it sees in
bright yellow, and every sign it understands appears as a **live caption** under the mirror,
the way captions appear under a TV show. Captions are the everyday tool of Deaf and
hard-of-hearing viewers, so the output speaks their visual language.

In Practice mode, the mirror becomes a teacher. Sign linguists describe every sign with a
few **parameters**: handshape, location and movement. SignSpeak shows each sign as three
tiles, one per parameter, and each tile **lights up yellow** the moment you get that part
right. You always know which part to fix.

The one bold thing is the caption: big, heavy type on a deep teal band. Everything else is
quiet.

## Color tokens

| Token | Hex | Used for |
|---|---|---|
| `--mist` | `#E6F0EE` | Page background. Pale sea glass, cool, not cream. |
| `--card` | `#FFFFFF` | Panels and parameter tiles. |
| `--ink` | `#0C3440` | Text, the caption band, the frame around the mirror. Deep teal, not black. |
| `--sea` | `#0F7F74` | Buttons, the active tab, links. White text on it is 4.9:1. |
| `--hand` | `#FFC83D` | Caption yellow. Only for "the AI sees it": the hand skeleton, a lit tile, the target spot. |
| `--line` | `#BFD3CF` | Borders and dividers. |

Every color means one thing. Yellow is never decoration: if something is yellow, the AI
detected it or you got it right.

## Type

**Atkinson Hyperlegible Next** (Google Fonts) for everything. It was designed by the
Braille Institute to be easy to read for people with low vision: every letter has a
distinct shape (no confusing I, l and 1). An accessibility typeface for an accessibility app.

- Caption: 800, 44–56 px, tight line height. The loudest thing on screen.
- Headings: 800, 26–33 px.
- Body: 400/600, 17 px, line height 1.5. A size ratio of 1.25 (17, 21, 26.5, 33, 41.5).
- Buttons: 600, 17 px, sentence case.

## Layout

Desktop (the mirror on the left, the panel on the right):

```
┌──────────────────────────────────────────────────────────────┐
│ ✋ SignSpeak            ( Talk | Practice )            About  │
├───────────────────────────────────────┬──────────────────────┤
│ ┌───────────────────────────────────┐ │ Talk: your sentence  │
│ │                                   │ │ "Hello, thank you"   │
│ │     mirror + yellow hand          │ │ Speak  Undo  Clear   │
│ │ (I see: flat hand)                │ │                      │
│ │▐ Thank you                       ▌│ │ The 10 signs I know  │
│ └───────────────────────────────────┘ │                      │
└───────────────────────────────────────┴──────────────────────┘
```

Practice panel:

```
│ ‹  Mother        4 of 10  ›          │
│ ┌hand────┐ ┌place───┐ ┌move────┐     │  three parameter tiles, each lights up
│ │ drawing│ │ head + │ │ arrow  │     │
│ └────────┘ └ spot ──┘ └────────┘     │
│ Open hand   Thumb on    Tap twice    │
│ Hint: Spread your fingers apart.     │
│ ● ● ○  Sign it 3 times to learn it   │
```

Phone: the mirror on top, full width, and the panel below it. Text is left aligned.
The caption band is part of the mirror, so it's always next to your hand.

## Illustrations

The handshape drawings are generated from the same 21-point hand model the AI uses (wrist,
knuckles, finger joints). A white hand with an ink outline, drawn from a small 3D hand model,
so the teaching pictures and the AI speak the same language. The location tile is a simple
head-and-shoulders outline with a yellow spot; the movement tile is one ink arrow.

## Principles

1. **Show what the AI sees.** The yellow skeleton, the "I see" chip and the lit tiles make
   the model's thinking visible, so a wrong guess is understandable, not mysterious.
2. **One job per color.** Yellow = detected. Sea = something you can press.
3. **Mirror, not camera.** Everything is flipped like a mirror, so your right hand is on the
   right, like copying a teacher.
4. **Honest about limits.** SignSpeak knows 10 ASL signs. It says so, and it points to Deaf
   teachers for the rest.
5. **Private by default.** The video never leaves the device. No account, no upload.

## What I rejected as generic

- Emoji hands (🤟 ✋) for the signs. They don't show the real handshape (there's no emoji for a
  flat O) and they look like every other demo.
- A dark "AI lab" screen with a neon accent. This is a friendly learning tool for kids and
  families, so it's light and calm.
- Chopping the panel into many identical shadowed cards. The three parameter tiles are the only
  tiles, because they are the only things that light up.
- A progress-percentage dashboard. Progress is three dots per sign, because learning a sign
  means doing it a few times, not a score.
