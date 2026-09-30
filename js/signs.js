// The 10 ASL (American Sign Language) signs SignSpeak knows.
//
// Sign languages describe every sign with a few parts ("parameters"):
//   handshape: what your hand looks like
//   location:  where it is, compared with your face and body
//   movement:  what it does
// SignSpeak checks each part on its own, so it can tell you which part to fix.
//
// anchor = the part of the hand that has to be at the location:
//   tips = index or middle fingertip, thumb = thumb tip, palm = middle of the hand,
//   pinch = the fingertips that touch in a flat O.

export const SIGNS = [
  {
    id: 'hello',
    word: 'Hello',
    shape: 'B',
    pose: 'B',
    location: 'forehead',
    anchor: 'tips',
    movement: 'away',
    how: {
      shape: 'Flat hand, fingers together',
      location: 'Fingertips at the side of your forehead',
      movement: 'Move it out, like a salute',
    },
    locationHint: 'Put your fingertips at the side of your forehead',
  },
  {
    id: 'thankyou',
    word: 'Thank you',
    shape: 'B',
    pose: 'B',
    location: 'chin',
    anchor: 'tips',
    movement: 'downOut',
    how: {
      shape: 'Flat hand, fingers together',
      location: 'Fingertips on your chin',
      movement: 'Move it forward and down, toward the person',
    },
    locationHint: 'Put your fingertips on your chin',
  },
  {
    id: 'yes',
    word: 'Yes',
    shape: 'FIST',
    pose: 'S',
    location: 'any',
    anchor: 'palm',
    movement: 'nod',
    how: {
      shape: 'Fist',
      location: 'In front of you',
      movement: 'Bend your wrist up and down, like a head nodding',
    },
  },
  {
    id: 'no',
    word: 'No',
    shape: 'TWO',
    pose: 'TWO',
    location: 'any',
    anchor: 'palm',
    movement: 'snap',
    how: {
      shape: 'Index and middle finger out, with your thumb',
      location: 'In front of you',
      movement: 'Snap the two fingers down onto your thumb',
    },
  },
  {
    id: 'please',
    word: 'Please',
    shape: 'B',
    pose: 'B',
    location: 'chest',
    anchor: 'palm',
    movement: 'circle',
    how: {
      shape: 'Flat hand',
      location: 'On your chest',
      movement: 'Rub in a circle',
    },
    locationHint: 'Put your hand on your chest',
  },
  {
    id: 'sorry',
    word: 'Sorry',
    shape: 'FIST',
    pose: 'A',
    location: 'chest',
    anchor: 'palm',
    movement: 'circle',
    how: {
      shape: 'Fist, thumb along the side',
      location: 'On your chest',
      movement: 'Rub in a circle',
    },
    locationHint: 'Put your fist on your chest',
  },
  {
    id: 'iloveyou',
    word: 'I love you',
    shape: 'ILY',
    pose: 'ILY',
    location: 'any',
    anchor: 'palm',
    movement: 'hold',
    how: {
      shape: 'Thumb, index and pinky out',
      location: 'In front of you, palm facing out',
      movement: 'Hold it still',
    },
  },
  {
    id: 'mother',
    word: 'Mother',
    shape: 'FIVE',
    pose: 'FIVE',
    location: 'chin',
    anchor: 'thumb',
    movement: 'touch',
    how: {
      shape: 'Open hand, fingers spread',
      location: 'Thumb on your chin',
      movement: 'Tap your chin twice',
    },
    locationHint: 'Touch your chin with your thumb',
  },
  {
    id: 'father',
    word: 'Father',
    shape: 'FIVE',
    pose: 'FIVE',
    location: 'forehead',
    anchor: 'thumb',
    movement: 'touch',
    how: {
      shape: 'Open hand, fingers spread',
      location: 'Thumb on your forehead',
      movement: 'Tap your forehead twice',
    },
    locationHint: 'Touch your forehead with your thumb',
  },
  {
    id: 'eat',
    word: 'Eat',
    shape: 'FLAT_O',
    pose: 'FLAT_O',
    location: 'mouth',
    anchor: 'pinch',
    movement: 'touch',
    how: {
      shape: 'Fingertips together on your thumb',
      location: 'At your mouth',
      movement: 'Tap your lips twice',
    },
    locationHint: 'Bring your fingertips to your mouth',
  },
];

export const SIGN_BY_ID = Object.fromEntries(SIGNS.map((s) => [s.id, s]));
