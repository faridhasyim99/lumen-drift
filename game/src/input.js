// LUMEN DRIFT v2 — keyboard and mouse input.
// One object owns every key and pointer the game cares about. The game loop
// reads held keys for movement and consumes one-shot actions (dash, pause,
// restart, start) exactly once per press, so a held key never double-fires.

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, inside: false };
  let mouseClicked = false;

  function toGameCoords(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function onKeyDown(event) {
    if (event.repeat) return;
    keys.add(event.code);
    pressed.add(event.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onMouseMove(event) {
    const point = toGameCoords(event);
    mouse.x = point.x;
    mouse.y = point.y;
    mouse.inside = true;
  }

  function onMouseDown(event) {
    event.preventDefault();
    const point = toGameCoords(event);
    mouse.x = point.x;
    mouse.y = point.y;
    mouse.inside = true;
    mouseClicked = true;
  }

  function onBlur() {
    keys.clear();
    pressed.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);

  function moveVector() {
    let x = 0;
    let y = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) x -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) x += 1;
    if (keys.has('ArrowUp') || keys.has('KeyW')) y -= 1;
    if (keys.has('ArrowDown') || keys.has('KeyS')) y += 1;
    if (x !== 0 && y !== 0) {
      const length = Math.hypot(x, y);
      x /= length;
      y /= length;
    }
    return { x, y };
  }

  function take(code) {
    if (pressed.has(code)) {
      pressed.delete(code);
      return true;
    }
    return false;
  }

  return {
    mouse,
    moveVector,
    // True once per press of Space or per mouse click.
    dashRequested() {
      if (take('Space') || mouseClicked) {
        mouseClicked = false;
        return true;
      }
      return false;
    },
    pauseRequested() {
      return take('KeyP') || take('Escape');
    },
    restartRequested() {
      return take('KeyR');
    },
    // Any key or click starts the game from the title screen.
    startRequested() {
      if (pressed.size > 0 || mouseClicked) {
        pressed.clear();
        mouseClicked = false;
        return true;
      }
      return false;
    },
    muteRequested() {
      return take('KeyM');
    },
    // Call once per frame after the game has read the inputs.
    endFrame() {
      pressed.clear();
      mouseClicked = false;
    },
  };
}
