// LUMEN DRIFT — the loop and the screen flow.
// main.js wires input, audio, the world and the renderer together, runs the
// frame loop, and owns the title / playing / paused / win / game-over states.
// The world owns the rules; this file owns when they run.

import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createWorld } from './world.js';
import { createRenderer } from './render.js';

const canvas = document.getElementById('game');
const input = createInput(canvas);
const audio = createAudio();
const renderer = createRenderer(canvas);
const { world, reset, update, applyPreset } = createWorld(Date.now());

const BEST_KEY = 'lumen-drift-best';
let best = 0;
let endShownAt = -10;
try {
  best = Number(window.localStorage.getItem(BEST_KEY) || 0) || 0;
} catch (error) {
  best = 0;
}

function saveBest() {
  if (world.score > best) {
    best = world.score;
    try {
      window.localStorage.setItem(BEST_KEY, String(best));
    } catch (error) {
      // Private mode or no storage: the score still shows this session.
    }
  }
}

function startGame() {
  audio.unlock();
  audio.click();
  reset(Date.now());
}

function finishRun() {
  saveBest();
  endShownAt = world.time;
}

// Leaving the tab pauses the game instead of letting the field run on.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && world.status === 'playing') {
    world.status = 'paused';
  }
});

// Screenshot presets, read once at load: ?shot=start shows the title,
// ?shot=play a busy mid-game field, ?shot=win the win screen and
// ?shot=end the game-over screen. A normal visit has no parameter and
// opens on the title like any player would see it.
const shot = new URLSearchParams(window.location.search).get('shot');
if (shot === 'play' || shot === 'win' || shot === 'end') {
  applyPreset(shot);
} else {
  world.status = 'title';
}

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  // world.update advances world.time while playing; advance it here only on
  // the screens where update does not run, so it always moves at real speed.
  if (world.status !== 'playing') world.time += dt;

  if (input.muteRequested()) {
    const muted = audio.toggleMute();
    document.title = muted ? 'LUMEN DRIFT (muted)' : 'LUMEN DRIFT';
  }

  if (world.status === 'title') {
    if (input.startRequested()) startGame();
  } else if (world.status === 'playing') {
    if (input.pauseRequested()) {
      world.status = 'paused';
    } else {
      const events = update(dt, input);
      for (const event of events) {
        if (event.type === 'pickup') audio.pickup(event.multiplier);
        if (event.type === 'hit') audio.hit();
        if (event.type === 'dash') audio.dash();
        if (event.type === 'wave') audio.wave();
        if (event.type === 'win') {
          audio.win();
          finishRun();
        }
        if (event.type === 'lose') {
          audio.lose();
          finishRun();
        }
      }
    }
  } else if (world.status === 'paused') {
    if (input.pauseRequested() || input.startRequested()) {
      world.status = 'playing';
      audio.click();
    } else if (input.restartRequested()) {
      startGame();
    }
  } else if (world.status === 'win' || world.status === 'over') {
    // A click or keypress that ended the run must not restart it at once:
    // ignore start input for a beat after the end screen appears.
    if (world.time - endShownAt > 0.6 && (input.restartRequested() || input.startRequested())) {
      startGame();
    }
  }

  renderer.draw(world, best);
  input.endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// A small handle for the play-test driver: it reads the live state without
// touching the game, so automated checks can assert on it.
window.__lumen = {
  world,
  get status() {
    return world.status;
  },
  get score() {
    return world.score;
  },
  get best() {
    return best;
  },
};
