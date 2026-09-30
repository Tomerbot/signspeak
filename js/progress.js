// Remembers how many times you signed each sign in Practice (on this device only).

const KEY = 'signspeak:reps';
export const REPS_TO_LEARN = 3;

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

let reps = read();

export function repsFor(id) {
  return Math.min(REPS_TO_LEARN, reps[id] || 0);
}

export function isLearned(id) {
  return repsFor(id) >= REPS_TO_LEARN;
}

export function addRep(id) {
  reps[id] = (reps[id] || 0) + 1;
  try {
    localStorage.setItem(KEY, JSON.stringify(reps));
  } catch {
    // Private windows can block storage. Practice still works, it just isn't saved.
  }
  return repsFor(id);
}

export function learnedCount(ids) {
  return ids.filter(isLearned).length;
}

export function resetProgress() {
  reps = {};
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}
