'use strict';

const PizzaGame = (() => {
  const bounds = { left: 52, top: 61, right: 908, bottom: 519 };
  const toppings = [['pepperoni', 10], ['cheese', 15], ['tomato', 20], ['mushroom', 25], ['olive', 30]];
  const hazards = ['rotten', 'spoiled', 'bomb'];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const pick = (items, random) => items[Math.floor(random() * items.length)];

  function difficulty(seconds) {
    const heat = clamp(seconds / 105, 0, 1);
    return { interval: 1.03 - heat * .67, speed: 100 + heat * 148, hazardChance: .23 + heat * .32 };
  }

  class Game {
    constructor(random = Math.random) {
      this.random = random;
      this.reset();
    }

    reset() {
      this.elapsed = 0;
      this.nextSpawn = .85;
      this.score = 0;
      this.lives = 3;
      this.flash = 0;
      this.orders = new PizzaOrders.Orders();
      this.preferOrderTopping = true;
      this.objects = [];
      this.effects = [];
      this.player = { x: 480, y: 290, facing: 1, walk: 0, stride: 0, protection: 0 };
      this.objects.push(
        { x: 310, y: 246, vx: 78, vy: 14, kind: 'pepperoni', points: 10, angle: 0, spin: .75 },
        { x: 660, y: 324, vx: -64, vy: -17, kind: 'cheese', points: 15, angle: 0, spin: -.7 }
      );
    }

    spawn() {
      const random = this.random;
      const { left, top, right, bottom } = bounds;
      const { speed, hazardChance } = difficulty(this.elapsed);
      const edge = Math.floor(random() * 4);
      const horizontal = edge < 2;
      const x = horizontal ? left + random() * (right - left) : edge === 2 ? left - 24 : right + 24;
      const y = horizontal ? edge === 0 ? top - 24 : bottom + 24 : top + random() * (bottom - top);
      const targetX = left + (right - left) * (.16 + random() * .68);
      const targetY = top + (bottom - top) * (.16 + random() * .68);
      const heading = Math.atan2(targetY - y, targetX - x);
      const velocity = speed * (.87 + random() * .26);
      const hazard = this.elapsed >= 4 && random() < hazardChance;
      let choices = toppings;
      if (!hazard) {
        const missing = this.orders.missing();
        if (this.preferOrderTopping && missing.length) {
          choices = toppings.filter(([kind]) => missing.includes(kind));
        }
        this.preferOrderTopping = !this.preferOrderTopping;
      }
      const [kind, points] = hazard ? [pick(hazards, random), 0] : pick(choices, random);
      this.objects.push({
        x, y, kind, points, hazard, angle: 0,
        vx: Math.cos(heading) * velocity,
        vy: Math.sin(heading) * velocity,
        spin: (random() - .5) * 2.7
      });
    }

    burst(x, y, label, hurt) {
      const color = hurt ? '#d63650' : '#218460';
      const particles = Array.from({ length: 12 }, (_, i) => {
        const angle = i / 12 * Math.PI * 2;
        const speed = 35 + this.random() * 100;
        return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: 3 + this.random() * 4 };
      });
      this.effects.push({ x, y, label, color, particles, age: 0 });
    }

    step(dt, xDirection, yDirection) {
      dt = Math.min(dt, Math.max(0, PizzaOrders.limit - this.elapsed));
      this.elapsed += dt;
      const player = this.player;
      const length = Math.hypot(xDirection, yDirection);
      if (length) {
        const distance = 255 * dt / length;
        player.x = clamp(player.x + xDirection * distance, bounds.left + 22, bounds.right - 22);
        player.y = clamp(player.y + yDirection * distance, bounds.top + 32, bounds.bottom - 22);
        player.walk += dt * 22;
        if (xDirection) player.facing = Math.sign(xDirection);
      }
      player.stride = length ? Math.sin(player.walk) * 3.5 : 0;
      player.protection = Math.max(0, player.protection - dt);
      this.flash = Math.max(0, this.flash - dt);
      this.effects = this.effects.filter(effect => (effect.age += dt) < .64);

      if (this.elapsed >= this.nextSpawn) {
        this.spawn();
        this.nextSpawn = this.elapsed + difficulty(this.elapsed).interval;
      }

      const events = [];
      this.objects = this.objects.filter(object => {
        object.x += object.vx * dt;
        object.y += object.vy * dt;
        object.angle += object.spin * dt;
        if (object.x < bounds.left - 50 || object.x > bounds.right + 50 ||
            object.y < bounds.top - 50 || object.y > bounds.bottom + 50) return false;
        if (!this.lives || Math.hypot(object.x - player.x, object.y - player.y) > 27) return true;

        if (!object.hazard) {
          this.score += object.points;
          this.orders.collect(object.kind);
          this.burst(object.x, object.y, '+' + object.points, false);
          events.push('collect');
          return false;
        }
        if (player.protection > 0) return true;
        this.lives--;
        player.protection = 1.2;
        this.flash = .24;
        this.burst(player.x, player.y, '−1 LIFE', true);
        events.push('hit');
        return false;
      });
      if (this.lives && this.elapsed < PizzaOrders.limit) {
        const orderEvent = this.orders.step(dt, player);
        if (orderEvent) events.push(orderEvent);
        if (orderEvent === 'deliver') {
          this.score += 100;
          this.burst(player.x, player.y, 'PIZZA SERVED +100', false);
        }
      }
      return events;
    }
  }

  return { Game, bounds, difficulty };
})();
