// LUMEN DRIFT v2 — small deterministic random helpers.
// The game uses a seeded generator so a screenshot preset can replay the
// same field, while a normal game seeds from the clock. Nothing here touches
// Math.random after construction, which keeps the field reproducible.

export function makeRng(seed) {
  // mulberry32: a tiny, fast seeded generator with a decent spread.
  let state = (seed >>> 0) || 0x9e3779b9;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function range(rng, min, max) {
  return min + rng() * (max - min);
}

export function intIn(rng, min, max) {
  return Math.floor(range(rng, min, max + 1));
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function chance(rng, probability) {
  return rng() < probability;
}

export function angle(rng) {
  return rng() * Math.PI * 2;
}

// Pick a key from a weights table such as { shield: 30, magnet: 30 }.
export function weightedPick(rng, weights) {
  let total = 0;
  for (const key of Object.keys(weights)) total += weights[key];
  let roll = rng() * total;
  for (const key of Object.keys(weights)) {
    roll -= weights[key];
    if (roll <= 0) return key;
  }
  return Object.keys(weights)[0];
}

// A point safely inside the field, away from the given centre by at least
// the given distance, so spawns never land on top of the player.
export function pointAwayFrom(rng, cx, cy, minDistance, width, height, margin) {
  for (let tries = 0; tries < 12; tries += 1) {
    const x = range(rng, margin, width - margin);
    const y = range(rng, margin, height - margin);
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy >= minDistance * minDistance) {
      return { x, y };
    }
  }
  // Fallback: the corner farthest from the centre, never on top of it.
  const corners = [
    { x: margin, y: margin },
    { x: width - margin, y: margin },
    { x: margin, y: height - margin },
    { x: width - margin, y: height - margin },
  ];
  let bestCorner = corners[0];
  let bestDistance = -1;
  for (const corner of corners) {
    const dx = corner.x - cx;
    const dy = corner.y - cy;
    const distance = dx * dx + dy * dy;
    if (distance > bestDistance) {
      bestDistance = distance;
      bestCorner = corner;
    }
  }
  return bestCorner;
}
