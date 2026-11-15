"use strict";
// The instructor observes production transitions. It never awards money, marks a
// recipe complete or delivers a pizza on behalf of the learner.
class KitchenTutorial {
  constructor(game, onComplete) {
    this.game = game;
    this.onComplete = onComplete;
    this.steps = this.makeSteps();
    this.restart();
  }
  restart() {
    const g = this.game;
    g.reset("tutorial");
    g.tutorial = this;
    this.index = 0;
    this.done = false;
    this.started = 0;
    this.mark = 0;
    this.walked = 0;
    this.last = { ...g.players[0] };
    g.teams[0].money = 1000;
    g.teams[0].stock.cheese = 0;
    g.teams[1].customers = [];
    g.teams[1].open = false;
    g.players[1].hidden = true;
    this.guide = { path: [], goal: null };
    this.routeBuilds = 0;
    this.startStep();
  }
  events(type) {
    return this.game.events.filter(
      (e) => e.seq >= this.mark && e.type === type && e.id === 0,
    );
  }
  station(type) {
    const t = this.game.teams[0],
      station = t.stations.find((s) => s.type === type);
    if (type === "oven" && station) {
      const selected = this.game.players[0].selected;
      const slot = t.ovens.findIndex(
        (food) => food && (!selected || food.order === selected),
      );
      if (slot >= 0)
        return { ...station, approach: station.slots[slot].approach };
    }
    return station;
  }
  guest() {
    return this.game.teams[0].customers.find((c) => !c.departing);
  }
  guestTarget() {
    const c = this.guest();
    return c
      ? this.game.teams[0].seats[c.seat].approach
      : this.game.teams[0].entrance;
  }
  get step() {
    return this.steps[this.index];
  }
  missingIngredient() {
    const g = this.game,
      p = g.players[0],
      o = g.order(p.selected),
      food = p.hand || p.prep;
    if (
      !o ||
      !g.accepted(o, 0) ||
      g.teams[0].ovens.some(Boolean) ||
      ["raw", "ready"].includes(food?.stage)
    )
      return null;
    return Kitchen.recipes[o.recipe].items.find(
      (k) =>
        g.teams[0].stock[k] <= 0 &&
        !(food && (k === "dough" || food.added.includes(k))),
    );
  }
  get target() {
    const drop = this.game.drops.find(
      (d) => d.owner === 0 && d.item.kind !== "ingredient",
    );
    if (drop && !this.game.players[0].hand) return drop;
    if (
      ["ingredients", "auto-cook", "vip"].includes(this.step?.key) &&
      this.missingIngredient()
    )
      return this.station("supply");
    const target = this.step?.target;
    return typeof target === "function" ? target() : this.station(target);
  }
  startStep() {
    this.guide = { path: [], goal: null };
    this.accessCache = null;
    this.mark = this.game.eventSerial;
    this.started = this.game.time;
    this.step?.enter?.();
  }
  makeSteps() {
    const g = this.game,
      p = () => g.players[0],
      t = () => g.teams[0],
      hand = (stage) => p().hand?.stage === stage;
    return [
      {
        key: "move",
        text: "Welcome! Use WASD to walk. Your camera follows you; E interacts with nearby objects.",
        target: () => ({ x: 420, y: 650 }),
        test: () => this.walked > 120,
      },
      {
        key: "sign",
        text: "Follow the route to the real entrance door and its sign. Press E to close, then E again to reopen. Existing guests stay; new arrivals stop when Closed.",
        target: "sign",
        test: () => this.events("sign").length >= 2 && t().open,
      },
      {
        key: "greet",
        text: "Walk to the highlighted guest and press E. A question mark means they still need you to take their order.",
        target: () => this.guestTarget(),
        test: () => !!p().selected,
      },
      {
        key: "terminal",
        text: "Open Orders with E or I. Select your guest's order with WASD + E, or click Select. Each seat has its own order.",
        target: "terminal",
        test: () => this.events("select").length > 0,
      },
      {
        key: "inventory",
        text: "Inspect your stock: click the cheese icon in your HUD, or press I at Orders and select Inspect stock. Cheese is missing.",
        target: "terminal",
        test: () => this.events("inspect").length > 0,
      },
      {
        key: "buy",
        text: "At Supplies, buy one pack of cheese. Opening the shop is free. WASD selects; E buys; I closes your window.",
        target: "supply",
        test: () => this.events("buy").some((e) => e.key === "cheese"),
      },
      {
        key: "dough",
        text: "Close the shop with I. Visit Dough and press E with free hands. One dough is consumed; preparation takes 1.2 seconds.",
        target: "dough",
        test: () => hand("dough") || hand("raw") || !!t().ovens.some(Boolean),
      },
      {
        key: "ingredients",
        text: "At Toppings, add sauce and cheese. Click or drag onto dough, or select with WASD and press E. Added ingredients are spent once.",
        target: "topping",
        test: () =>
          (hand("dough") && p().hand.added.length === 2) ||
          hand("raw") ||
          !!t().ovens.some(Boolean),
      },
      {
        key: "raw",
        text: "Select Confirm assembly and activate it. This creates RAW pizza; it cannot earn money yet. I closes without losing additions.",
        target: "topping",
        test: () => hand("raw") || !!t().ovens.some(Boolean),
      },
      {
        key: "oven",
        text: "Take raw pizza to highlighted Oven slot 1 and press E. The central shared oven has four numbered slots, each with its own timer. Approach a slot from its side to use it.",
        target: "oven",
        test: () =>
          ["baking", "ready"].includes(t().ovens.find(Boolean)?.stage) ||
          hand("ready"),
      },
      {
        key: "collect",
        text: "Wait three seconds, then press E at Oven to collect. A cooked pizza burns after 12 seconds. Use Restart lesson above if needed.",
        target: "oven",
        test: () => hand("ready"),
      },
      {
        key: "serve",
        text: "Serve the exact highlighted guest with E. Only successful delivery gives coins and reputation; ten regular deliveries earn five stars.",
        target: () => this.guestTarget(),
        test: () => this.events("deliver").length > 0,
      },
      {
        key: "waiter",
        text: "Hire a waiter for 100 beside the kitchen wall. Watch them walk to our next guest and take the order. They move slower than you.",
        target: "waiter",
        enter: () => {
          g.addCustomer(t());
        },
        test: () =>
          !!t().waiter &&
          t().customers.some((c) => !c.departing && c.state === "accepted"),
      },
      {
        key: "auto-order",
        text: "The waiter accepted an order. Close Orders if open; at Dough, press E with empty hands. It assigns the most urgent unclaimed regular order automatically. Manual Select still has priority.",
        target: "dough",
        enter: () => {
          p().selected = null;
        },
        test: () => !!p().prep || hand("dough"),
      },
      {
        key: "auto-cook",
        text: "Finish this order: Toppings → confirm → Oven → collect → exact guest (or Pickup). No mandatory trip to Orders. Use the turquoise route; follow the highlighted button when a window is open.",
        target: () => {
          if (p().prep) return this.station("dough");
          if (t().ovens.some(Boolean)) return this.station("oven");
          if (hand("dough")) return this.station("topping");
          if (hand("raw")) return this.station("oven");
          if (hand("ready")) return this.guestTarget();
          return this.station("dough");
        },
        test: () => this.events("deliver").length > 0,
      },
      {
        key: "assistant",
        text: "Hire a cook for 180 at the kitchen hiring point (up to four). Each uses a separate preparation board and reserves a different regular order. Watch them prepare, walk to the shared oven, bake, and carry the finished pizza to the shared Pickup queue. The waiter then delivers it. You may also collect baked food yourself.",
        target: "assistant",
        enter: () => {
          g.addCustomer(t());
          this.staffOrder = null;
          this.staffLoaded = false;
          this.staffPlaced = false;
        },
        test: () => {
          const loaded = this.events("cookLoaded")[0];
          if (loaded) {
            this.staffOrder = loaded.order;
            this.staffLoaded = true;
          }
          if (
            this.events("cookPickup").some((e) => e.order === this.staffOrder)
          )
            this.staffPlaced = true;
          return (
            this.staffLoaded &&
            this.events("deliver").some((e) => e.order === this.staffOrder)
          );
        },
      },
      {
        key: "banana",
        text: "Visit the Blue gadget zone ABOVE the central VIP table. Buy a banana, carry it to clear floor near the training chef and press Q. Our dummy walks onto it after the warning. Food drops on a hit; immunity prevents stun chains.",
        target: () =>
          p().hand?.kind === "banana"
            ? { x: 570, y: 600 }
            : this.station("banana"),
        enter: () => {
          g.players[1].hidden = false;
          g.players[1].x = 650;
          g.players[1].y = 610;
          g.players[1].hand = {
            kind: "pizza",
            owner: 1,
            recipe: 0,
            stage: "raw",
            added: ["sauce", "cheese"],
          };
        },
        test: () =>
          g.events.some(
            (e) => e.seq >= this.mark && e.type === "hit" && e.id === 1,
          ),
      },
      {
        key: "flour",
        text: "Buy a flour pouch. Face the training chef, then press Q to throw. Only their view is obscured for 2.6s; movement stays active.",
        target: () =>
          p().hand?.kind === "flour" ? g.players[1] : this.station("flour"),
        enter: () => {
          g.players[1].x = 650;
          g.players[1].y = 610;
          g.players[1].stun = 0;
        },
        test: () => this.events("flourHit").length > 0,
      },
      {
        key: "sauce",
        text: "Buy the striped sabotage sauce bottle. Face the highlighted empty practice table and press Q. In competition only empty rival tables can be stained.",
        target: () =>
          p().hand?.kind === "bottle" ? t().tables[2] : this.station("bottle"),
        enter: () => {
          g.players[1].hidden = true;
        },
        test: () => this.events("dirty").length > 0,
      },
      {
        key: "clean",
        text: "Clean the dirty table: approach and HOLD E for 2.5 seconds. Dirty seats cannot accept guests. Cleaning grants ten seconds of protection.",
        target: () => t().tables.find((x) => x.dirty),
        test: () => this.events("clean").length > 0,
      },
      {
        key: "rats",
        text: "A rat wave is heading for Storage. Wait clear of the burrow; let a rat steal, approach it to scare it, then press E by the dropped ingredient to recover it.",
        target: () =>
          g.drops.find((d) => d.item.kind === "ingredient") ||
          g.rats.find((r) => r.stolen) || { x: 550, y: 270 },
        enter: () => {},
        test: () => this.events("recover").length > 0,
      },
      {
        key: "vip",
        text: "Personally greet the golden VIP, then cook and deliver their pizza. Staff cannot help with VIPs. Follow the route to Supplies if rats left an ingredient empty. Each guest awards 40 coins and 12 reputation once.",
        target: () => {
          const o = g.vip;
          if (!o) return g.vipSeats[0].approach;
          if (!o.accepted.includes(0)) return g.vipSeats[o.seat].approach;
          if (t().ovens.some(Boolean)) return this.station("oven");
          if (hand("ready")) return g.vipSeats[o.seat].approach;
          if (hand("raw")) return this.station("oven");
          if (hand("dough")) return this.station("topping");
          return this.station("dough");
        },
        enter: () => {
          g.spawnVIP(1);
        },
        test: () => this.events("deliver").some((e) => e.vip),
      },
    ];
  }
  // Recovery resets a whole meaningful lesson, not a pretend successful step.
  recover() {
    const key = this.step.key;
    const first = this.steps.findIndex((s) => s.key === "waiter"),
      last = this.steps.findIndex((s) => s.key === "assistant");
    const old = this.index;
    this.restart();
    this.game.teams[0].stock.cheese = 8;
    if (old < first) this.index = 2;
    else if (old <= last) this.index = first;
    else {
      this.game.teams[0].customers = [];
      this.index = this.steps.findIndex(
        (s) => s.key === (key === "clean" ? "sauce" : key),
      );
    }
    this.startStep();
  }
  get uiTarget() {
    if (this.done) return null;
    const p = this.game.players[0],
      key = this.step.key;
    if (key === "inventory")
      return p.panel === "terminal"
        ? '[data-action="inspect"]'
        : '[data-stock="cheese"]';
    if (!p.panel) return null;
    if (
      p.panel === "supply" &&
      ["ingredients", "auto-cook", "vip"].includes(key)
    ) {
      const missing = this.missingIngredient();
      return missing
        ? '[data-action="buy"][data-key="' + missing + '"]'
        : '[data-action="close"]';
    }
    if (key === "terminal" && p.panel === "terminal")
      return '[data-action="select"]';
    if (key === "buy" && p.panel === "supply")
      return '[data-action="buy"][data-key="cheese"]';
    if (
      ["ingredients", "raw", "auto-cook", "vip"].includes(key) &&
      p.panel === "assembly" &&
      p.hand
    ) {
      const missing = Kitchen.recipes[p.hand.recipe].items.find(
        (k) => k !== "dough" && !p.hand.added.includes(k),
      );
      return missing
        ? '[data-action="add"][data-key="' + missing + '"]'
        : '[data-action="confirm"]';
    }
    return '[data-action="close"]';
  }
  updateGuide() {
    if (this.done || this.uiTarget) {
      this.guide = { path: [], goal: null };
      return;
    }
    const g = this.game,
      p = g.players[0],
      raw = this.target;
    const accessKey = raw
      ? [raw.x, raw.y, raw.approach?.x, raw.approach?.y].join(",")
      : "none";
    if (this.accessCache?.key !== accessKey)
      this.accessCache = {
        key: accessKey,
        goal:
          raw === g.players[1]
            ? { x: raw.x - 80, y: raw.y }
            : g.accessPoint(raw, p),
      };
    let goal = this.accessCache.goal;
    if (!goal) {
      this.guide = { path: [], goal: null };
      return;
    }
    const key =
      this.step.key +
      ":" +
      Math.round(goal.x / 20) +
      "," +
      Math.round(goal.y / 20);
    const prev = this.guide;
    if (
      prev.key === key &&
      prev.from &&
      Math.hypot(p.x - prev.from.x, p.y - prev.from.y) < 45 &&
      g.time - prev.time < 1
    )
      return;
    if (prev.key === key && g.time - prev.time < 0.25) return;
    this.guide = {
      path: g.path(p, goal),
      goal,
      key,
      from: { x: p.x, y: p.y },
      time: g.time,
    };
    this.routeBuilds++;
  }
  input() {
    if (this.step?.key !== "banana") return {};
    const g = this.game,
      trap = g.traps.find((t) => t.owner === 0);
    if (!trap) return {};
    const p = g.players[1];
    return { x: trap.x - p.x, y: trap.y - p.y };
  }
  update(dt) {
    if (this.done) return;
    const p = this.game.players[0];
    this.walked += Math.hypot(p.x - this.last.x, p.y - this.last.y);
    this.last = { x: p.x, y: p.y };
    if (
      this.step.key === "rats" &&
      !this.game.rats.length &&
      !this.game.drops.some((d) => d.item.kind === "ingredient") &&
      Math.hypot(p.x - 550, p.y - 270) < 25
    )
      this.game.invade(0);
    const cooking = [
      "ingredients",
      "raw",
      "oven",
      "collect",
      "serve",
      "auto-cook",
    ];
    const order = this.guest();
    if (
      cooking.includes(this.step.key) &&
      order &&
      this.game.accepted(order, 0) &&
      !this.game.pizzaExists(order.id, 0)
    ) {
      this.index = this.steps.findIndex(
        (s) =>
          s.key === (this.step.key === "auto-cook" ? "auto-order" : "dough"),
      );
      this.startStep();
    }
    this.updateGuide();
    if (this.step.test()) {
      this.index++;
      if (this.index >= this.steps.length) {
        this.done = true;
        this.onComplete?.();
        return;
      }
      this.startStep();
      this.updateGuide();
    }
  }
}
