// LUMEN DRIFT — the world: player, shards, mines, waves and particles.
// This file owns every rule of the game itself: movement, spawning, the
// combo chain, collisions and the win/lose conditions. It knows nothing about
// the canvas or the DOM; it returns events and main.js turns them into sound
// and screen changes.

import {
  VIEW, COLORS, PLAYER, SHARD, MINE, COMBO, WAVES, SCORE_TARGET, PARTICLES,
} from './config.js';
import { makeRng, range, pointAwayFrom, angle } from './random.js';

export function createWorld(seed) {
  let rng = makeRng(seed);

  const world = {
    player: null,
    shards: [],
    mines: [],
    particles: [],
    motes: [],
    score: 0,
    chain: 0,
    comboTimer: 0,
    multiplier: 1,
    wave: 1,
    waveTimer: 0,
    banner: 0,
    bannerText: '',
    shardTimer: 0.4,
    mineTimer: 1.6,
    shake: 0,
    time: 0,
    status: 'title', // title | playing | paused | win | over
    wonBy: '',
  };

  function reset(seedValue) {
    rng = makeRng(seedValue);
    world.player = {
      x: VIEW.width / 2,
      y: VIEW.height / 2,
      vx: 0,
      vy: 0,
      radius: PLAYER.radius,
      lives: PLAYER.lives,
      invuln: 0,
      dashLeft: 0,
      dashCooldown: 0,
      dashX: 0,
      dashY: -1,
    };
    world.shards = [];
    world.mines = [];
    world.particles = [];
    world.motes = [];
    for (let i = 0; i < PARTICLES.ambientMotes; i += 1) {
      world.motes.push({
        x: rng() * VIEW.width,
        y: rng() * VIEW.height,
        size: range(rng, 0.8, 2.4),
        speed: range(rng, 4, 14),
        phase: rng() * Math.PI * 2,
      });
    }
    world.score = 0;
    world.chain = 0;
    world.comboTimer = 0;
    world.multiplier = 1;
    world.wave = 1;
    world.waveTimer = 0;
    world.banner = 0;
    world.bannerText = '';
    world.shardTimer = 0.4;
    world.mineTimer = 1.6;
    world.shake = 0;
    world.time = 0;
    world.status = 'playing';
    world.wonBy = '';
    spawnShard();
    spawnShard();
    spawnShard();
  }

  function spawnShard() {
    if (world.shards.length >= SHARD.maxOnField) return;
    const point = pointAwayFrom(
      rng, world.player.x, world.player.y, 120, VIEW.width, VIEW.height, 30,
    );
    const drift = angle(rng);
    const speed = range(rng, SHARD.driftMin, SHARD.driftMax);
    world.shards.push({
      x: point.x,
      y: point.y,
      vx: Math.cos(drift) * speed,
      vy: Math.sin(drift) * speed,
      radius: SHARD.radius,
      age: 0,
      lifetime: SHARD.lifetime,
      twinkle: rng() * Math.PI * 2,
    });
  }

  function spawnMine() {
    const cap = Math.min(MINE.maxOnFieldCap, MINE.maxOnField + world.wave - 1);
    if (world.mines.length >= cap) return;
    const edge = Math.floor(rng() * 4);
    let x = 0;
    let y = 0;
    if (edge === 0) { x = range(rng, 40, VIEW.width - 40); y = -24; }
    if (edge === 1) { x = range(rng, 40, VIEW.width - 40); y = VIEW.height + 24; }
    if (edge === 2) { x = -24; y = range(rng, 40, VIEW.height - 40); }
    if (edge === 3) { x = VIEW.width + 24; y = range(rng, 40, VIEW.height - 40); }
    const toward = Math.atan2(world.player.y - y, world.player.x - x);
    const speed = range(rng, MINE.speedMin, MINE.speedMax + world.wave * 6);
    world.mines.push({
      x, y,
      vx: Math.cos(toward) * speed,
      vy: Math.sin(toward) * speed,
      radius: range(rng, MINE.radiusMin, MINE.radiusMax),
      spin: range(rng, -1.6, 1.6),
      angle: rng() * Math.PI * 2,
      wobble: rng() * Math.PI * 2,
    });
  }

  function burst(x, y, count, color, speed) {
    for (let i = 0; i < count; i += 1) {
      const direction = angle(rng);
      const velocity = range(rng, speed * 0.3, speed);
      world.particles.push({
        x, y,
        vx: Math.cos(direction) * velocity,
        vy: Math.sin(direction) * velocity,
        life: 0,
        maxLife: range(rng, 0.35, 0.8),
        size: range(rng, 1.5, 3.5),
        color,
      });
    }
  }

  function startDash(input) {
    const p = world.player;
    if (p.dashCooldown > 0 || p.dashLeft > 0) return false;
    let dx = p.vx;
    let dy = p.vy;
    if (Math.hypot(dx, dy) < 20) {
      dx = input.mouse.x - p.x;
      dy = input.mouse.y - p.y;
    }
    if (Math.hypot(dx, dy) < 20) { dx = 0; dy = -1; }
    const length = Math.hypot(dx, dy);
    p.dashX = dx / length;
    p.dashY = dy / length;
    p.dashLeft = PLAYER.dashTime;
    p.dashCooldown = PLAYER.dashCooldown;
    p.invuln = Math.max(p.invuln, PLAYER.dashInvuln);
    return true;
  }

  function collectShard(index) {
    const shard = world.shards[index];
    world.shards.splice(index, 1);
    world.chain += 1;
    world.comboTimer = COMBO.window;
    world.multiplier = Math.min(
      COMBO.maxMultiplier,
      1 + Math.floor(world.chain / COMBO.perStep),
    );
    const gained = SHARD.value * world.multiplier;
    world.score += gained;
    burst(shard.x, shard.y, PARTICLES.pickupBurst, COLORS.shard, 130);
    return gained;
  }

  function hitMine(index) {
    const mine = world.mines[index];
    world.mines.splice(index, 1);
    const p = world.player;
    p.lives -= 1;
    p.invuln = PLAYER.hitInvuln;
    world.chain = 0;
    world.comboTimer = 0;
    world.multiplier = 1;
    world.shake = 12;
    burst(mine.x, mine.y, PARTICLES.hitBurst, COLORS.mineRim, 240);
    burst(p.x, p.y, 10, COLORS.player, 160);
    return p.lives;
  }

  function update(dt, input) {
    const events = [];
    world.time += dt;
    const p = world.player;

    // Timers.
    if (p.invuln > 0) p.invuln -= dt;
    if (p.dashCooldown > 0) p.dashCooldown -= dt;
    if (world.comboTimer > 0) {
      world.comboTimer -= dt;
      if (world.comboTimer <= 0) {
        world.chain = 0;
        world.multiplier = 1;
      }
    }
    if (world.banner > 0) world.banner -= dt;
    if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 26);

    // Movement: keys accelerate, the mouse steers when no key is held.
    const move = input.moveVector();
    if (move.x !== 0 || move.y !== 0) {
      p.vx += move.x * PLAYER.accel * dt;
      p.vy += move.y * PLAYER.accel * dt;
    } else if (input.mouse.inside) {
      const dx = input.mouse.x - p.x;
      const dy = input.mouse.y - p.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 10) {
        const pull = Math.min(1, distance / 140) * PLAYER.accel * 0.8;
        p.vx += (dx / distance) * pull * dt;
        p.vy += (dy / distance) * pull * dt;
      }
    }
    const speed = Math.hypot(p.vx, p.vy);
    const cap = speed > PLAYER.maxSpeed ? PLAYER.maxSpeed / speed : 1;
    p.vx *= cap;
    p.vy *= cap;
    if (move.x === 0 && move.y === 0 && !input.mouse.inside) {
      const drag = Math.exp(-PLAYER.drag * dt);
      p.vx *= drag;
      p.vy *= drag;
    }

    // Dash.
    if (input.dashRequested() && startDash(input)) {
      events.push({ type: 'dash' });
    }
    if (p.dashLeft > 0) {
      p.dashLeft -= dt;
      p.vx = p.dashX * PLAYER.dashSpeed;
      p.vy = p.dashY * PLAYER.dashSpeed;
      for (let i = 0; i < PARTICLES.dashTrail; i += 1) {
        world.particles.push({
          x: p.x + range(rng, -6, 6),
          y: p.y + range(rng, -6, 6),
          vx: -p.dashX * 60,
          vy: -p.dashY * 60,
          life: 0,
          maxLife: 0.35,
          size: range(rng, 1.5, 3),
          color: COLORS.player,
        });
      }
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.x = Math.max(p.radius, Math.min(VIEW.width - p.radius, p.x));
    p.y = Math.max(p.radius, Math.min(VIEW.height - p.radius, p.y));

    // Waves: the field gets hotter every wave, then the final wave ends it.
    world.waveTimer += dt;
    if (world.waveTimer >= WAVES.secondsPerWave) {
      world.waveTimer = 0;
      world.wave += 1;
      if (world.wave > WAVES.count) {
        world.status = 'win';
        world.wonBy = `cleared all ${WAVES.count} waves`;
        events.push({ type: 'win' });
        return events;
      }
      world.banner = WAVES.bannerTime;
      world.bannerText = world.wave === WAVES.count ? 'FINAL WAVE' : `WAVE ${world.wave}`;
      events.push({ type: 'wave', wave: world.wave });
    }

    // Spawning.
    world.shardTimer -= dt;
    if (world.shardTimer <= 0) {
      world.shardTimer = Math.max(
        SHARD.spawnIntervalMin,
        SHARD.spawnInterval - world.wave * 0.04,
      );
      spawnShard();
    }
    world.mineTimer -= dt;
    if (world.mineTimer <= 0) {
      world.mineTimer = Math.max(
        MINE.spawnIntervalMin,
        MINE.spawnInterval - world.wave * 0.16,
      );
      spawnMine();
    }

    // Shards drift, twinkle and fade.
    for (let i = world.shards.length - 1; i >= 0; i -= 1) {
      const shard = world.shards[i];
      shard.age += dt;
      shard.twinkle += dt * 5;
      shard.x += shard.vx * dt;
      shard.y += shard.vy * dt;
      if (shard.x < 8 || shard.x > VIEW.width - 8) shard.vx *= -1;
      if (shard.y < 8 || shard.y > VIEW.height - 8) shard.vy *= -1;
      if (shard.age >= shard.lifetime) world.shards.splice(i, 1);
    }

    // Mines hunt with a wobble.
    for (let i = world.mines.length - 1; i >= 0; i -= 1) {
      const mine = world.mines[i];
      mine.angle += mine.spin * dt;
      mine.wobble += dt * MINE.wobble;
      const steer = Math.sin(mine.wobble) * 26;
      const perpendicular = Math.atan2(mine.vy, mine.vx) + Math.PI / 2;
      mine.x += (mine.vx + Math.cos(perpendicular) * steer) * dt;
      mine.y += (mine.vy + Math.sin(perpendicular) * steer) * dt;
      if (mine.x < -40 || mine.x > VIEW.width + 40 || mine.y < -40 || mine.y > VIEW.height + 40) {
        world.mines.splice(i, 1);
      }
    }

    // Pickups. Dashing widens the reach a little: a dash through a cluster
    // sweeps it up, which makes the dash a scoring tool as well as an escape.
    for (let i = world.shards.length - 1; i >= 0; i -= 1) {
      const shard = world.shards[i];
      const dx = shard.x - p.x;
      const dy = shard.y - p.y;
      const reach = p.radius + shard.radius + 4 + (p.dashLeft > 0 ? 8 : 0);
      if (dx * dx + dy * dy < reach * reach) {
        collectShard(i);
        events.push({ type: 'pickup', multiplier: world.multiplier, score: world.score });
      }
    }

    // Hits, only when the player is not protected.
    if (p.invuln <= 0) {
      for (let i = world.mines.length - 1; i >= 0; i -= 1) {
        const mine = world.mines[i];
        const dx = mine.x - p.x;
        const dy = mine.y - p.y;
        const reach = p.radius + mine.radius * 0.85;
        if (dx * dx + dy * dy < reach * reach) {
          const livesLeft = hitMine(i);
          events.push({ type: 'hit', lives: livesLeft });
          if (livesLeft <= 0) {
            world.status = 'over';
            events.push({ type: 'lose' });
            return events;
          }
          break;
        }
      }
    }

    // The score target wins the game at once.
    if (world.score >= SCORE_TARGET) {
      world.status = 'win';
      world.wonBy = `reached ${SCORE_TARGET} lumen`;
      events.push({ type: 'win' });
      return events;
    }

    // Particles and ambient dust.
    for (let i = world.particles.length - 1; i >= 0; i -= 1) {
      const particle = world.particles[i];
      particle.life += dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.exp(-2 * dt);
      particle.vy *= Math.exp(-2 * dt);
      if (particle.life >= particle.maxLife) world.particles.splice(i, 1);
    }
    for (const mote of world.motes) {
      mote.y -= mote.speed * dt;
      mote.phase += dt;
      if (mote.y < -4) {
        mote.y = VIEW.height + 4;
        mote.x = rng() * VIEW.width;
      }
    }

    return events;
  }

  // Screenshot presets: put the field into a readable mid-game, win or
  // game-over pose. The game itself never calls this; main.js reads the
  // page's ?shot= parameter and applies it once at load.
  function applyPreset(kind) {
    reset(1337);
    if (kind === 'play') {
      world.score = 240;
      world.chain = 8;
      world.multiplier = 3;
      world.comboTimer = COMBO.window;
      world.wave = 3;
      world.player.x = VIEW.width * 0.42;
      world.player.y = VIEW.height * 0.55;
      for (let i = 0; i < 7; i += 1) spawnShard();
      for (let i = 0; i < 4; i += 1) spawnMine();
      world.status = 'playing';
    } else if (kind === 'win') {
      world.score = SCORE_TARGET;
      world.status = 'win';
      world.wonBy = `reached ${SCORE_TARGET} lumen`;
    } else if (kind === 'end') {
      world.score = 315;
      world.player.lives = 0;
      world.status = 'over';
    }
  }

  return { world, reset, update, applyPreset };
}
