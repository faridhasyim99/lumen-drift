// LUMEN DRIFT v2 — tuning constants.
// One place for every number that shapes how the game feels. v2 adds three
// new enemy types, four power-ups and a wave table that actually ramps: the
// field starts calm and is a storm by wave 8. Nothing here is read from
// anywhere else, so balancing is a matter of editing this file.

export const VIEW = {
  width: 960,
  height: 540,
};

export const COLORS = {
  background: '#070b24',
  backgroundEdge: '#0d1233',
  grid: 'rgba(56, 120, 255, 0.07)',
  player: '#5ef2ff',
  playerCore: '#eafcff',
  shard: '#ffd166',
  shardCore: '#fff3c4',
  mine: '#1a1033',
  mineRim: '#ff4d6d',
  mineSpike: '#c9184a',
  chaser: '#ff9f1c',
  chaserCore: '#ffe8b3',
  spinner: '#b5179e',
  spinnerCore: '#f72585',
  splitter: '#7b2cbf',
  splitterCore: '#c77dff',
  mini: '#ff4d6d',
  shield: '#38bdf8',
  magnet: '#a78bfa',
  slowmo: '#2dd4bf',
  extralife: '#fb7185',
  particle: '#7dd3fc',
  text: '#e6f1ff',
  dimText: '#8ea2c8',
  danger: '#ff4d6d',
  good: '#4ade80',
};

export const PLAYER = {
  radius: 14,
  accel: 2800, // px per second squared
  maxSpeed: 360,
  drag: 3.2, // exponential damping per second when no input
  dashSpeed: 940,
  dashTime: 0.14, // seconds of burst
  dashCooldown: 0.9, // seconds before the next dash
  dashInvuln: 0.26, // seconds of protection around a dash
  hitInvuln: 1.4, // seconds of protection after taking a hit
  lives: 3,
  maxLives: 4,
};

export const SHARD = {
  radius: 7,
  value: 10,
  spawnInterval: 0.8, // seconds between spawns at wave 1
  spawnIntervalMin: 0.38,
  driftMin: 18,
  driftMax: 62,
  lifetime: 12, // seconds before a shard fades away
  maxOnField: 16,
};

// The classic void mine: drifts in from an edge, hunting the player with a
// slow steering wobble.
export const MINE = {
  radiusMin: 12,
  radiusMax: 18,
  spawnInterval: 2.6, // seconds between spawns at wave 1
  spawnIntervalMin: 0.8,
  speedMin: 42,
  speedMax: 118,
  maxOnField: 5, // plus one per wave, capped below
  maxOnFieldCap: 14,
  wobble: 0.9, // radians per second of steering wobble
};

// Chaser drone: small, fast, steers hard toward the player. Unlocks wave 2.
export const CHASER = {
  radius: 10,
  unlockWave: 2,
  spawnInterval: 3.0,
  spawnIntervalMin: 1.2,
  speedMin: 95,
  speedMax: 150,
  speedPerWave: 8,
  turnRate: 2.6, // radians per second it can steer
  maxOnField: 2,
  maxOnFieldCap: 6,
};

// Spinner: a big spiked ring that rolls across the field in a straight line.
// Slow, but its spikes reach far. Unlocks wave 3.
export const SPINNER = {
  radius: 20,
  unlockWave: 3,
  spawnInterval: 4.5,
  spawnIntervalMin: 2.2,
  speedMin: 30,
  speedMax: 55,
  spin: 2.2, // radians per second the ring turns
  maxOnField: 1,
  maxOnFieldCap: 4,
};

// Splitter: a fat mine that bursts into two fast minis after a few seconds
// on the field. Deal with it early or deal with two of it. Unlocks wave 4.
export const SPLITTER = {
  radius: 16,
  unlockWave: 4,
  spawnInterval: 5.5,
  spawnIntervalMin: 3.0,
  speedMin: 50,
  speedMax: 80,
  splitAge: 6, // seconds on the field before it splits
  maxOnField: 1,
  maxOnFieldCap: 2,
};

export const MINI = {
  radius: 9,
  speed: 150,
  lifetime: 8, // seconds before a mini burns out and leaves the field
};

// Power-ups: one drifts in every so often. Shield eats one hit, magnet
// pulls shards in, slow-mo halves every enemy for a while, and a rare extra
// life tops the player back up.
export const POWERUP = {
  radius: 12,
  spawnInterval: 14,
  firstAt: 9, // seconds into the run before the first one appears
  lifetime: 10,
  shieldSeconds: 12,
  magnetSeconds: 8,
  magnetRadius: 200,
  magnetPull: 300, // px per second shards rush toward the player
  slowSeconds: 6,
  slowFactor: 0.5,
  weights: { shield: 30, magnet: 30, slowmo: 25, life: 15 },
};

export const COMBO = {
  window: 2.5, // seconds to keep the chain alive
  perStep: 4, // pickups per multiplier step
  maxMultiplier: 5,
};

export const WAVES = {
  count: 10,
  secondsPerWave: 20,
  bannerTime: 2.0, // seconds the "WAVE N" banner stays up
  clearBonus: 25, // lumen paid out when a wave is cleared
};

export const SCORE_TARGET = 600; // reaching this wins at once

export const PARTICLES = {
  pickupBurst: 16,
  hitBurst: 30,
  dashTrail: 3, // particles per frame while dashing
  ambientMotes: 42, // slow background dust
  powerupBurst: 22,
  splitBurst: 18,
};

// Parallax starfield: three layers drifting down at different speeds, plus
// slow nebula blobs for depth. Counts are per layer.
export const STARS = {
  far: 60,
  mid: 36,
  near: 18,
  farSpeed: 6,
  midSpeed: 14,
  nearSpeed: 26,
};

export const NEBULAE = [
  { x: 0.2, y: 0.25, radius: 190, color: 'rgba(80, 60, 200, 0.10)' },
  { x: 0.82, y: 0.62, radius: 220, color: 'rgba(20, 120, 180, 0.09)' },
  { x: 0.55, y: 0.85, radius: 160, color: 'rgba(180, 40, 120, 0.07)' },
];
