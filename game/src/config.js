// LUMEN DRIFT — tuning constants.
// One place for every number that shapes how the game feels. Nothing here
// is read from anywhere else, so balancing is a matter of editing this file.

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
  particle: '#7dd3fc',
  text: '#e6f1ff',
  dimText: '#8ea2c8',
  danger: '#ff4d6d',
  good: '#4ade80',
};

export const PLAYER = {
  radius: 14,
  accel: 2600, // px per second squared
  maxSpeed: 340,
  drag: 3.2, // exponential damping per second when no input
  dashSpeed: 920,
  dashTime: 0.14, // seconds of burst
  dashCooldown: 1.0, // seconds before the next dash
  dashInvuln: 0.26, // seconds of protection around a dash
  hitInvuln: 1.4, // seconds of protection after taking a hit
  lives: 3,
};

export const SHARD = {
  radius: 7,
  value: 10,
  spawnInterval: 0.85, // seconds between spawns at wave 1
  spawnIntervalMin: 0.42,
  driftMin: 18,
  driftMax: 62,
  lifetime: 12, // seconds before a shard fades away
  maxOnField: 14,
};

export const MINE = {
  radiusMin: 12,
  radiusMax: 18,
  spawnInterval: 2.4, // seconds between spawns at wave 1
  spawnIntervalMin: 0.9,
  speedMin: 42,
  speedMax: 118,
  maxOnField: 6, // plus one per wave, capped below
  maxOnFieldCap: 15,
  wobble: 0.9, // radians per second of steering wobble
};

export const COMBO = {
  window: 2.5, // seconds to keep the chain alive
  perStep: 4, // pickups per multiplier step
  maxMultiplier: 5,
};

export const WAVES = {
  count: 10,
  secondsPerWave: 22,
  bannerTime: 2.0, // seconds the "WAVE N" banner stays up
};

export const SCORE_TARGET = 600; // reaching this wins at once

export const PARTICLES = {
  pickupBurst: 14,
  hitBurst: 26,
  dashTrail: 3, // particles per frame while dashing
  ambientMotes: 42, // slow background dust
};
