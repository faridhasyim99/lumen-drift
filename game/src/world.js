// LUMEN DRIFT v2 — the world: player, shards, enemies, power-ups, waves.
// This file owns every rule of the game itself: movement, spawning, the
// combo chain, collisions and the win/lose conditions. It knows nothing about
// the canvas or the DOM; it returns events and main.js turns them into sound
// and screen changes.
//
// v2's field is a different beast from v1's: four enemy kinds that unlock
// wave by wave, power-ups that change the run, a wave-clear bonus, floating
// score popups and a hit-stop freeze when the player takes a hit.

import {
  VIEW, COLORS, PLAYER, SHARD, MINE, CHASER, SPINNER, SPLITTER, MINI,
  POWERUP, COMBO, WAVES, SCORE_TARGET, PARTICLES, STARS, NEBULAE,
} from './config.js';
import { makeRng, range, pointAwayFrom, angle, weightedPick } from './random.js';

export function createWorld(seed) {
  let rng = makeRng(seed);

  const world = {
    player: null,
    shards: [],
    enemies: [],
    powerups: [],
    particles: [],
    floaters: [],
    motes: [],
    stars: { far: [], mid: [], near: [] },
    nebulas: [],
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
    chaserTimer: 2.5,
    spinnerTimer: 4,
    splitterTimer: 6,
    powerupTimer: POWERUP.firstAt,
    shieldTimer: 0,
    magnetTimer: 0,
    slowTimer: 0,
    shake: 0,
    hitStop: 0,
    time: 0,
    status: 'title', // title | playing | paused | win | over
    wonBy: '',
  };

  function makeStars() {
    world.stars = { far: [], mid: [], near: [] };
    for (let i = 0; i < STARS.far; i += 1) {
      world.stars.far.push({ x: rng() * VIEW.width, y: rng() * VIEW.height, size: range(rng, 0.6, 1.3), phase: rng() * Math.PI * 2 });
    }
    for (let i = 0; i < STARS.mid; i += 1) {
      world.stars.mid.push({ x: rng() * VIEW.width, y: rng() * VIEW.height, size: range(rng, 1.0, 1.9), phase: rng() * Math.PI * 2 });
    }
    for (let i = 0; i < STARS.near; i += 1) {
      world.stars.near.push({ x: rng() * VIEW.width, y: rng() * VIEW.height, size: range(rng, 1.6, 2.6), phase: rng() * Math.PI * 2 });
    }
    world.nebulas = NEBULAE.map((nebula) => ({
      x: nebula.x * VIEW.width,
      y: nebula.y * VIEW.height,
      radius: nebula.radius,
      color: nebula.color,
      drift: rng() * Math.PI * 2,
    }));
  }

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
    world.enemies = [];
    world.powerups = [];
    world.particles = [];
    world.floaters = [];
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
    makeStars();
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
    world.chaserTimer = 2.5;
    world.spinnerTimer = 4;
    world.splitterTimer = 6;
    world.powerupTimer = POWERUP.firstAt;
    world.shieldTimer = 0;
    world.magnetTimer = 0;
    world.slowTimer = 0;
    world.shake = 0;
    world.hitStop = 0;
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

  // Every enemy enters from an edge, aimed roughly at the player.
  function edgeSpawn() {
    const edge = Math.floor(rng() * 4);
    if (edge === 0) return { x: range(rng, 40, VIEW.width - 40), y: -24 };
    if (edge === 1) return { x: range(rng, 40, VIEW.width - 40), y: VIEW.height + 24 };
    if (edge === 2) return { x: -24, y: range(rng, 40, VIEW.height - 40) };
    return { x: VIEW.width + 24, y: range(rng, 40, VIEW.height - 40) };
  }

  function countKind(kind) {
    let count = 0;
    for (const enemy of world.enemies) if (enemy.kind === kind) count += 1;
    return count;
  }

  function spawnMine() {
    const cap = Math.min(MINE.maxOnFieldCap, MINE.maxOnField + world.wave - 1);
    if (countKind('mine') >= cap) return;
    const at = edgeSpawn();
    const toward = Math.atan2(world.player.y - at.y, world.player.x - at.x);
    const speed = range(rng, MINE.speedMin, MINE.speedMax + world.wave * 6);
    world.enemies.push({
      kind: 'mine',
      x: at.x, y: at.y,
      vx: Math.cos(toward) * speed,
      vy: Math.sin(toward) * speed,
      radius: range(rng, MINE.radiusMin, MINE.radiusMax),
      spin: range(rng, -1.6, 1.6),
      angle: rng() * Math.PI * 2,
      wobble: rng() * Math.PI * 2,
      age: 0,
    });
  }

  function spawnChaser() {
    if (world.wave < CHASER.unlockWave) return;
    const cap = Math.min(CHASER.maxOnFieldCap, CHASER.maxOnField + Math.floor(world.wave / 2));
    if (countKind('chaser') >= cap) return;
    const at = edgeSpawn();
    const toward = Math.atan2(world.player.y - at.y, world.player.x - at.x);
    world.enemies.push({
      kind: 'chaser',
      x: at.x, y: at.y,
      heading: toward,
      speed: range(rng, CHASER.speedMin, CHASER.speedMax + world.wave * CHASER.speedPerWave),
      radius: CHASER.radius,
      angle: toward,
      age: 0,
      pulse: rng() * Math.PI * 2,
    });
  }

  function spawnSpinner() {
    if (world.wave < SPINNER.unlockWave) return;
    const cap = Math.min(SPINNER.maxOnFieldCap, SPINNER.maxOnField + Math.floor(world.wave / 3));
    if (countKind('spinner') >= cap) return;
    const at = edgeSpawn();
    const toward = Math.atan2(world.player.y - at.y, world.player.x - at.x);
    const speed = range(rng, SPINNER.speedMin, SPINNER.speedMax);
    world.enemies.push({
      kind: 'spinner',
      x: at.x, y: at.y,
      vx: Math.cos(toward) * speed,
      vy: Math.sin(toward) * speed,
      radius: SPINNER.radius,
      angle: rng() * Math.PI * 2,
      age: 0,
    });
  }

  function spawnSplitter() {
    if (world.wave < SPLITTER.unlockWave) return;
    if (countKind('splitter') >= SPLITTER.maxOnFieldCap) return;
    const at = edgeSpawn();
    const toward = Math.atan2(world.player.y - at.y, world.player.x - at.x);
    const speed = range(rng, SPLITTER.speedMin, SPLITTER.speedMax);
    world.enemies.push({
      kind: 'splitter',
      x: at.x, y: at.y,
      vx: Math.cos(toward) * speed,
      vy: Math.sin(toward) * speed,
      radius: SPLITTER.radius,
      spin: range(rng, -1.2, 1.2),
      angle: rng() * Math.PI * 2,
      wobble: rng() * Math.PI * 2,
      age: 0,
    });
  }

  function spawnMini(x, y, heading) {
    world.enemies.push({
      kind: 'mini',
      x, y,
      vx: Math.cos(heading) * MINI.speed,
      vy: Math.sin(heading) * MINI.speed,
      radius: MINI.radius,
      spin: range(rng, -3, 3),
      angle: rng() * Math.PI * 2,
      wobble: rng() * Math.PI * 2,
      age: 0,
    });
  }

  function spawnPowerup() {
    if (world.powerups.length > 0) return;
    let kind = weightedPick(rng, POWERUP.weights);
    // An extra life is only offered while the player is hurt.
    if (kind === 'life' && world.player.lives >= PLAYER.maxLives) kind = 'shield';
    const point = pointAwayFrom(
      rng, world.player.x, world.player.y, 140, VIEW.width, VIEW.height, 40,
    );
    const drift = angle(rng);
    world.powerups.push({
      kind,
      x: point.x,
      y: point.y,
      vx: Math.cos(drift) * 12,
      vy: Math.sin(drift) * 12,
      radius: POWERUP.radius,
      age: 0,
      lifetime: POWERUP.lifetime,
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

  function addFloater(x, y, text, color, size = 16) {
    world.floaters.push({ x, y, text, color, life: 0, maxLife: 0.9, size });
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
    addFloater(shard.x, shard.y - 10, `+${gained}`, COLORS.shard, 15);
    return gained;
  }

  function applyPowerup(index) {
    const powerup = world.powerups[index];
    world.powerups.splice(index, 1);
    const color = COLORS[powerup.kind === 'slowmo' ? 'slowmo' : powerup.kind === 'life' ? 'extralife' : powerup.kind];
    burst(powerup.x, powerup.y, PARTICLES.powerupBurst, color, 170);
    if (powerup.kind === 'shield') {
      world.shieldTimer = POWERUP.shieldSeconds;
      addFloater(powerup.x, powerup.y - 12, 'SHIELD!', COLORS.shield, 18);
    } else if (powerup.kind === 'magnet') {
      world.magnetTimer = POWERUP.magnetSeconds;
      addFloater(powerup.x, powerup.y - 12, 'MAGNET!', COLORS.magnet, 18);
    } else if (powerup.kind === 'slowmo') {
      world.slowTimer = POWERUP.slowSeconds;
      addFloater(powerup.x, powerup.y - 12, 'SLOW-MO!', COLORS.slowmo, 18);
    } else if (powerup.kind === 'life') {
      world.player.lives = Math.min(PLAYER.maxLives, world.player.lives + 1);
      addFloater(powerup.x, powerup.y - 12, '+1 LIFE', COLORS.extralife, 18);
    }
    return powerup.kind;
  }

  // A hit while the shield is up eats the shield instead of a life.
  function absorbHit(index) {
    const enemy = world.enemies[index];
    world.enemies.splice(index, 1);
    world.shieldTimer = 0;
    world.player.invuln = 0.8;
    world.shake = 8;
    burst(enemy.x, enemy.y, PARTICLES.hitBurst, COLORS.shield, 220);
    addFloater(world.player.x, world.player.y - 22, 'SHIELD DOWN', COLORS.shield, 16);
    return true;
  }

  function hitEnemy(index) {
    const enemy = world.enemies[index];
    world.enemies.splice(index, 1);
    const p = world.player;
    p.lives -= 1;
    p.invuln = PLAYER.hitInvuln;
    world.chain = 0;
    world.comboTimer = 0;
    world.multiplier = 1;
    world.shake = 14;
    world.hitStop = 0.07; // a beat of frozen time sells the impact
    burst(enemy.x, enemy.y, PARTICLES.hitBurst, COLORS.mineRim, 240);
    burst(p.x, p.y, 10, COLORS.player, 160);
    return p.lives;
  }

  function splitEnemy(index) {
    const enemy = world.enemies[index];
    world.enemies.splice(index, 1);
    const base = Math.atan2(world.player.y - enemy.y, world.player.x - enemy.x);
    spawnMini(enemy.x, enemy.y, base - 0.6);
    spawnMini(enemy.x, enemy.y, base + 0.6);
    burst(enemy.x, enemy.y, PARTICLES.splitBurst, COLORS.splitterCore, 200);
    addFloater(enemy.x, enemy.y - 14, 'SPLIT!', COLORS.splitterCore, 15);
  }

  function update(dt, input) {
    const events = [];
    // Hit-stop: freeze the world for a beat after a hit lands.
    if (world.hitStop > 0) {
      world.hitStop -= dt;
      return events;
    }
    world.time += dt;
    const p = world.player;
    // Slow-mo halves every enemy's clock, never the player's.
    const timeScale = world.slowTimer > 0 ? POWERUP.slowFactor : 1;
    const edt = dt * timeScale;

    // Timers.
    if (p.invuln > 0) p.invuln -= dt;
    if (p.dashCooldown > 0) p.dashCooldown -= dt;
    if (world.shieldTimer > 0) world.shieldTimer -= dt;
    if (world.magnetTimer > 0) world.magnetTimer -= dt;
    if (world.slowTimer > 0) world.slowTimer -= dt;
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
    // Clearing a wave pays a bonus on top of the pickups.
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
      world.score += WAVES.clearBonus;
      addFloater(VIEW.width / 2, 150, `WAVE CLEAR +${WAVES.clearBonus}`, COLORS.good, 20);
      world.banner = WAVES.bannerTime;
      world.bannerText = world.wave === WAVES.count ? 'FINAL WAVE' : `WAVE ${world.wave}`;
      events.push({ type: 'wave', wave: world.wave });
    }

    // Spawning. Each enemy kind has its own timer and cap, so the mix
    // changes as the waves climb: mines first, chasers at wave 2, spinners
    // at wave 3, splitters at wave 4.
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
    world.chaserTimer -= dt;
    if (world.chaserTimer <= 0) {
      world.chaserTimer = Math.max(
        CHASER.spawnIntervalMin,
        CHASER.spawnInterval - world.wave * 0.2,
      );
      spawnChaser();
    }
    world.spinnerTimer -= dt;
    if (world.spinnerTimer <= 0) {
      world.spinnerTimer = Math.max(
        SPINNER.spawnIntervalMin,
        SPINNER.spawnInterval - world.wave * 0.2,
      );
      spawnSpinner();
    }
    world.splitterTimer -= dt;
    if (world.splitterTimer <= 0) {
      world.splitterTimer = Math.max(
        SPLITTER.spawnIntervalMin,
        SPLITTER.spawnInterval - world.wave * 0.2,
      );
      spawnSplitter();
    }
    world.powerupTimer -= dt;
    if (world.powerupTimer <= 0) {
      world.powerupTimer = POWERUP.spawnInterval;
      spawnPowerup();
    }

    // Shards drift, twinkle and fade. A magnet drags nearby shards in.
    for (let i = world.shards.length - 1; i >= 0; i -= 1) {
      const shard = world.shards[i];
      shard.age += dt;
      shard.twinkle += dt * 5;
      if (world.magnetTimer > 0) {
        const dx = p.x - shard.x;
        const dy = p.y - shard.y;
        const distance = Math.hypot(dx, dy);
        if (distance < POWERUP.magnetRadius && distance > 4) {
          shard.x += (dx / distance) * POWERUP.magnetPull * dt;
          shard.y += (dy / distance) * POWERUP.magnetPull * dt;
        }
      }
      shard.x += shard.vx * dt;
      shard.y += shard.vy * dt;
      if (shard.x < 8 || shard.x > VIEW.width - 8) shard.vx *= -1;
      if (shard.y < 8 || shard.y > VIEW.height - 8) shard.vy *= -1;
      if (shard.age >= shard.lifetime) world.shards.splice(i, 1);
    }

    // Enemies, each moving by its own rules on the slowed clock.
    for (let i = world.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = world.enemies[i];
      enemy.age += edt;
      if (enemy.kind === 'mine' || enemy.kind === 'splitter') {
        enemy.angle += enemy.spin * edt;
        enemy.wobble += edt * MINE.wobble;
        const steer = Math.sin(enemy.wobble) * 26;
        const perpendicular = Math.atan2(enemy.vy, enemy.vx) + Math.PI / 2;
        enemy.x += (enemy.vx + Math.cos(perpendicular) * steer) * edt;
        enemy.y += (enemy.vy + Math.sin(perpendicular) * steer) * edt;
      } else if (enemy.kind === 'chaser') {
        // Steer toward the player, but only so fast: a sharp turn throws
        // it off, which is the dodge window.
        const desired = Math.atan2(p.y - enemy.y, p.x - enemy.x);
        let turn = desired - enemy.heading;
        while (turn > Math.PI) turn -= Math.PI * 2;
        while (turn < -Math.PI) turn += Math.PI * 2;
        const maxTurn = CHASER.turnRate * edt;
        enemy.heading += Math.max(-maxTurn, Math.min(maxTurn, turn));
        enemy.angle = enemy.heading;
        enemy.x += Math.cos(enemy.heading) * enemy.speed * edt;
        enemy.y += Math.sin(enemy.heading) * enemy.speed * edt;
        enemy.pulse += edt * 6;
      } else if (enemy.kind === 'spinner') {
        enemy.angle += SPINNER.spin * edt;
        enemy.x += enemy.vx * edt;
        enemy.y += enemy.vy * edt;
      } else if (enemy.kind === 'mini') {
        enemy.angle += enemy.spin * edt;
        enemy.wobble += edt * MINE.wobble;
        const steer = Math.sin(enemy.wobble) * 18;
        const perpendicular = Math.atan2(enemy.vy, enemy.vx) + Math.PI / 2;
        enemy.x += (enemy.vx + Math.cos(perpendicular) * steer) * edt;
        enemy.y += (enemy.vy + Math.sin(perpendicular) * steer) * edt;
        if (enemy.age >= MINI.lifetime) {
          world.enemies.splice(i, 1);
          continue;
        }
      }
      if (enemy.x < -48 || enemy.x > VIEW.width + 48 || enemy.y < -48 || enemy.y > VIEW.height + 48) {
        world.enemies.splice(i, 1);
        continue;
      }
      // A splitter that has been around too long bursts into two minis.
      if (enemy.kind === 'splitter' && enemy.age >= SPLITTER.splitAge) {
        splitEnemy(i);
        events.push({ type: 'split' });
      }
    }

    // Power-ups drift and expire.
    for (let i = world.powerups.length - 1; i >= 0; i -= 1) {
      const powerup = world.powerups[i];
      powerup.age += dt;
      powerup.x += powerup.vx * dt;
      powerup.y += powerup.vy * dt;
      if (powerup.x < 16 || powerup.x > VIEW.width - 16) powerup.vx *= -1;
      if (powerup.y < 16 || powerup.y > VIEW.height - 16) powerup.vy *= -1;
      if (powerup.age >= powerup.lifetime) world.powerups.splice(i, 1);
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
    for (let i = world.powerups.length - 1; i >= 0; i -= 1) {
      const powerup = world.powerups[i];
      const dx = powerup.x - p.x;
      const dy = powerup.y - p.y;
      const reach = p.radius + powerup.radius + 4;
      if (dx * dx + dy * dy < reach * reach) {
        const kind = applyPowerup(i);
        events.push({ type: 'powerup', kind });
      }
    }

    // Hits, only when the player is not protected. A shield eats the hit.
    if (p.invuln <= 0) {
      for (let i = world.enemies.length - 1; i >= 0; i -= 1) {
        const enemy = world.enemies[i];
        const dx = enemy.x - p.x;
        const dy = enemy.y - p.y;
        const reach = p.radius + enemy.radius * 0.85;
        if (dx * dx + dy * dy < reach * reach) {
          if (world.shieldTimer > 0) {
            absorbHit(i);
            events.push({ type: 'shieldBreak' });
          } else {
            const livesLeft = hitEnemy(i);
            events.push({ type: 'hit', lives: livesLeft });
            if (livesLeft <= 0) {
              world.status = 'over';
              events.push({ type: 'lose' });
              return events;
            }
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

    // Particles, floating score popups and ambient dust.
    for (let i = world.particles.length - 1; i >= 0; i -= 1) {
      const particle = world.particles[i];
      particle.life += dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.exp(-2 * dt);
      particle.vy *= Math.exp(-2 * dt);
      if (particle.life >= particle.maxLife) world.particles.splice(i, 1);
    }
    for (let i = world.floaters.length - 1; i >= 0; i -= 1) {
      const floater = world.floaters[i];
      floater.life += dt;
      floater.y -= 32 * dt;
      if (floater.life >= floater.maxLife) world.floaters.splice(i, 1);
    }
    for (const mote of world.motes) {
      mote.y -= mote.speed * dt;
      mote.phase += dt;
      if (mote.y < -4) {
        mote.y = VIEW.height + 4;
        mote.x = rng() * VIEW.width;
      }
    }
    for (const layer of [world.stars.far, world.stars.mid, world.stars.near]) {
      for (const star of layer) star.phase += dt;
    }
    const starSpeeds = [STARS.farSpeed, STARS.midSpeed, STARS.nearSpeed];
    const starLayers = [world.stars.far, world.stars.mid, world.stars.near];
    for (let layerIndex = 0; layerIndex < starLayers.length; layerIndex += 1) {
      for (const star of starLayers[layerIndex]) {
        star.y += starSpeeds[layerIndex] * dt;
        if (star.y > VIEW.height + 2) {
          star.y = -2;
          star.x = rng() * VIEW.width;
        }
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
      // A wave-4 surge: every enemy kind on the field, a magnet and a
      // shield running, a power-up waiting, and a x3 combo chain. The
      // score stays low on purpose: the magnet vacuums the shards in, and
      // the preset must still be playing (not won) when the shot is taken.
      world.score = 180;
      world.chain = 8;
      world.multiplier = 3;
      world.comboTimer = COMBO.window;
      world.wave = 4;
      world.waveTimer = 8;
      world.shieldTimer = 8;
      world.magnetTimer = 6;
      world.player.x = VIEW.width * 0.42;
      world.player.y = VIEW.height * 0.55;
      const shardSpots = [
        [300, 160], [350, 210], [470, 180], [520, 250],
        [300, 360], [560, 330], [420, 400], [640, 260],
      ];
      for (const [x, y] of shardSpots) {
        world.shards.push({
          x, y, vx: 10, vy: 6, radius: SHARD.radius,
          age: 0, lifetime: SHARD.lifetime, twinkle: 1,
        });
      }
      world.enemies = [
        { kind: 'mine', x: 700, y: 140, vx: -30, vy: 20, radius: 15, spin: 1, angle: 0.5, wobble: 0, age: 0 },
        { kind: 'mine', x: 830, y: 300, vx: -40, vy: -10, radius: 13, spin: -1, angle: 1.2, wobble: 0, age: 0 },
        { kind: 'chaser', x: 640, y: 380, heading: 2.6, speed: 120, radius: CHASER.radius, angle: 2.6, age: 0, pulse: 0 },
        { kind: 'chaser', x: 880, y: 170, heading: 2.9, speed: 120, radius: CHASER.radius, angle: 2.9, age: 0, pulse: 1 },
        { kind: 'spinner', x: 760, y: 430, vx: -35, vy: -8, radius: SPINNER.radius, angle: 0.4, age: 0 },
        { kind: 'splitter', x: 560, y: 140, vx: 25, vy: 30, radius: SPLITTER.radius, spin: 1, angle: 0.8, wobble: 0, age: 4 },
      ];
      world.powerups = [
        { kind: 'magnet', x: 300, y: 180, vx: 8, vy: 5, radius: POWERUP.radius, age: 1, lifetime: POWERUP.lifetime },
      ];
      addFloater(470, 250, '+40', COLORS.shard, 15);
      addFloater(300, 160, 'MAGNET!', COLORS.magnet, 17);
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
