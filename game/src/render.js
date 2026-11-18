// LUMEN DRIFT v2 — everything the player sees.
// The renderer draws the field, the entities, the HUD and every screen from
// the world's state. It never changes the world; it only reads it.
//
// v2's look: a three-layer parallax starfield over slow nebula blobs, four
// enemy kinds with their own silhouettes, power-ups with readable icons, and
// a solid panel behind the footer hints — in v1 a mine could drift over the
// "M MUTE" text, which that panel now makes impossible.

import { VIEW, COLORS, SCORE_TARGET, PLAYER } from './config.js';

export function createRenderer(canvas) {
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;
  const ctx = canvas.getContext('2d');

  function panel(x, y, width, height, radius, fill) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function text(string, x, y, size, color, align = 'center', weight = 'bold') {
    ctx.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(string, x, y);
  }

  function drawBackground(world) {
    const gradient = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    gradient.addColorStop(0, COLORS.backgroundEdge);
    gradient.addColorStop(0.5, COLORS.background);
    gradient.addColorStop(1, '#050718');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    // Slow nebula blobs for depth.
    for (const nebula of world.nebulas) {
      const wobbleX = Math.sin(world.time * 0.05 + nebula.drift) * 8;
      const wobbleY = Math.cos(world.time * 0.04 + nebula.drift) * 6;
      const glow = ctx.createRadialGradient(
        nebula.x + wobbleX, nebula.y + wobbleY, 10,
        nebula.x + wobbleX, nebula.y + wobbleY, nebula.radius,
      );
      glow.addColorStop(0, nebula.color);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(nebula.x - nebula.radius, nebula.y - nebula.radius, nebula.radius * 2, nebula.radius * 2);
    }

    // Parallax starfield: far stars are dim and slow, near stars bright
    // and quick, each twinkling on its own phase.
    const layers = [
      { stars: world.stars.far, color: '#5f7fc9' },
      { stars: world.stars.mid, color: '#9fd8ff' },
      { stars: world.stars.near, color: '#e6f4ff' },
    ];
    for (const layer of layers) {
      for (const star of layer.stars) {
        const twinkle = 0.35 + 0.3 * Math.sin(star.phase * 2);
        ctx.globalAlpha = twinkle;
        ctx.fillStyle = layer.color;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= VIEW.width; x += 48) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, VIEW.height);
    }
    for (let y = 0; y <= VIEW.height; y += 48) {
      ctx.moveTo(0, y);
      ctx.lineTo(VIEW.width, y);
    }
    ctx.stroke();

    for (const mote of world.motes) {
      const glow = 0.25 + 0.2 * Math.sin(mote.phase * 2);
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#9fd8ff';
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawShard(shard) {
    const pulse = 0.75 + 0.25 * Math.sin(shard.twinkle);
    const fade = shard.age > shard.lifetime - 2
      ? Math.max(0, (shard.lifetime - shard.age) / 2)
      : 1;
    ctx.save();
    ctx.globalAlpha = pulse * fade;
    ctx.shadowColor = COLORS.shard;
    ctx.shadowBlur = 14;
    ctx.fillStyle = COLORS.shard;
    ctx.beginPath();
    ctx.moveTo(shard.x, shard.y - shard.radius - 2);
    ctx.lineTo(shard.x + shard.radius, shard.y);
    ctx.lineTo(shard.x, shard.y + shard.radius + 2);
    ctx.lineTo(shard.x - shard.radius, shard.y);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.shardCore;
    ctx.beginPath();
    ctx.arc(shard.x, shard.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawMine(mine) {
    ctx.save();
    ctx.translate(mine.x, mine.y);
    ctx.rotate(mine.angle);
    ctx.fillStyle = COLORS.mine;
    ctx.strokeStyle = COLORS.mineRim;
    ctx.lineWidth = 2;
    ctx.shadowColor = COLORS.mineRim;
    ctx.shadowBlur = 10;
    // Eight spikes around a dark core.
    ctx.beginPath();
    const spikes = 8;
    for (let i = 0; i < spikes; i += 1) {
      const a = (i / spikes) * Math.PI * 2;
      const tip = mine.radius + 7;
      const base = mine.radius - 2;
      const a2 = a + (Math.PI / spikes) * 0.6;
      ctx.moveTo(Math.cos(a) * base, Math.sin(a) * base);
      ctx.lineTo(Math.cos(a) * tip, Math.sin(a) * tip);
      ctx.lineTo(Math.cos(a2) * base, Math.sin(a2) * base);
    }
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, mine.radius - 2, 0, Math.PI * 2);
    ctx.fillStyle = '#241243';
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.mineRim;
    ctx.fill();
    ctx.restore();
  }

  // A chaser drone: a sharp dart that points where it is heading, its eye
  // pulsing faster the closer it gets to its prey.
  function drawChaser(chaser) {
    ctx.save();
    ctx.translate(chaser.x, chaser.y);
    ctx.rotate(chaser.angle);
    ctx.shadowColor = COLORS.chaser;
    ctx.shadowBlur = 12;
    ctx.fillStyle = COLORS.chaser;
    ctx.beginPath();
    ctx.moveTo(chaser.radius + 6, 0);
    ctx.lineTo(-chaser.radius, -chaser.radius * 0.8);
    ctx.lineTo(-chaser.radius * 0.4, 0);
    ctx.lineTo(-chaser.radius, chaser.radius * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    const eye = 0.5 + 0.5 * Math.sin(chaser.pulse);
    ctx.fillStyle = COLORS.chaserCore;
    ctx.beginPath();
    ctx.arc(2, 0, 2.5 + eye * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // A spinner: a big spiked ring rolling across the field.
  function drawSpinner(spinner) {
    ctx.save();
    ctx.translate(spinner.x, spinner.y);
    ctx.rotate(spinner.angle);
    ctx.strokeStyle = COLORS.spinnerCore;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = COLORS.spinner;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    const spikes = 12;
    for (let i = 0; i < spikes; i += 1) {
      const a = (i / spikes) * Math.PI * 2;
      ctx.moveTo(Math.cos(a) * (spinner.radius - 4), Math.sin(a) * (spinner.radius - 4));
      ctx.lineTo(Math.cos(a) * (spinner.radius + 8), Math.sin(a) * (spinner.radius + 8));
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, spinner.radius - 4, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.spinner;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.spinnerCore;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // A splitter: a fat purple mine with a bright split core. It flashes in
  // its last second and a half, warning that it is about to burst.
  function drawSplitter(splitter) {
    const aboutToSplit = splitter.age > 4.5;
    const flash = aboutToSplit ? 0.6 + 0.4 * Math.sin(splitter.age * 14) : 1;
    ctx.save();
    ctx.globalAlpha = flash;
    ctx.translate(splitter.x, splitter.y);
    ctx.rotate(splitter.angle);
    ctx.fillStyle = '#2d1b4e';
    ctx.strokeStyle = COLORS.splitterCore;
    ctx.lineWidth = 2;
    ctx.shadowColor = COLORS.splitter;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    const spikes = 8;
    for (let i = 0; i < spikes; i += 1) {
      const a = (i / spikes) * Math.PI * 2;
      const tip = splitter.radius + 6;
      const base = splitter.radius - 2;
      const a2 = a + (Math.PI / spikes) * 0.6;
      ctx.moveTo(Math.cos(a) * base, Math.sin(a) * base);
      ctx.lineTo(Math.cos(a) * tip, Math.sin(a) * tip);
      ctx.lineTo(Math.cos(a2) * base, Math.sin(a2) * base);
    }
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, splitter.radius - 2, 0, Math.PI * 2);
    ctx.fillStyle = '#3d2066';
    ctx.fill();
    ctx.stroke();
    // The crack down the middle: this one is going to come apart.
    ctx.beginPath();
    ctx.moveTo(-6, -8);
    ctx.lineTo(-2, -2);
    ctx.lineTo(-5, 3);
    ctx.lineTo(1, 8);
    ctx.strokeStyle = COLORS.splitterCore;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.splitterCore;
    ctx.fill();
    ctx.restore();
  }

  function drawMini(mini) {
    ctx.save();
    ctx.translate(mini.x, mini.y);
    ctx.rotate(mini.angle);
    ctx.fillStyle = '#2a0e2e';
    ctx.strokeStyle = COLORS.mini;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = COLORS.mini;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    const spikes = 6;
    for (let i = 0; i < spikes; i += 1) {
      const a = (i / spikes) * Math.PI * 2;
      const tip = mini.radius + 5;
      const base = mini.radius - 2;
      const a2 = a + (Math.PI / spikes) * 0.6;
      ctx.moveTo(Math.cos(a) * base, Math.sin(a) * base);
      ctx.lineTo(Math.cos(a) * tip, Math.sin(a) * tip);
      ctx.lineTo(Math.cos(a2) * base, Math.sin(a2) * base);
    }
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, mini.radius - 2, 0, Math.PI * 2);
    ctx.fillStyle = '#3d1226';
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawPowerupIcon(powerup, x, y) {
    const color = COLORS[powerup.kind === 'slowmo' ? 'slowmo' : powerup.kind === 'life' ? 'extralife' : powerup.kind];
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    if (powerup.kind === 'shield') {
      // A little shield outline.
      ctx.beginPath();
      ctx.moveTo(x, y - 6);
      ctx.lineTo(x + 5, y - 4);
      ctx.lineTo(x + 5, y + 1);
      ctx.quadraticCurveTo(x + 5, y + 5, x, y + 7);
      ctx.quadraticCurveTo(x - 5, y + 5, x - 5, y + 1);
      ctx.lineTo(x - 5, y - 4);
      ctx.closePath();
      ctx.stroke();
    } else if (powerup.kind === 'magnet') {
      // A horseshoe magnet.
      ctx.beginPath();
      ctx.arc(x, y - 1, 5, Math.PI, 0);
      ctx.moveTo(x - 5, y - 1);
      ctx.lineTo(x - 5, y + 4);
      ctx.moveTo(x + 5, y - 1);
      ctx.lineTo(x + 5, y + 4);
      ctx.stroke();
    } else if (powerup.kind === 'slowmo') {
      // A clock face with two hands.
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 4);
      ctx.moveTo(x, y);
      ctx.lineTo(x + 3, y + 1);
      ctx.stroke();
    } else {
      // A heart.
      ctx.beginPath();
      ctx.moveTo(x, y + 5);
      ctx.bezierCurveTo(x - 7, y - 1, x - 4, y - 6, x, y - 2);
      ctx.bezierCurveTo(x + 4, y - 6, x + 7, y - 1, x, y + 5);
      ctx.fill();
    }
  }

  function drawPowerup(powerup) {
    const bob = Math.sin(powerup.age * 3) * 3;
    const y = powerup.y + bob;
    const fade = powerup.age > powerup.lifetime - 3
      ? (Math.floor(powerup.age * 6) % 2 === 0 ? 1 : 0.35)
      : 1;
    const color = COLORS[powerup.kind === 'slowmo' ? 'slowmo' : powerup.kind === 'life' ? 'extralife' : powerup.kind];
    const label = powerup.kind === 'slowmo' ? 'SLOW-MO' : powerup.kind.toUpperCase();
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(powerup.x, y, powerup.radius + 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(7, 11, 36, 0.85)';
    ctx.beginPath();
    ctx.arc(powerup.x, y, powerup.radius + 3, 0, Math.PI * 2);
    ctx.fill();
    drawPowerupIcon(powerup, powerup.x, y);
    text(label, powerup.x, y + powerup.radius + 12, 10, color);
    ctx.restore();
  }

  function drawPlayer(world) {
    const p = world.player;
    if (p.invuln > 0 && Math.floor(world.time * 12) % 2 === 0) return;
    const dashing = p.dashLeft > 0;
    ctx.save();
    ctx.shadowColor = COLORS.player;
    ctx.shadowBlur = dashing ? 30 : 18;
    const gradient = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.radius + 6);
    gradient.addColorStop(0, COLORS.playerCore);
    gradient.addColorStop(0.55, COLORS.player);
    gradient.addColorStop(1, 'rgba(94, 242, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.playerCore;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
    // The shield ring: a bright shell around the orb while it lasts.
    if (world.shieldTimer > 0) {
      ctx.strokeStyle = COLORS.shield;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = COLORS.shield;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 11, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawParticles(world) {
    for (const particle of world.particles) {
      const left = 1 - particle.life / particle.maxLife;
      ctx.globalAlpha = Math.max(0, left);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * left + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFloaters(world) {
    for (const floater of world.floaters) {
      const left = 1 - floater.life / floater.maxLife;
      ctx.globalAlpha = Math.max(0, left);
      text(floater.text, floater.x, floater.y, floater.size, floater.color);
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(world) {
    // Score, top left.
    text(`SCORE ${world.score}`, 24, 30, 24, COLORS.text, 'left');
    if (world.multiplier > 1) {
      text(`COMBO x${world.multiplier}`, 24, 58, 18, COLORS.shard, 'left');
      // The shrinking bar shows how long the combo chain has left.
      const barWidth = 90;
      const fill = Math.max(0, world.comboTimer / 2.5);
      ctx.fillStyle = 'rgba(142, 162, 200, 0.25)';
      panel(24, 68, barWidth, 5, 2, 'rgba(142, 162, 200, 0.25)');
      ctx.fillStyle = COLORS.shard;
      panel(24, 68, barWidth * fill, 5, 2, COLORS.shard);
    } else if (world.chain > 0) {
      text(`CHAIN ${world.chain}`, 24, 58, 16, COLORS.dimText, 'left');
    }
    // Active power-up chips, under the score.
    const chips = [];
    if (world.shieldTimer > 0) chips.push({ label: `SHIELD ${Math.ceil(world.shieldTimer)}s`, color: COLORS.shield });
    if (world.magnetTimer > 0) chips.push({ label: `MAGNET ${Math.ceil(world.magnetTimer)}s`, color: COLORS.magnet });
    if (world.slowTimer > 0) chips.push({ label: `SLOW-MO ${Math.ceil(world.slowTimer)}s`, color: COLORS.slowmo });
    let chipX = 24;
    for (const chip of chips) {
      const width = 12 + chip.label.length * 7.5;
      panel(chipX, 84, width, 20, 10, 'rgba(4, 7, 24, 0.7)');
      ctx.fillStyle = chip.color;
      ctx.beginPath();
      ctx.arc(chipX + 11, 94, 4, 0, Math.PI * 2);
      ctx.fill();
      text(chip.label, chipX + 20, 94, 12, chip.color, 'left');
      chipX += width + 8;
    }
    // Wave, top centre.
    text(`WAVE ${Math.min(world.wave, 10)} / 10`, VIEW.width / 2, 30, 20, COLORS.dimText);
    // Lives, top right — one heart per life, up to the v2 maximum of four.
    for (let i = 0; i < PLAYER.maxLives; i += 1) {
      const x = VIEW.width - 30 - i * 30;
      ctx.beginPath();
      ctx.arc(x, 30, 9, 0, Math.PI * 2);
      if (i < world.player.lives) {
        ctx.fillStyle = COLORS.player;
        ctx.shadowColor = COLORS.player;
        ctx.shadowBlur = 8;
      } else {
        ctx.fillStyle = 'rgba(142, 162, 200, 0.25)';
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    // Progress to the score target, under the top edge.
    const barWidth = 320;
    const barX = (VIEW.width - barWidth) / 2;
    const barY = 52;
    const fill = Math.min(1, world.score / SCORE_TARGET);
    ctx.fillStyle = 'rgba(142, 162, 200, 0.25)';
    panel(barX, barY, barWidth, 8, 4, 'rgba(142, 162, 200, 0.25)');
    ctx.fillStyle = COLORS.shard;
    panel(barX, barY, barWidth * fill, 8, 4, COLORS.shard);
    text(`${world.score} / ${SCORE_TARGET} LUMEN`, VIEW.width / 2, 74, 13, COLORS.dimText);
    // Dash cooldown, bottom left. The footer sits on a solid panel now, so
    // no enemy can ever drift over the hints again (v1's screenshot wart).
    panel(16, VIEW.height - 36, VIEW.width - 32, 28, 8, 'rgba(4, 7, 24, 0.85)');
    const cooldown = Math.max(0, world.player.dashCooldown);
    const ready = cooldown <= 0;
    text(ready ? 'DASH READY  [SPACE / CLICK]' : `DASH ${cooldown.toFixed(1)}s`, 24, VIEW.height - 22, 14, ready ? COLORS.good : COLORS.dimText, 'left');
    text('P PAUSE   ·   R RESTART   ·   M MUTE', VIEW.width - 24, VIEW.height - 22, 13, COLORS.dimText, 'right');
    // Wave banner.
    if (world.banner > 0) {
      ctx.globalAlpha = Math.min(1, world.banner);
      text(world.bannerText, VIEW.width / 2, VIEW.height / 2 - 120, 44, COLORS.shard);
      ctx.globalAlpha = 1;
    }
  }

  function drawTitle(world, best) {
    ctx.fillStyle = 'rgba(4, 7, 24, 0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    text('LUMEN DRIFT', VIEW.width / 2, 120, 64, COLORS.player);
    text('Pilot the last light through the dark.', VIEW.width / 2, 172, 20, COLORS.text);
    text('Collect lumen shards to score. Dodge the void mines.', VIEW.width / 2, 200, 18, COLORS.dimText);
    text('Chain pickups for a combo multiplier. Dash through danger.', VIEW.width / 2, 224, 18, COLORS.dimText);
    text(`Reach ${SCORE_TARGET} lumen or clear wave 10 to win. You have 3 lives.`, VIEW.width / 2, 248, 18, COLORS.dimText);
    text('NEW IN v2 — chasers, spinners and splitters hunt you now.', VIEW.width / 2, 282, 17, COLORS.shard);
    text('SHIELD eats one hit  ·  MAGNET pulls shards in', VIEW.width / 2, 308, 16, COLORS.shield);
    text('SLOW-MO halves every enemy  ·  +1 LIFE tops you up', VIEW.width / 2, 330, 16, COLORS.slowmo);
    text('MOVE  mouse or WASD / arrows      DASH  Space or click', VIEW.width / 2, 372, 17, COLORS.shard);
    text('PAUSE  P      RESTART  R      MUTE  M', VIEW.width / 2, 398, 17, COLORS.shard);
    const blink = 0.6 + 0.4 * Math.sin(world.time * 3);
    ctx.globalAlpha = blink;
    text('CLICK OR PRESS ANY KEY TO START', VIEW.width / 2, 446, 22, COLORS.good);
    ctx.globalAlpha = 1;
    if (best > 0) text(`BEST SCORE  ${best}`, VIEW.width / 2, 484, 16, COLORS.dimText);
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(4, 7, 24, 0.66)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    text('PAUSED', VIEW.width / 2, VIEW.height / 2 - 20, 48, COLORS.text);
    text('Press P to keep drifting', VIEW.width / 2, VIEW.height / 2 + 30, 18, COLORS.dimText);
  }

  function drawEnd(world, best, won) {
    ctx.fillStyle = won ? 'rgba(4, 24, 12, 0.72)' : 'rgba(24, 4, 12, 0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    text(won ? 'YOU WIN' : 'GAME OVER', VIEW.width / 2, 150, 58, won ? COLORS.good : COLORS.danger);
    if (won) text(world.wonBy, VIEW.width / 2, 205, 20, COLORS.text);
    text(`FINAL SCORE  ${world.score}`, VIEW.width / 2, 255, 28, COLORS.shard);
    text(`WAVE REACHED  ${Math.min(world.wave, 10)}  ·  BEST  ${best}`, VIEW.width / 2, 295, 18, COLORS.dimText);
    const blink = 0.6 + 0.4 * Math.sin(world.time * 3);
    ctx.globalAlpha = blink;
    text('PRESS R OR CLICK TO PLAY AGAIN', VIEW.width / 2, 370, 22, COLORS.good);
    ctx.globalAlpha = 1;
  }

  return {
    draw(world, best) {
      ctx.save();
      if (world.shake > 0) {
        ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
      }
      drawBackground(world);
      if (world.status !== 'title') {
        for (const shard of world.shards) drawShard(shard);
        for (const powerup of world.powerups) drawPowerup(powerup);
        for (const enemy of world.enemies) {
          if (enemy.kind === 'mine') drawMine(enemy);
          else if (enemy.kind === 'chaser') drawChaser(enemy);
          else if (enemy.kind === 'spinner') drawSpinner(enemy);
          else if (enemy.kind === 'splitter') drawSplitter(enemy);
          else drawMini(enemy);
        }
        drawParticles(world);
        drawFloaters(world);
        if (world.player.lives > 0) drawPlayer(world);
        drawHud(world);
      }
      ctx.restore();
      if (world.status === 'title') drawTitle(world, best);
      if (world.status === 'paused') drawPaused();
      if (world.status === 'win') drawEnd(world, best, true);
      if (world.status === 'over') drawEnd(world, best, false);
    },
  };
}
