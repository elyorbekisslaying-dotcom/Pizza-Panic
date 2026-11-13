'use strict';

(() => {
  const canvas = document.getElementById('kitchen');
  const ctx = canvas.getContext('2d');
  const { Game, bounds } = PizzaGame;
  const game = new Game();
  const kitchen = PizzaArt.kitchen(bounds, canvas.width, canvas.height);
  const ui = Object.fromEntries(['score', 'best', 'lives', 'pause', 'overlay', 'title', 'description', 'actions']
    .map(id => [id, document.getElementById(id)]));
  const storageKey = 'pizza-panic.best.v1';
  const keys = new Set();
  const directions = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];
  let state = 'menu';
  let previousTime = null;
  let audio;
  let best = 0;

  try {
    const saved = Number(localStorage.getItem(storageKey));
    if (Number.isSafeInteger(saved) && saved >= 0) best = saved;
  } catch {
    // The session best still works when browser storage is unavailable.
  }

  function refreshScore() {
    if (game.score > best) {
      best = game.score;
      try { localStorage.setItem(storageKey, String(best)); } catch { /* storage can be disabled */ }
    }
    ui.score.textContent = String(game.score).padStart(4, '0');
    ui.best.textContent = String(best).padStart(4, '0');
    ui.lives.textContent = '♥'.repeat(game.lives) + '♡'.repeat(3 - game.lives);
    ui.lives.setAttribute('aria-label', game.lives + ' lives');
  }

  function unlockAudio() {
    try {
      audio ??= new AudioContext();
      if (audio.state === 'suspended') audio.resume().catch(() => {});
    } catch { /* audio is optional */ }
  }

  function sound(event) {
    if (audio?.state !== 'running') return;
    const hit = event === 'hit';
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const now = audio.currentTime;
    oscillator.type = hit ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(hit ? 170 : 570, now);
    oscillator.frequency.exponentialRampToValueAtTime(hit ? 70 : 1020, now + .12);
    gain.gain.setValueAtTime(.09, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + .15);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + .16);
  }

  function show(next) {
    state = next;
    keys.clear();
    ui.overlay.hidden = state === 'playing';
    ui.pause.disabled = state !== 'playing';
    if (state === 'playing') {
      if (ui.overlay.contains(document.activeElement)) document.activeElement.blur();
      return;
    }
    const screens = {
      menu: ['Pizza <em>Panic!</em>', 'Grab fresh toppings. Dodge spoiled food and bombs.', [['Play', start]]],
      paused: ['Paused', 'The kitchen can wait.', [['Resume', () => show('playing')], ['Restart', start], ['Main Menu', menu]]],
      over: ['Game <em>Over</em>', 'Final score ' + game.score + ' · Best score ' + best, [['Play Again', start], ['Main Menu', menu]]]
    };
    const [title, description, actions] = screens[state];
    ui.title.innerHTML = title;
    ui.description.textContent = description;
    ui.actions.replaceChildren(...actions.map(([label, action]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', action);
      return button;
    }));
    ui.actions.firstElementChild.focus({ preventScroll: true });
  }

  function start() {
    unlockAudio();
    game.reset();
    refreshScore();
    show('playing');
  }

  function menu() {
    game.reset();
    refreshScore();
    show('menu');
  }

  function togglePause() {
    if (state === 'playing') show('paused');
    else if (state === 'paused') show('playing');
  }

  window.addEventListener('keydown', event => {
    if (event.code === 'Escape') {
      if (!event.repeat) togglePause();
      return;
    }
    if (state === 'playing' && directions.includes(event.code)) {
      event.preventDefault();
      keys.add(event.code);
    }
  });
  window.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('blur', () => {
    keys.clear();
    if (state === 'playing') show('paused');
  });
  ui.pause.addEventListener('click', togglePause);

  function paintEffects() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '900 19px system-ui';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#fff1d5';
    for (const { age, x, y, label, color, particles } of game.effects) {
      ctx.globalAlpha = Math.min(1, (.64 - age) * 3);
      ctx.fillStyle = color;
      for (const { vx, vy, size } of particles) {
        ctx.fillRect(x + vx * age, y + vy * age, size, size);
      }
      ctx.strokeText(label, x, y - 23 - age * 36);
      ctx.fillText(label, x, y - 23 - age * 36);
    }
    ctx.restore();
  }

  function frame(now) {
    const dt = previousTime === null ? 0 : Math.min((now - previousTime) / 1000, .04);
    previousTime = now;
    if (state === 'playing') {
      const axis = (positive, alternate, negative, other) =>
        Number(keys.has(positive) || keys.has(alternate)) - Number(keys.has(negative) || keys.has(other));
      const events = game.step(dt, axis('KeyD', 'ArrowRight', 'KeyA', 'ArrowLeft'),
        axis('KeyS', 'ArrowDown', 'KeyW', 'ArrowUp'));
      if (events.length) {
        events.forEach(sound);
        refreshScore();
        if (!game.lives) show('over');
      }
    }
    ctx.drawImage(kitchen, 0, 0);
    if (state === 'menu') {
      const items = ['pepperoni', 'cheese', 'tomato', 'mushroom', 'olive'];
      items.forEach((kind, i) => PizzaArt.item(ctx, {
        kind, x: 232 + i * 124, y: 440 + Math.sin(now / 290 + i) * 7, angle: Math.sin(now / 450 + i) * .3
      }));
      PizzaArt.chef(ctx, 480, 158 + Math.sin(now / 270) * 4, 1, 0, false);
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top, 10);
      ctx.clip();
      game.objects.forEach(object => PizzaArt.item(ctx, object));
      const { x, y, facing, stride, protection } = game.player;
      PizzaArt.chef(ctx, x, y, facing, stride, protection > 0 && Math.floor(protection * 14) % 2 === 0);
      paintEffects();
      if (game.flash > 0) {
        ctx.fillStyle = 'rgba(222, 47, 78, ' + game.flash + ')';
        ctx.fillRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
      }
      ctx.restore();
    }
    requestAnimationFrame(frame);
  }

  menu();
  requestAnimationFrame(frame);
})();
