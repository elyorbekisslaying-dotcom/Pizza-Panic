"use strict";
const RivalGame = (() => {
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
    clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  class Game {
    constructor(random = Math.random) {
      this.random = random;
      this.reset();
    }
    reset(mode = "competitive") {
      this.mode = mode;
      this.tutorial = null;
      this.countdown = mode === "competitive" ? 3.6 : 0;
      this.resultReason = "";
      this.events = [];
      this.eventSerial = 0;
      this.projectiles = [];
      this.vipBanner = 0;
      this.metrics = {
        firstHire: [null, null],
        waiterBusy: [0, 0],
        assistantBusy: [0, 0],
      };
      this.time = 0;
      this.nextId = 1;
      this.winner = null;
      this.rats = [];
      this.traps = [];
      this.drops = [];
      this.effects = [];
      this.sounds = [];
      this.vips = [];
      this.nextVIP = 45;
      this.nextRats = 60;
      this.notice = "";
      this.noticeTime = 0;
      this.vipTable = { type: "vip", x: 1000, y: 600, w: 140, h: 64 };
      this.teams = [0, 1].map((id) => ({
        id,
        money: 60,
        open: true,
        signEnemyCD: 0,
        signFX: 0,
        cooks: [],
        history: [],
        alerts: [],
        rep: 0,
        stock: Object.fromEntries(Kitchen.stockKeys.map((k) => [k, 4])),
        stations: Kitchen.stations(id),
        tables: Kitchen.tables(id),
        seats: Kitchen.seats(id),
        customers: [],
        nextCustomer: 0,
        ovens: Array(4).fill(null),
        pickup: [],
        waiter: null,
        ratCD: 0,
        served: 0,
        vipServed: 0,
        lost: 0,
        spent: 0,
        starFX: 0,
        entrance: { x: Kitchen.mirror(id, 420), y: 1130 },
        hole: { x: Kitchen.mirror(id, 790), y: 70 },
        door: { x: Kitchen.mirror(id, 420), y: 1080, w: 140, open: 0 },
      }));
      this.vipSeats = [960, 1040].flatMap((x, i) =>
        [-1, 1].map((side, j) => ({
          type: "vip",
          seat: i * 2 + j,
          x,
          y: 600 + side * 65,
          w: 30,
          h: 28,
          approach: { x, y: 600 + side * 115 },
        })),
      );
      this.players = [0, 1].map((id) => ({
        id,
        x: Kitchen.mirror(id, 420),
        y: 580,
        faceX: id ? -1 : 1,
        faceY: 0,
        walk: 0,
        hand: null,
        prep: null,
        selected: null,
        panel: null,
        cursor: 0,
        stun: 0,
        immune: 0,
        trapCD: 0,
        flourTime: 0,
        flourImmune: 0,
        cleaning: null,
        signBusy: 0,
        knockX: 0,
        knockY: 0,
        message: "Greet a guest to take an order",
        messageTime: 5,
      }));
      this.walls = [
        { x: 1000, y: 24, w: 1960, h: 24 },
        { x: 1000, y: 1176, w: 1960, h: 24 },
        { x: 24, y: 600, w: 24, h: 1176 },
        { x: 1976, y: 600, w: 24, h: 1176 },
      ];
      for (const id of [0, 1])
        for (const [x, y, w, h] of [
          [840, 260, 24, 472],
          [840, 960, 24, 432],
          [190, 460, 300, 24],
          [680, 460, 320, 24],
          [190, 1080, 320, 24],
          [665, 1080, 350, 24],
        ])
          this.walls.push({ x: Kitchen.mirror(id, x), y, w, h });
      this.obstacles = [
        ...this.walls,
        ...this.teams.flatMap((t) => [...t.stations, ...t.tables, ...t.seats]),
        this.vipTable,
        ...this.vipSeats,
      ];
      this.teams.forEach((t) => this.addCustomer(t));
    }
    get vip() {
      return this.vips[0] || null;
    }
    record(type, data = {}) {
      this.events.push({
        type,
        seq: this.eventSerial++,
        time: this.time,
        ...data,
      });
      if (this.events.length > 200) this.events.shift();
    }
    active() {
      return this.countdown <= 0 && this.winner === null;
    }
    say(p, msg) {
      p.message = msg;
      p.messageTime = 3;
    }
    announce(msg, sound = "event") {
      this.notice = msg;
      this.noticeTime = 5;
      this.sounds.push(sound);
    }
    order(id) {
      return [...this.teams.flatMap((t) => t.customers), ...this.vips].find(
        (o) => o && o.id === id && !o.departing,
      );
    }
    accepted(o, id) {
      return (
        o &&
        (o.team === id
          ? o.state === "accepted"
          : o.team === -1 && o.accepted.includes(id))
      );
    }
    accept(o, id) {
      if (!o || o.departing) return false;
      if (o.team === -1) {
        if (o.accepted.includes(id)) return false;
        o.accepted.push(id);
        this.record("accept", { id, order: o.id, vip: true });
        if (o.accepted.length === 1) {
          o.patience = o.maxPatience = 115;
        }
        return true;
      }
      if (o.team !== id || o.state !== "waiting") return false;
      o.state = "accepted";
      this.record("accept", { id, order: o.id });
      o.patience = o.maxPatience = 115;
      return true;
    }
    addCustomer(t) {
      if (!t.open) return;
      const seat = t.seats.find(
        (s) =>
          !t.tables[s.table].dirty &&
          !t.customers.some((c) => c.seat === s.seat),
      );
      if (!seat) return;
      const c = {
        id: this.nextId++,
        team: t.id,
        seat: seat.seat,
        recipe: (t.served + t.lost + t.customers.length) % 3,
        state: "entering",
        patience: 30,
        maxPatience: 30,
        look: this.nextId % 6,
        name: ["Mia", "Sam", "Noah", "Ava", "Leo", "Zoe"][this.nextId % 6],
        x: t.entrance.x,
        y: t.entrance.y,
        departing: false,
      };
      c.path = this.path(c, seat.approach);
      t.customers.push(c);
      t.nextCustomer = this.time + 18;
    }
    solid(x, y, r = 17) {
      return (
        x < 38 ||
        y < 38 ||
        x > 1962 ||
        y > 1162 ||
        this.obstacles.some(
          (o) =>
            Math.hypot(
              x - clamp(x, o.x - o.w / 2, o.x + o.w / 2),
              y - clamp(y, o.y - o.h / 2, o.y + o.h / 2),
            ) < r,
        )
      );
    }
    blocked(x, y, id) {
      return (
        this.solid(x, y) ||
        this.players.some(
          (p) => !p.hidden && p.id !== id && Math.hypot(p.x - x, p.y - y) < 34,
        )
      );
    }
    move(p, dx, dy) {
      let n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 6));
      for (let i = 0; i < n; i++) {
        if (!this.blocked(p.x + dx / n, p.y, p.id)) p.x += dx / n;
        if (!this.blocked(p.x, p.y + dy / n, p.id)) p.y += dy / n;
      }
    }
    lineClear(a, b, r = 17) {
      const steps = Math.max(1, Math.ceil(distance(a, b) / 4));
      for (let i = 0; i <= steps; i++)
        if (
          this.solid(
            a.x + ((b.x - a.x) * i) / steps,
            a.y + ((b.y - a.y) * i) / steps,
            r,
          )
        )
          return false;
      return true;
    }
    accessPoint(target, from = this.players[0]) {
      if (!target) return null;
      if (target.approach) return { ...target.approach };
      if (!this.solid(target.x, target.y)) return { x: target.x, y: target.y };
      const points = [];
      for (
        let y = target.y - (target.h || 30) / 2 - 65;
        y <= target.y + (target.h || 30) / 2 + 65;
        y += 20
      )
        for (
          let x = target.x - (target.w || 30) / 2 - 65;
          x <= target.x + (target.w || 30) / 2 + 65;
          x += 20
        ) {
          const q = {
            x: Math.round((x - 10) / 20) * 20 + 10,
            y: Math.round((y - 10) / 20) * 20 + 10,
          };
          if (
            !this.solid(q.x, q.y) &&
            distance(q, target) <
              (target.type === "table" ? target.w / 2 + 80 : 92)
          )
            points.push(q);
        }
      points.sort((a, b) => distance(a, from) - distance(b, from));
      return points.find((q) => this.path(from, q).length) || null;
    }
    // A shared 20px navigation grid uses the same furniture and walls as player collision.
    path(from, to) {
      const size = 20,
        W = 100,
        H = 60;
      const cell = (p) => [
        Math.round((p.x - 10) / size),
        Math.round((p.y - 10) / size),
      ];
      let [sx, sy] = cell(from),
        [tx, ty] = cell(to);
      const signature = this.obstacles
        .map((o) => [o.x, o.y, o.w, o.h].join(","))
        .join(";");
      if (this.navSignature !== signature) {
        this.navSignature = signature;
        this.navGrid = new Uint8Array(W * H);
        for (let y = 0; y < H; y++)
          for (let x = 0; x < W; x++)
            this.navGrid[y * W + x] = !this.solid(
              x * size + 10,
              y * size + 10,
              17,
            );
      }
      const rivals = this.players.includes(from)
        ? this.players.filter((p) => p !== from && !p.hidden)
        : [];
      const valid = (x, y) =>
        x >= 0 &&
        x < W &&
        y >= 0 &&
        y < H &&
        this.navGrid[y * W + x] &&
        !rivals.some(
          (p) => Math.hypot(p.x - (x * size + 10), p.y - (y * size + 10)) < 36,
        );
      if (!valid(tx, ty)) return [];
      if (
        !valid(sx, sy) ||
        !this.lineClear(from, { x: sx * size + 10, y: sy * size + 10 })
      ) {
        const starts = [];
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++) {
            const x = sx + dx,
              y = sy + dy,
              p = { x: x * size + 10, y: y * size + 10 };
            if (valid(x, y) && this.lineClear(from, p))
              starts.push({ x, y, d: distance(from, p) });
          }
        starts.sort((a, b) => a.d - b.d);
        if (!starts.length) return [];
        sx = starts[0].x;
        sy = starts[0].y;
      }
      const start = sy * W + sx,
        end = ty * W + tx,
        q = [start],
        prev = new Map([[start, -1]]);
      for (let head = 0; head < q.length; head++) {
        const v = q[head];
        if (v === end) break;
        let x = v % W,
          y = Math.floor(v / W);
        for (const [a, b] of [
          [x + 1, y],
          [x - 1, y],
          [x, y + 1],
          [x, y - 1],
        ]) {
          const key = b * W + a;
          if (!prev.has(key) && valid(a, b)) {
            prev.set(key, v);
            q.push(key);
          }
        }
      }
      if (!prev.has(end)) return [];
      const out = [];
      for (let v = end; v !== start; v = prev.get(v))
        out.push({ x: (v % W) * size + 10, y: Math.floor(v / W) * size + 10 });
      out.push({ x: sx * size + 10, y: sy * size + 10 });
      return out.reverse();
    }
    travel(actor, dt, speed = 110) {
      let budget = dt * speed;
      while (actor.path?.length && budget > 0) {
        const target = actor.path[0],
          d = distance(actor, target);
        if (d <= budget) {
          actor.x = target.x;
          actor.y = target.y;
          actor.path.shift();
          budget -= d;
        } else {
          actor.x += ((target.x - actor.x) / d) * budget;
          actor.y += ((target.y - actor.y) / d) * budget;
          budget = 0;
        }
      }
      return !actor.path?.length;
    }
    nearest(p) {
      return [
        ...this.teams[p.id].stations
          .filter((s) => s.type !== "storage")
          .flatMap((s) =>
            s.type === "oven"
              ? s.slots.map((slot, index) => ({
                  ...s,
                  ...slot.approach,
                  approach: slot.approach,
                  slot: index,
                }))
              : [s],
          ),
        ...this.teams[1 - p.id].stations.filter((s) => s.type === "sign"),
        ...this.teams[p.id].tables.filter((t) => t.dirty),
        ...this.teams[p.id].seats.filter(
          (s) => !this.teams[p.id].tables[s.table].dirty,
        ),
        ...this.vipSeats,
      ]
        .filter(
          (s) =>
            distance(p, s.approach || s) <
            (s.type === "table" ? s.w / 2 + 80 : 92),
        )
        .sort(
          (a, b) => distance(p, a.approach || a) - distance(p, b.approach || b),
        )[0];
    }
    pizzaExists(id, owner) {
      return (
        this.players.some(
          (p) =>
            p.id === owner && (p.hand?.order === id || p.prep?.order === id),
        ) ||
        this.teams.some(
          (t) =>
            t.id === owner &&
            (t.ovens.some((food) => food?.order === id) ||
              t.pickup.some((food) => food.order === id) ||
              t.waiter?.pizza?.order === id ||
              t.cooks.some((a) => a.job?.order === id)),
        ) ||
        this.drops.some((d) => d.owner === owner && d.item.order === id)
      );
    }
    spend(t, n) {
      if (t.money < n) return false;
      t.money -= n;
      t.spent += n;
      return true;
    }
    buy(p, key) {
      if (
        !this.active() ||
        p.stun ||
        p.panel !== "supply" ||
        !Kitchen.stockKeys.includes(key)
      )
        return false;
      const t = this.teams[p.id];
      if (!this.spend(t, Kitchen.prices[key])) {
        this.say(p, "Not enough coins");
        return false;
      }
      t.stock[key] += 4;
      this.record("buy", { id: p.id, key });
      this.say(p, "+4 " + key);
      return true;
    }
    addIngredient(p, key) {
      const item = p.hand,
        t = this.teams[p.id];
      if (
        !this.active() ||
        p.stun ||
        p.panel !== "assembly" ||
        item?.stage !== "dough"
      )
        return false;
      item.added ??= [];
      if (
        !Kitchen.recipes[item.recipe].items.includes(key) ||
        key === "dough" ||
        item.added.includes(key) ||
        t.stock[key] <= 0
      ) {
        this.say(p, "Already added, unavailable, or not in this recipe");
        return false;
      }
      t.stock[key]--;
      item.added.push(key);
      return true;
    }
    assemble(p) {
      if (
        !this.active() ||
        p.stun ||
        p.panel !== "assembly" ||
        p.hand?.stage !== "dough"
      )
        return false;
      if (
        !Kitchen.recipes[p.hand.recipe].items
          .filter((k) => k !== "dough")
          .every((k) => p.hand.added?.includes(k))
      ) {
        this.say(p, "Add all recipe ingredients first");
        return false;
      }
      p.hand.stage = "raw";
      p.panel = null;
      return true;
    }
    select(p, id) {
      const o = this.order(id);
      if (!this.accepted(o, p.id)) return false;
      p.selected = id;
      this.record("select", { id: p.id, order: id });
      p.panel = null;
      return true;
    }
    status(o, id) {
      const p = this.players[id],
        t = this.teams[id];
      const cook = t.cooks.find((a) => a.job?.order === o.id);
      if (cook)
        return (
          (cook.food?.stage === "ready" ||
          t.ovens.some((f) => f?.order === o.id && f.stage === "ready")
            ? "Ready · "
            : "") +
          "Cook " +
          (cook.index + 1) +
          " · " +
          cook.state
        );
      if (p.prep?.order === o.id) return "Player preparing";
      if (t.waiter?.pizza?.order === o.id) return "Being delivered";
      if (t.pickup.some((f) => f.order === o.id)) return "Ready at pickup";
      const a = [
        p.hand,
        p.prep,
        ...t.ovens,
        ...this.drops.filter((d) => d.owner === id).map((d) => d.item),
      ].find((i) => i?.order === o.id);
      return a
        ? {
            dough: a.added?.length ? "Assembling" : "Dough ready",
            raw: "Assembled · raw",
            baking: "Baking",
            ready: "Ready",
            burned: "Burned",
          }[a.stage]
        : "Accepted";
    }
    deliver(item, t) {
      const o = this.order(item?.order);
      if (
        !o ||
        !this.accepted(o, t.id) ||
        item.owner !== t.id ||
        item.recipe !== o.recipe ||
        item.stage !== "ready"
      )
        return false;
      const vip = o.team === -1,
        old = Math.floor(t.rep / 25);
      const payment =
        (vip ? 40 : Kitchen.recipes[o.recipe].price) +
        Math.min(3, Math.floor(o.patience / 30));
      t.money += payment;
      t.rep = Math.min(100, t.rep + (vip ? 12 : 10));
      t.served++;
      if (vip) {
        t.vipServed++;
        this.vips = this.vips.filter((v) => v.id !== o.id);
        this.nextVIP = this.time + 50;
      } else this.leave(t, o);
      this.sounds.push("serve");
      if (Math.floor(t.rep / 25) > old) {
        t.starFX = 2;
        this.sounds.push("star");
      }
      t.history.push({
        id: o.id,
        label: "Completed",
        name: o.name || "VIP",
        until: this.time + 4,
      });
      this.record("deliver", { id: t.id, order: o.id, vip });
      this.cancel(o.id);
      this.say(
        this.players[t.id],
        "Served! +" + (vip ? 12 : 10) + " reputation · +" + payment + " coins",
      );
      if (t.rep === 100) {
        this.winner = t.id;
        this.resultReason = "Five stars!";
        this.sounds.push("win");
      }
      return true;
    }
    leave(t, c) {
      c.departing = true;
      c.state = "leaving";
      c.path = this.path(c, t.entrance);
    }
    cancel(id) {
      for (const p of this.players) {
        for (const key of ["hand", "prep"])
          if (p[key]?.order === id) {
            p[key] = null;
            this.say(p, "Order closed — linked food cleared");
          }
        if (p.selected === id) p.selected = null;
        if (p.panel === "assembly" && !p.hand) p.panel = null;
      }
      for (const t of this.teams) {
        t.ovens = t.ovens.map((f) => (f?.order === id ? null : f));
        t.pickup = t.pickup.filter((f) => f.order !== id);
        for (const a of t.cooks)
          if (a.job?.order === id) this.releaseCook(t, a);
        if (t.waiter?.pizza?.order === id) t.waiter.pizza = null;
        if (t.waiter?.target === id) {
          t.waiter.task = "idle";
          t.waiter.service = 0;
          t.waiter.target = null;
          t.waiter.path = [];
        }
      }
      this.drops = this.drops.filter((d) => d.item.order !== id);
    }
    interact(p) {
      if (!this.active() || p.stun || p.prep || p.panel || p.signBusy) return;
      const t = this.teams[p.id];
      const drop = this.drops.find(
        (d) =>
          d.owner === p.id &&
          d.unlock <= this.time &&
          distance(p, d) < 48 &&
          (d.item.kind === "ingredient" || !p.hand),
      );
      if (drop) {
        if (drop.item.kind === "ingredient") {
          t.stock[drop.item.key]++;
          this.record("recover", { id: p.id, key: drop.item.key });
        } else p.hand = drop.item;
        this.drops.splice(this.drops.indexOf(drop), 1);
        return;
      }
      const s = this.nearest(p);
      if (!s) {
        this.say(p, "Move closer to a guest or station");
        return;
      }
      if (s.type === "sign") {
        const owner = this.teams[s.team];
        if (p.id !== s.team && owner.signEnemyCD > 0) {
          this.say(p, "Sign protected from rival flips");
          return;
        }
        owner.open = !owner.open;
        owner.signFX = 0.4;
        p.signBusy = 0.3;
        if (p.id !== s.team) owner.signEnemyCD = 8;
        if (owner.open) owner.nextCustomer = this.time + 8;
        this.record("sign", { id: p.id, team: s.team, open: owner.open });
        this.say(
          this.players[s.team],
          owner.open
            ? "Restaurant OPEN"
            : "Restaurant CLOSED — existing orders continue",
        );
        return;
      }
      if (s.type === "table" && s.dirty) {
        p.cleaning = { table: s.index, left: 2.5 };
        return;
      }
      if (s.type === "assistant" && t.cooks.length >= 4) {
        this.say(
          p,
          "All four cooks hired. Collect baked food at Pickup or Oven.",
        );
        return;
      }
      let o = this.order(p.selected);
      if (s.type === "seat" || s.type === "vip") {
        const c =
          s.type === "vip"
            ? this.vips.find((v) => v.seat === s.seat)
            : t.customers.find(
                (c) =>
                  c.seat === s.seat && !c.departing && c.state !== "entering",
              );
        if (!c) {
          this.say(p, "No guest waiting here");
          return;
        }
        if (p.hand?.order === c.id && this.deliver(p.hand, t)) return;
        this.accept(c, p.id);
        if (this.accepted(c, p.id)) {
          p.selected = c.id;
          this.say(p, "Order accepted: " + Kitchen.recipes[c.recipe].name);
        }
        return;
      }
      if (s.type === "supply" || s.type === "terminal") {
        p.panel = s.type;
        p.cursor = 0;
        p.focusOrder = null;
        if (s.type === "terminal")
          p.orderList = [
            ...t.customers.filter((c) => this.accepted(c, p.id)),
            ...this.vips.filter((c) => this.accepted(c, p.id)),
          ]
            .sort((a, b) => a.patience - b.patience)
            .map((c) => c.id);
        return;
      }
      if (s.type === "bin") {
        p.hand = null;
        return;
      }
      if (Kitchen.purchases[s.type]) {
        const key = s.type;
        if (
          ["banana", "flour", "bottle"].includes(key) &&
          (p.hand ||
            (key === "banana" &&
              this.traps.filter((a) => a.owner === p.id).length >= 3))
        ) {
          this.say(p, "Free your hands; maximum three active traps");
          return;
        }
        if (key === "waiter" && t.waiter) {
          this.say(p, "Waiter already hired");
          return;
        }
        if (
          key === "rats" &&
          (t.ratCD > 0 || this.rats.some((r) => r.team === 1 - p.id))
        ) {
          this.say(p, "Wave unavailable; wait for cooldown and clear kitchen");
          return;
        }
        if (!this.spend(t, Kitchen.purchases[key])) {
          this.say(p, "Not enough coins");
          return;
        }
        if (["banana", "flour", "bottle"].includes(key))
          p.hand = { kind: key, owner: p.id };
        if (key === "assistant") {
          t.cooks.push({
            ...t.stations.find((s) => s.type === "topping").workPoints[
              t.cooks.length
            ],
            index: t.cooks.length,
            job: null,
            food: null,
            path: [],
            state: "Waiting for orders",
            faceX: p.id ? -1 : 1,
            faceY: 0,
            walk: 0,
          });
          this.record("hire", { id: p.id, kind: key });
        }
        if (
          ["assistant", "waiter"].includes(key) &&
          this.metrics.firstHire[p.id] === null
        )
          this.metrics.firstHire[p.id] = this.time;
        if (key === "waiter") {
          this.record("hire", { id: p.id, kind: key });
          const a = t.stations.find((s) => s.type === "serving");
          t.waiter = {
            ...a.approach,
            task: "idle",
            pizza: null,
            path: [],
          };
        }
        if (key === "rats") {
          t.ratCD = 60;
          this.invade(1 - p.id);
        }
        return;
      }
      if (s.type === "dough") {
        if (p.hand || p.prep) {
          this.say(p, "Free your hands before preparing dough");
          return;
        }
        if (!this.accepted(o, p.id)) {
          p.selected = null;
          o = t.customers
            .filter(
              (c) => this.accepted(c, p.id) && !this.pizzaExists(c.id, p.id),
            )
            .sort((a, b) => a.patience - b.patience)[0];
          if (!o) {
            this.say(
              p,
              "No unclaimed accepted regular order. Greet a guest or select a VIP personally.",
            );
            return;
          }
          p.selected = o.id;
          this.record("autoSelect", { id: p.id, order: o.id });
          this.say(
            p,
            "Assigned T" +
              (t.seats[o.seat].table + 1) +
              " / " +
              t.seats[o.seat].place +
              ": " +
              Kitchen.recipes[o.recipe].name,
          );
        }
        if (this.pizzaExists(o.id, p.id)) {
          this.say(
            p,
            this.status(o, p.id) + " — this order already has a cook or dish",
          );
          return;
        }
        if (t.stock.dough <= 0) {
          this.say(p, "No dough in stock. Visit Supplies.");
          return;
        }
        t.stock.dough--;
        p.prep = {
          kind: "pizza",
          order: o.id,
          owner: p.id,
          recipe: o.recipe,
          stage: "dough",
          added: [],
          left: 1.2,
        };
      }
      if (s.type === "topping") {
        if (p.hand?.stage !== "dough") {
          this.say(p, "Bring prepared dough");
          return;
        }
        p.panel = "assembly";
        p.cursor = 0;
      }
      if (s.type === "oven") {
        const slot = s.slot ?? 0,
          food = t.ovens[slot];
        if (food?.stage === "burned") {
          t.ovens[slot] = null;
          for (const cook of t.cooks)
            if (cook.job?.order === food.order) this.releaseCook(t, cook);
        } else if (food?.stage === "ready" && !p.hand) {
          p.hand = food;
          t.ovens[slot] = null;
          for (const cook of t.cooks)
            if (cook.job?.order === food.order) this.releaseCook(t, cook);
          this.record("ovenCollect", { id: p.id, order: food.order, slot });
        } else if (!food && p.hand?.stage === "raw") {
          t.ovens[slot] = { ...p.hand, stage: "baking", timer: 3 };
          p.hand = null;
        } else
          this.say(
            p,
            "Oven slot " +
              (slot + 1) +
              (food ? " busy or hands full" : " needs a raw pizza"),
          );
      }
      if (s.type === "serving") {
        if (!p.hand && t.pickup.length) {
          const index = Math.max(
            0,
            t.pickup.findIndex((f) => f.order === p.selected),
          );
          p.hand = t.pickup.splice(index, 1)[0];
          this.record("pickupCollect", { id: p.id, order: p.hand.order });
          return;
        }
        if (
          p.hand?.stage !== "ready" ||
          this.order(p.hand.order)?.team !== p.id
        ) {
          this.say(
            p,
            "Queue baked regular pizzas here. Empty hands collect selected order, or oldest dish.",
          );
          return;
        }
        t.pickup.push(p.hand);
        p.hand = null;
      }
    }

    drop(p) {
      if (p.hand) {
        this.drops.push({
          x: p.x,
          y: p.y,
          item: p.hand,
          owner: p.id,
          unlock: this.time + 0.6,
          life: 45,
        });
        p.hand = null;
      }
    }
    hit(v, dx, dy) {
      if (v.immune) return;
      this.drop(v);
      if (v.prep) {
        this.drops.push({
          x: v.x,
          y: v.y,
          item: { ...v.prep, left: undefined },
          owner: v.id,
          unlock: this.time + 0.6,
          life: 45,
        });
        v.prep = null;
      }
      if (v.cleaning) {
        this.teams[v.id].tables[v.cleaning.table].cleanProgress = 0;
        v.cleaning = null;
      }
      v.panel = null;
      v.stun = 0.45;
      v.immune = 2.5;
      const d = Math.hypot(dx, dy) || 1;
      v.knockX = (dx / d) * 200;
      v.knockY = (dy / d) * 200;
      this.record("hit", { id: v.id });
    }
    trap(p) {
      if (
        !this.active() ||
        p.stun ||
        p.trapCD ||
        p.panel ||
        p.hand?.kind !== "banana" ||
        this.traps.filter((t) => t.owner === p.id).length >= 3
      )
        return;
      const pos = { x: p.x + p.faceX * 30, y: p.y + p.faceY * 30 };
      if (this.solid(pos.x, pos.y, 20)) {
        this.say(p, "Place on clear floor");
        return;
      }
      this.traps.push({ ...pos, owner: p.id, arm: this.time + 1.2, life: 40 });
      p.hand = null;
      p.trapCD = 1;
      this.record("trap", { id: p.id });
    }
    invade(id) {
      if (this.rats.some((r) => r.team === id)) return false;
      const t = this.teams[id],
        storage = t.stations.find((s) => s.type === "storage");
      for (let i = 0; i < 4; i++) {
        const r = {
          team: id,
          x: t.hole.x,
          y: t.hole.y,
          phase: "in",
          stolen: null,
          delay: i * 0.7,
          path: [],
        };
        r.path = this.path(r, storage.approach);
        this.rats.push(r);
      }
      this.announce((id ? "RED" : "BLUE") + ": rats heading for storage!");
      return true;
    }
    waiterStep(t, dt) {
      const w = t.waiter;
      if (!w) return;
      const pickup = t.stations.find((s) => s.type === "serving");
      if (w.task === "idle") {
        const c = t.customers
          .filter((c) => c.state === "waiting" && !c.departing)
          .sort((a, b) => a.patience - b.patience)[0];
        if (
          t.pickup.length &&
          (!c ||
            this.order(t.pickup[0].order)?.patience <= c.patience ||
            w.lastTask === "accept")
        ) {
          w.task = "pickup";
          w.path = this.path(w, pickup.approach);
        } else if (c) {
          w.target = c.id;
          w.task = "accept";
          w.path = this.path(w, t.seats[c.seat].approach);
        } else return;
      }
      if (
        (w.task === "accept" || w.task === "deliver") &&
        !this.order(w.target)
      ) {
        w.task = "idle";
        w.service = 0;
        w.pizza = null;
        w.path = [];
        return;
      }
      this.metrics.waiterBusy[t.id] += dt;
      if (!this.travel(w, dt, 115)) return;
      w.service = (w.service || 0) + dt;
      if (w.service < 0.9) return;
      w.service = 0;
      if (w.task === "pickup") {
        if (
          t.pickup.length &&
          t.pickup[0].stage === "ready" &&
          this.order(t.pickup[0].order)?.team === t.id
        ) {
          w.pizza = t.pickup.shift();
          const c = this.order(w.pizza.order);
          w.target = c.id;
          w.task = "deliver";
          w.path = this.path(w, t.seats[c.seat].approach);
        } else w.task = "idle";
        return;
      }
      const c = this.order(w.target);
      if (!c || distance(w, t.seats[c.seat].approach) > 25) {
        w.task = "idle";
        return;
      }
      const completedTask = w.task;
      if (w.task === "accept") this.accept(c, t.id);
      else if (w.task === "deliver") {
        const item = w.pizza;
        w.pizza = null;
        this.deliver(item, t);
      }
      w.lastTask = completedTask;
      w.task = "idle";
      w.target = null;
    }
    alert(t, text, sound = "event") {
      t.alerts.push({ text, until: this.time + 4 });
      t.alerts = t.alerts.slice(-2);
      this.sounds.push(sound);
    }
    spawnVIP(count) {
      if (this.vips.length) return false;
      const r = this.random();
      count ??= r < 0.4 ? 1 : r < 0.75 ? 2 : r < 0.92 ? 3 : 4;
      count = clamp(Math.floor(count), 1, 4);
      this.vips = Array.from({ length: count }, (_, seat) => ({
        id: this.nextId++,
        team: -1,
        seat,
        name: "VIP " + (seat + 1),
        recipe: Math.floor(this.random() * 3),
        accepted: [],
        patience: 50,
        maxPatience: 50,
      }));
      this.vipBanner = 4;
      this.announce(
        count + " VIP guests arrived! Personal service only",
        "vip",
      );
      this.nextVIP = this.time + 60;
      return true;
    }
    releaseCook(t, a) {
      if (!a) return;
      a.slot = null;
      a.job = null;
      a.food = null;
      a.phase = "return";
      a.path = [];
      a.destination = null;
      a.state = "Returning to bench";
    }
    cookWalk(a, target, state, dt) {
      const key = target.x + "," + target.y;
      if (a.destination !== key) {
        a.path = this.path(a, target);
        a.destination = key;
      }
      a.state = state;
      if (a.path.length) {
        const next = a.path[0],
          d = distance(a, next) || 1;
        a.faceX = (next.x - a.x) / d;
        a.faceY = (next.y - a.y) / d;
        a.walk += dt * 12;
        this.travel(a, dt, 110);
      }
      return distance(a, target) < 22;
    }
    assistantStep(t, a, dt) {
      if (!a) return;
      const bench = t.stations.find((s) => s.type === "topping").workPoints[
        a.index
      ];
      const oven = t.stations.find((s) => s.type === "oven");
      const pickup = t.stations.find((s) => s.type === "serving").approach;
      if (a.job && !this.order(a.job.order)) this.releaseCook(t, a);
      if (!a.job) {
        if (!this.cookWalk(a, bench, "Returning to bench", dt)) return;
        const orders = t.customers
          .filter(
            (c) => this.accepted(c, t.id) && !this.pizzaExists(c.id, t.id),
          )
          .sort((a, b) => a.patience - b.patience);
        if (!orders.length) {
          a.state = "Waiting for orders";
          return;
        }
        const o = orders.find((c) =>
          Kitchen.recipes[c.recipe].items.every((k) => t.stock[k] > 0),
        );
        if (!o) {
          a.state = "Missing ingredients";
          return;
        }
        // Reserve and spend together. The reservation is metadata, never a second pizza.
        a.job = { order: o.id, recipe: o.recipe, left: 9 };
        a.food = {
          kind: "pizza",
          order: o.id,
          owner: t.id,
          recipe: o.recipe,
          stage: "preparing",
          added: Kitchen.recipes[o.recipe].items.filter((k) => k !== "dough"),
        };
        Kitchen.recipes[o.recipe].items.forEach((k) => t.stock[k]--);
        a.phase = "prep";
      }
      this.metrics.assistantBusy[t.id] += dt;
      if (a.phase === "prep") {
        a.job.left -= dt;
        a.state = a.job.left > 5 ? "Preparing dough" : "Assembling";
        if (a.job.left <= 0) {
          a.food.stage = "raw";
          a.phase = "oven";
          a.destination = null;
        }
        return;
      }
      if (a.phase === "oven") {
        // Reserve an empty slot while walking, so concurrent cooks choose distinct bays.
        if (
          a.slot == null ||
          t.ovens[a.slot] ||
          t.cooks.some(
            (c) => c !== a && c.phase === "oven" && c.slot === a.slot,
          )
        )
          a.slot = t.ovens.findIndex(
            (food, i) =>
              !food &&
              !t.cooks.some(
                (c) => c !== a && c.phase === "oven" && c.slot === i,
              ),
          );
        if (a.slot < 0) {
          a.slot = null;
          this.cookWalk(a, bench, "Waiting for oven", dt);
          return;
        }
        if (
          !this.cookWalk(
            a,
            oven.slots[a.slot].approach,
            "Carrying raw pizza to oven",
            dt,
          )
        )
          return;
        t.ovens[a.slot] = a.food;
        a.food = null;
        t.ovens[a.slot].stage = "baking";
        t.ovens[a.slot].timer = 3;
        a.phase = "bake";
        a.collectionLeft = 0.6;
        a.state = "Baking";
        this.record("cookLoaded", {
          id: t.id,
          order: a.job.order,
          slot: a.slot,
        });
        return;
      }
      if (a.phase === "bake") {
        const food = t.ovens[a.slot];
        if (food?.order !== a.job.order) {
          this.releaseCook(t, a);
          return;
        }
        if (food.stage === "burned") {
          t.ovens[a.slot] = null;
          this.alert(
            t,
            "Cook discarded burned food; order can be prepared again",
          );
          this.releaseCook(t, a);
          return;
        }
        a.state = "Baking";
        if (food.stage !== "ready") return;
        a.collectionLeft -= dt;
        if (
          a.collectionLeft > 0 ||
          !this.cookWalk(
            a,
            oven.slots[a.slot].approach,
            "Collecting baked pizza",
            dt,
          )
        )
          return;
        a.food = food;
        t.ovens[a.slot] = null;
        a.slot = null;
        a.phase = "pickup";
        a.destination = null;
        return;
      }
      if (a.phase === "pickup") {
        if (!this.cookWalk(a, pickup, "Carrying baked pizza to pickup", dt))
          return;
        if (a.food?.stage !== "ready") {
          this.releaseCook(t, a);
          return;
        }
        t.pickup.push(a.food);
        this.record("cookPickup", { id: t.id, order: a.job.order });
        this.releaseCook(t, a);
      }
    }

    makeStains(table) {
      const stains = [];
      for (let group = 0; group < 4; group++) {
        const cx = (this.random() - 0.5) * table.w * 0.65,
          cy = (this.random() - 0.5) * table.h * 0.55;
        for (let j = 0; j < 6; j++)
          stains.push({
            x: cx + (this.random() - 0.5) * table.w * 0.22,
            y: cy + (this.random() - 0.5) * 22,
            rx: 3 + this.random() * Math.min(22, table.w * 0.13),
            ry: 2 + this.random() * 12,
            angle: this.random() * Math.PI,
            tone: this.random(),
          });
      }
      for (let j = 0; j < 12; j++)
        stains.push({
          x: (this.random() - 0.5) * (table.w - 8),
          y: (this.random() - 0.5) * (table.h - 8),
          rx: 1 + this.random() * 3,
          ry: 1 + this.random() * 2,
          angle: this.random() * Math.PI,
          tone: this.random(),
        });
      return stains;
    }
    useItem(p) {
      if (!this.active() || p.stun || p.panel || p.prep || p.trapCD) return;
      if (p.hand?.kind === "banana") {
        this.trap(p);
        return;
      }
      if (p.hand?.kind === "flour") {
        this.projectiles.push({
          owner: p.id,
          x: p.x + p.faceX * 25,
          y: p.y + p.faceY * 25,
          dx: p.faceX,
          dy: p.faceY,
          life: 0.9,
        });
        p.hand = null;
        p.trapCD = 0.5;
        this.record("throw", { id: p.id });
        return;
      }
      if (p.hand?.kind === "bottle") {
        const targetTeam = this.mode === "tutorial" ? p.id : 1 - p.id,
          t = this.teams[targetTeam];
        const table = t.tables
          .filter(
            (s) =>
              !s.dirty &&
              s.protectedUntil <= this.time &&
              distance(p, s) < s.w / 2 + 85 &&
              (s.x - p.x) * p.faceX + (s.y - p.y) * p.faceY > 0 &&
              !t.customers.some((c) => t.seats[c.seat].table === s.index),
          )
          .sort(
            (a, b) =>
              distance(p, a.approach || a) - distance(p, b.approach || b),
          )[0];
        if (!table || t.tables.some((s) => s.dirty)) {
          this.say(
            p,
            "Face a completely empty rival table; one dirty table per restaurant",
          );
          return;
        }
        table.dirty = true;
        table.cleanProgress = 0;
        table.stains = this.makeStains(table);
        table.splashUntil = this.time + 0.7;
        p.hand = null;
        p.trapCD = 0.6;
        this.record("dirty", { id: p.id, team: t.id, table: table.index });
        this.alert(
          t,
          "Table " + (table.index + 1) + " dirty — hold interact to clean",
        );
        return;
      }
      this.say(
        p,
        p.hand?.kind === "pizza"
          ? "Use E / Enter at the exact guest or waiter pickup"
          : "Carry a banana, flour pouch or sabotage sauce first",
      );
    }
    projectileStep(dt) {
      for (const ball of this.projectiles) {
        ball.life -= dt;
        const steps = Math.max(1, Math.ceil((400 * dt) / 6));
        for (let i = 0; i < steps && ball.life > 0; i++) {
          ball.x += (ball.dx * 400 * dt) / steps;
          ball.y += (ball.dy * 400 * dt) / steps;
          if (this.solid(ball.x, ball.y, 7)) {
            ball.life = 0;
            break;
          }
          const victim = this.players[1 - ball.owner];
          if (distance(ball, victim) < 25) {
            ball.life = 0;
            if (!victim.flourImmune) {
              victim.flourTime = 2.6;
              victim.flourImmune = 6;
              this.record("flourHit", { id: ball.owner });
              this.sounds.push("flour");
            }
          }
        }
      }
      this.projectiles = this.projectiles.filter((b) => b.life > 0);
    }
    recovery(t) {
      const stock = { ...t.stock };
      for (const d of this.drops)
        if (d.owner === t.id && d.item.kind === "ingredient")
          stock[d.item.key]++;
      for (const r of this.rats)
        if (r.team === t.id && r.stolen) stock[r.stolen]++;
      const afford = (items) =>
        items.reduce(
          (sum, k) => sum + (stock[k] > 0 ? 0 : Kitchen.prices[k]),
          0,
        ) <= t.money;
      if (Kitchen.recipes.some((r) => afford(r.items))) return true;
      const p = this.players[t.id];
      const dishes = [
        p.hand,
        p.prep,
        ...t.ovens,
        ...t.pickup,
        t.waiter?.pizza,
        ...t.cooks.map((a) => a.food),
        ...this.drops.filter((d) => d.owner === t.id).map((d) => d.item),
      ];
      for (const dish of dishes) {
        if (
          !dish?.order ||
          dish.owner !== t.id ||
          !this.order(dish.order) ||
          dish.stage === "burned"
        )
          continue;
        const missing =
          dish.stage === "dough"
            ? Kitchen.recipes[dish.recipe].items.filter(
                (k) => k !== "dough" && !dish.added?.includes(k),
              )
            : [];
        if (afford(missing)) return true;
      }
      return false;
    }
    checkBankruptcy() {
      if (this.winner !== null) return;
      const bankrupt = this.teams.map((t) => !this.recovery(t));
      if (!bankrupt.some(Boolean)) return;
      this.winner = bankrupt.every(Boolean) ? -1 : bankrupt[0] ? 1 : 0;
      this.resultReason = bankrupt.every(Boolean)
        ? "Draw: both kitchens cannot recover service"
        : "Bankruptcy: " +
          (bankrupt[0] ? "Blue" : "Red") +
          " has no affordable recipe or recoverable paying dish";
      this.sounds.push("lost");
    }

    step(dt, inputs = [{}, {}]) {
      if (this.winner !== null) return;
      if (this.countdown > 0) {
        const before = Math.ceil(this.countdown - 0.6);
        this.countdown = Math.max(0, this.countdown - dt);
        if (Math.ceil(this.countdown - 0.6) !== before)
          this.sounds.push(this.countdown > 0.6 ? "count" : "go");
        return;
      }
      this.time += dt;
      this.vipBanner = Math.max(0, this.vipBanner - dt);
      this.noticeTime = Math.max(0, this.noticeTime - dt);
      for (const t of this.teams) {
        const nearDoor = [
          ...this.players.filter((p) => !p.hidden),
          ...t.customers,
          t.waiter,
          ...t.cooks,
        ]
          .filter(Boolean)
          .some((a) => distance(a, t.door) < 130);
        t.door.open += ((nearDoor ? 1 : 0) - t.door.open) * Math.min(1, dt * 9);
        t.signEnemyCD = Math.max(0, t.signEnemyCD - dt);
        t.signFX = Math.max(0, t.signFX - dt);
        t.history = t.history.filter((h) => h.until > this.time);
        t.alerts = t.alerts.filter((a) => a.until > this.time);
        t.ratCD = Math.max(0, t.ratCD - dt);
        t.starFX = Math.max(0, t.starFX - dt);
        for (const c of t.customers) {
          if (c.state === "entering") {
            if (this.travel(c, dt)) c.state = "waiting";
            continue;
          }
          if (c.departing) {
            this.travel(c, dt);
            continue;
          }
          if (this.mode !== "tutorial") c.patience -= dt;
          if (c.patience < 10 && !c.warned) {
            c.warned = true;
            this.alert(
              t,
              "Hurry: T" + (t.seats[c.seat].table + 1) + " · " + c.name,
              "warning",
            );
          }
          if (c.patience <= 0) {
            this.leave(t, c);
            t.lost++;
            t.rep = Math.max(0, t.rep - 5);
            this.alert(
              t,
              "−5 reputation · T" +
                (t.seats[c.seat].table + 1) +
                " / " +
                t.seats[c.seat].place +
                " left unhappy",
              "lost",
            );
            t.history.push({
              id: c.id,
              name: c.name,
              label: "Cancelled / Customer left",
              until: this.time + 4,
            });
            this.cancel(c.id);
          }
        }
        t.customers = t.customers.filter((c) => !c.departing || c.path.length);
        if (
          this.time >= t.nextCustomer &&
          t.customers.length < t.seats.length &&
          this.mode !== "tutorial"
        )
          this.addCustomer(t);
        for (const food of t.ovens.filter(Boolean)) {
          food.timer -= dt;
          if (food.stage === "baking" && food.timer <= 0) {
            food.stage = "ready";
            food.timer = 12;
            this.sounds.push("ready");
          } else if (food.stage === "ready" && food.timer <= 0)
            food.stage = "burned";
        }
        this.waiterStep(t, dt);
        for (const a of t.cooks) this.assistantStep(t, a, dt);
        if (this.winner !== null) return;
      }
      for (const v of [...this.vips]) {
        if (this.mode !== "tutorial") v.patience -= dt;
        if (v.patience <= 0) {
          this.vips = this.vips.filter((x) => x.id !== v.id);
          this.cancel(v.id);
          this.nextVIP = this.time + 45;
        }
      }
      if (
        !this.vips.length &&
        this.time >= this.nextVIP &&
        this.mode !== "tutorial"
      )
        this.spawnVIP();
      for (const p of this.players) {
        for (const k of [
          "stun",
          "immune",
          "trapCD",
          "messageTime",
          "flourTime",
          "flourImmune",
          "signBusy",
        ])
          p[k] = Math.max(0, p[k] - dt);
        if (p.prep) {
          p.prep.left -= dt;
          if (p.prep.left <= 0) {
            p.hand = p.prep;
            p.prep = null;
          }
        }
        if (p.stun) {
          this.move(p, p.knockX * dt, p.knockY * dt);
          continue;
        }
        if (p.cleaning) {
          const table = this.teams[p.id].tables[p.cleaning.table];
          if (
            !inputs[p.id]?.interact ||
            !table.dirty ||
            distance(p, table) > table.w / 2 + 90
          ) {
            table.cleanProgress = 0;
            p.cleaning = null;
          } else {
            p.cleaning.left -= dt;
            table.cleanProgress = 1 - p.cleaning.left / 2.5;
            if (p.cleaning.left <= 0) {
              table.dirty = false;
              table.stains = null;
              table.cleanProgress = 0;
              table.protectedUntil = this.time + 10;
              p.cleaning = null;
              this.record("clean", { id: p.id, table: table.index });
            }
          }
          continue;
        }
        if (p.panel || p.prep || p.signBusy) continue;
        const input = inputs[p.id] || {},
          d = Math.hypot(input.x || 0, input.y || 0);
        if (d) {
          p.faceX = input.x / d;
          p.faceY = input.y / d;
          p.walk += dt * 20;
          this.move(p, p.faceX * 235 * dt, p.faceY * 235 * dt);
        }
      }
      for (const trap of this.traps) {
        trap.life -= dt;
        const v = this.players[1 - trap.owner];
        if (trap.arm <= this.time && distance(v, trap) < 28 && !v.immune) {
          this.hit(v, v.faceX, v.faceY);
          trap.life = 0;
          this.sounds.push("slip");
        }
      }
      this.traps = this.traps.filter((t) => t.life > 0);
      this.drops = this.drops.filter((d) => (d.life -= dt) > 0);
      if (this.time >= this.nextRats && this.mode !== "tutorial") {
        this.invade(0);
        this.invade(1);
        this.nextRats = this.time + 70;
      }
      for (const r of this.rats) {
        if (r.delay > 0) {
          r.delay -= dt;
          continue;
        }
        const t = this.teams[r.team];
        if (r.phase === "in" && this.players.some((p) => distance(p, r) < 65)) {
          r.phase = "out";
          r.path = this.path(r, t.hole);
        }
        if (
          r.phase === "out" &&
          r.stolen &&
          this.players.some((p) => distance(p, r) < 65)
        ) {
          this.drops.push({
            x: r.x,
            y: r.y,
            item: { kind: "ingredient", key: r.stolen, owner: r.team },
            owner: r.team,
            unlock: this.time,
            life: 60,
          });
          r.stolen = null;
        }
        if (this.travel(r, dt, r.phase === "out" ? 160 : 90)) {
          if (r.phase === "in") {
            const storage = t.stations.find((s) => s.type === "storage");
            if (distance(r, storage.approach) < 25) {
              const key = Kitchen.stockKeys.find((k) => t.stock[k] > 0);
              if (key) {
                t.stock[key]--;
                r.stolen = key;
              }
            }
            r.phase = "out";
            r.path = this.path(r, t.hole);
          } else r.done = true;
        }
      }
      this.rats = this.rats.filter((r) => !r.done);
      this.projectileStep(dt);
      if (this.mode === "competitive") this.checkBankruptcy();
      this.tutorial?.update(dt);
    }
  }
  return { Game, distance };
})();
