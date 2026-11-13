'use strict';

(() => {
  const canvas = document.getElementById('kitchen');
  const ctx = canvas.getContext('2d');
  const { Game, bounds } = PizzaGame;
  const game = new Game();
  const kitchen = PizzaArt.kitchen(bounds, canvas.width, canvas.height);
  const ui = Object.fromEntries(['score', 'timer', 'lives', 'pause', 'overlay', 'title', 'description', 'actions',
    'order', 'recipe', 'toppings', 'task']
    .map(id => [id, document.getElementById(id)]));
  const { limit, stations, names, total } = PizzaOrders;
  const storageKey = 'pizza-panic.best.v1';
  const keys = new Set();
  const directions = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];
  let state = 'menu';
  let previousTime = null;
  let audio;
  let best = 0;
  let lastClock = '';
  let lastOrder = '';

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
    ui.lives.textContent = '♥'.repeat(game.lives) + '♡'.repeat(3 - game.lives);
    ui.lives.setAttribute('aria-label', game.lives + ' lives');
  }

  function refreshOrder() {
    const seconds = Math.ceil(Math.max(0, limit - game.elapsed));
    const clock = Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
    if (clock !== lastClock) {
      ui.timer.textContent = clock;
      ui.timer.dataset.urgent = String(seconds <= 15);
      lastClock = clock;
    }
    const { recipe, stage, collected, delivered, bakeLeft } = game.orders;
    if (!recipe) {
      ui.recipe.textContent = total + '/' + total + ' pizzas served';
      ui.toppings.replaceChildren();
      ui.task.textContent = 'All orders complete!';
      lastOrder = '';
      return;
    }
    const orderKey = [delivered, stage, Object.keys(collected).join()].join('|');
    if (orderKey !== lastOrder) {
      ui.recipe.textContent = (delivered + 1) + '/' + total + ' · ' + recipe.name;
      ui.toppings.replaceChildren(...Object.keys(recipe.toppings).map(kind => {
        const item = document.createElement('li');
        item.dataset.collected = String(Boolean(collected[kind]));
        item.textContent = (collected[kind] ? '✓ ' : '○ ') + names[kind];
        return item;
      }));
      lastOrder = orderKey;
    }
    const instructions = {
      collect: 'Catch the missing toppings',
      oven: 'Walk to the oven on the left',
      baking: 'Baking · ' + Math.ceil(bakeLeft) + 's',
      ready: 'Pizza ready! Return to the oven',
      carry: 'Take the pizza to pickup on the right'
    };
    if (ui.task.textContent !== instructions[stage]) ui.task.textContent = instructions[stage];
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
    ui.order.hidden = state === 'menu';
    if (state === 'playing') {
      if (ui.overlay.contains(document.activeElement)) document.activeElement.blur();
      return;
    }
    const screens = {
      menu: ['Pizza <em>Panic!</em>', 'Serve three pizzas before closing. Catch toppings, bake, and bring each pizza to pickup. You have 90 seconds and three lives.', [['Play', start]]],
      paused: ['Paused', 'The kitchen can wait.', [['Resume', () => show('playing')], ['Restart', start], ['Main Menu', menu]]],
      over: ['Game <em>Over</em>', (game.lives ? 'Time’s up!' : 'Out of lives!') +
        ' Served ' + game.orders.delivered + '/' + total + ' · Score ' + game.score + ' · Best ' + best,
      [['Play Again', start], ['Main Menu', menu]]],
      won: ['Kitchen <em>Closed!</em>', 'All three pizzas served! ' + Math.ceil(limit - game.elapsed) +
        's left · Score ' + game.score + ' · Best ' + best, [['Play Again', start], ['Main Menu', menu]]]
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
    refreshOrder();
    show('playing');
  }

  function menu() {
    game.reset();
    refreshScore();
    refreshOrder();
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
      }
      refreshOrder();
      if (game.orders.stage === 'won') show('won');
      else if (!game.lives || game.elapsed >= limit) show('over');
    }
    ctx.drawImage(kitchen, 0, 0);
    if (state === 'menu') {
      const items = ['pepperoni', 'cheese', 'tomato', 'mushroom', 'olive'];
      items.forEach((kind, i) => PizzaArt.item(ctx, {
        kind, x: 232 + i * 124, y: 440 + Math.sin(now / 290 + i) * 7, angle: Math.sin(now / 450 + i) * .3
      }));
      PizzaArt.pizza(ctx, 480, 424, { cheese: true, pepperoni: true, tomato: true, mushroom: true, olive: true }, 1.5);
      PizzaArt.chef(ctx, 480, 158 + Math.sin(now / 270) * 4, 1, 0, false);
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top, 10);
      ctx.clip();
      const order = game.orders;
      PizzaArt.station(ctx, stations.oven, 'oven', ['oven', 'baking', 'ready'].includes(order.stage), order);
      PizzaArt.station(ctx, stations.counter, 'counter', order.stage === 'carry', order);
      game.objects.forEach(object => PizzaArt.item(ctx, object));
      const { x, y, facing, stride, protection } = game.player;
      PizzaArt.chef(ctx, x, y, facing, stride, protection > 0 && Math.floor(protection * 14) % 2 === 0);
      if (order.stage === 'carry') PizzaArt.pizza(ctx, x + 15 * facing, y + 10, order.collected, .56);
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
