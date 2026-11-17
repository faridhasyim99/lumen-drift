// LUMEN DRIFT — everything the player sees.
// The renderer draws the field, the entities, the HUD and every screen from
// the world's state. It never changes the world; it only reads it.

import { VIEW, COLORS, SCORE_TARGET } from './config.js';

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
    // Wave, top centre.
    text(`WAVE ${Math.min(world.wave, 10)} / 10`, VIEW.width / 2, 30, 20, COLORS.dimText);
    // Lives, top right.
    for (let i = 0; i < 3; i += 1) {
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
    // Dash cooldown, bottom left.
    const cooldown = Math.max(0, world.player.dashCooldown);
    const ready = cooldown <= 0;
    text(ready ? 'DASH READY  [SPACE / CLICK]' : `DASH ${cooldown.toFixed(1)}s`, 24, VIEW.height - 24, 14, ready ? COLORS.good : COLORS.dimText, 'left');
    text('P PAUSE   ·   R RESTART   ·   M MUTE', VIEW.width - 24, VIEW.height - 24, 13, COLORS.dimText, 'right');
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
    text('LUMEN DRIFT', VIEW.width / 2, 128, 64, COLORS.player);
    text('Pilot the last light through the dark.', VIEW.width / 2, 180, 20, COLORS.text);
    text('Collect lumen shards to score. Dodge the void mines.', VIEW.width / 2, 210, 18, COLORS.dimText);
    text('Chain pickups for a combo multiplier. Dash through danger.', VIEW.width / 2, 236, 18, COLORS.dimText);
    text(`Reach ${SCORE_TARGET} lumen or clear wave 10 to win. You have 3 lives.`, VIEW.width / 2, 262, 18, COLORS.dimText);
    text('MOVE  mouse or WASD / arrows      DASH  Space or click', VIEW.width / 2, 316, 17, COLORS.shard);
    text('PAUSE  P      RESTART  R      MUTE  M', VIEW.width / 2, 344, 17, COLORS.shard);
    const blink = 0.6 + 0.4 * Math.sin(world.time * 3);
    ctx.globalAlpha = blink;
    text('CLICK OR PRESS ANY KEY TO START', VIEW.width / 2, 420, 22, COLORS.good);
    ctx.globalAlpha = 1;
    if (best > 0) text(`BEST SCORE  ${best}`, VIEW.width / 2, 462, 16, COLORS.dimText);
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
        for (const mine of world.mines) drawMine(mine);
        drawParticles(world);
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
