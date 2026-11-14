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
    this.startStep();
  }
  events(type) {
    return this.game.events.filter(
      (e) => e.seq >= this.mark && e.type === type && e.id === 0,
    );
  }
  station(type) {
    return this.game.teams[0].stations.find((s) => s.type === type);
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
  get target() {
    const target = this.step?.target;
    return typeof target === "function" ? target() : this.station(target);
  }
  startStep() {
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
        text: "Visit the entrance sign. Press E to close, then E again to reopen. Existing guests stay; new arrivals stop when Closed.",
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
        test: () => hand("dough"),
      },
      {
        key: "ingredients",
        text: "At Toppings, add sauce and cheese. Click or drag onto dough, or select with WASD and press E. Added ingredients are spent once.",
        target: "topping",
        test: () => hand("dough") && p().hand.added.length === 2,
      },
      {
        key: "raw",
        text: "Select Confirm assembly and activate it. This creates RAW pizza; it cannot earn money yet. I closes without losing additions.",
        target: "topping",
        test: () => hand("raw"),
      },
      {
        key: "oven",
        text: "Take the raw pizza to Oven and press E. Only the oven can turn it into baked food.",
        target: "oven",
        test: () => t().oven?.stage === "baking",
      },
      {
        key: "collect",
        text: "Wait three seconds, then press E at Oven to collect. A cooked pizza burns after 12 seconds. Restart lesson below if needed.",
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
        text: "Hire a waiter for 100 at the purple staff counter. Watch them walk to our next guest and take the order. They move slower than you.",
        target: "waiter",
        enter: () => {
          g.addCustomer(t());
        },
        test: () =>
          !!t().waiter &&
          t().customers.some((c) => !c.departing && c.state === "accepted"),
      },
      {
        key: "assistant",
        text: "Hire the assistant for 180. They reserve one accepted regular order, spend real ingredients and take nine seconds to assemble raw food.",
        target: "assistant",
        test: () => !!t().assistantOutput,
      },
      {
        key: "assistant-pickup",
        text: "Collect the RAW pizza at Assistant with E. The assistant cannot bake, serve, shop or handle VIPs. You remain the chef.",
        target: "assistant",
        test: () => this.events("assistantPickup").length > 0,
      },
      {
        key: "staff-bake",
        text: "Load this raw pizza into Oven, wait, then collect it. Staff never turn raw food into a paid order.",
        target: "oven",
        test: () => hand("ready"),
      },
      {
        key: "staff-deliver",
        text: "Press E at Waiter pickup to hand over the baked pizza. Watch the waiter carry it to the exact guest and finish delivery.",
        target: "serving",
        test: () => this.events("deliver").length > 0,
      },
      {
        key: "banana",
        text: "Buy a banana, carry it to clear floor near the training chef and press Q. Our dummy walks onto it after the warning. Food drops on a hit; immunity prevents stun chains.",
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
          g.rats.find((r) => r.stolen) || { x: 650, y: 400 },
        enter: () => {},
        test: () => this.events("recover").length > 0,
      },
      {
        key: "vip",
        text: "Personally greet the golden VIP, then cook and deliver their pizza. Staff cannot help with VIPs. Each guest awards 40 coins and 12 reputation once.",
        target: () => {
          const o = g.vip;
          if (!o) return g.vipSeats[0].approach;
          if (!o.accepted.includes(0)) return g.vipSeats[o.seat].approach;
          if (t().oven) return this.station("oven");
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
    const index = this.index;
    if (index <= 11) {
      this.restart();
      this.index = 2;
      this.game.teams[0].stock.cheese = 4;
      this.startStep();
      return;
    }
    if (index <= 16) {
      this.restart();
      this.index = 12;
      this.game.teams[0].stock.cheese = 8;
      this.startStep();
      return;
    }
    this.restart();
    this.game.teams[0].stock.cheese = 8;
    this.game.teams[0].customers = [];
    this.index = index;
    this.startStep();
    if (index === 20) {
      this.index = 19;
      this.startStep();
    }
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
      Math.hypot(p.x - 650, p.y - 400) < 25
    )
      this.game.invade(0);
    if (this.step.test()) {
      this.index++;
      if (this.index >= this.steps.length) {
        this.done = true;
        this.onComplete?.();
        return;
      }
      this.startStep();
    }
  }
}
