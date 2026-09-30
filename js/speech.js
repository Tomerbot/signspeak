// Says words out loud with the browser's built-in voice (Web Speech API). Free and offline.

let voice = null;

function pickVoice() {
  const voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
  voice =
    voices.find((v) => v.lang === 'en-US' && /natural|neural/i.test(v.name)) ||
    voices.find((v) => v.lang === 'en-US') ||
    voices.find((v) => v.lang && v.lang.startsWith('en')) ||
    null;
}

if (window.speechSynthesis) {
  pickVoice();
  speechSynthesis.addEventListener('voiceschanged', pickVoice);
}

export const canSpeak = () => !!window.speechSynthesis;

export function speak(text) {
  if (!window.speechSynthesis || !text) return;
  speechSynthesis.cancel(); // the newest word wins
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  if (voice) u.voice = voice;
  u.rate = 0.95;
  speechSynthesis.speak(u);
}
