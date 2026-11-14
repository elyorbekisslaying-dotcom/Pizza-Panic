const assert = require("node:assert/strict");
const {
  Game,
  K,
  tick,
  at,
  visit,
  greet,
  cook,
  fresh,
} = require("./helpers.cjs");
let n = 0;
const test = (name, fn) => {
  fn();
  n++;
  console.log("PASS", name);
};
test("countdown freezes all world state and rejects every action before GO", () => {
  const g = new Game(),
    p = g.players[0];
  const snapshot = JSON.stringify({
    time: g.time,
    teams: g.teams,
    players: g.players,
  });
  g.interact(p);
  g.punch(p);
  g.dash(p);
  p.panel = "supply";
  assert(!g.buy(p, "cheese"));
  p.panel = null;
  tick(g, 3, [{ x: 1, y: 0 }, {}]);
  assert.equal(
    JSON.stringify({ time: g.time, teams: g.teams, players: g.players }),
    snapshot,
  );
  assert(g.countdown > 0);
  tick(g, 1);
  assert(g.time > 0);
});
test("2/4/6 tables expose twelve distinct collision-safe seats and four VIP approaches", () => {
  const g = fresh();
  for (const t of g.teams) {
    assert.deepEqual(
      Array.from(t.tables, (x) => x.capacity),
      [2, 4, 6],
    );
    assert.equal(t.seats.length, 12);
    for (let i = 0; i < 11; i++) g.addCustomer(t);
    assert.equal(t.customers.length, 12);
    assert.equal(new Set(t.customers.map((c) => c.seat)).size, 12);
    for (const s of t.seats) assert(g.path(g.players[t.id], s.approach).length);
  }
  for (const s of g.vipSeats) assert(g.path(g.players[0], s.approach).length);
});
test("owner and rival sign flips preserve entered guests, throttle sabotage and avoid arrival bursts", () => {
  const g = fresh(),
    t = g.teams[0],
    p = at(g, 0, "sign");
  g.interact(p);
  assert(!t.open);
  const count = t.customers.length;
  tick(g, 20);
  assert.equal(t.customers.length, count);
  assert.equal(t.customers[0].state, "waiting");
  g.interact(p);
  assert(t.open);
  tick(g, 1);
  assert.equal(t.customers.length, count);
  const r = g.players[1],
    s = t.stations.find((s) => s.type === "sign");
  r.x = s.x;
  r.y = s.y + 70;
  g.interact(r);
  assert(!t.open);
  tick(g, 0.4);
  g.interact(r);
  assert(!t.open);
  g.interact(p);
  assert(t.open);
  assert.equal(t.rep, 0);
});
test("assistant atomically claims one accepted order and never duplicates manual work", () => {
  for (const assistantFirst of [false, true]) {
    const g = fresh(),
      t = g.teams[0];
    tick(g, 8);
    const o = greet(g, 0);
    t.money = 500;
    visit(g, 0, "assistant");
    const stock = t.stock.dough;
    if (assistantFirst) {
      g.assistantStep(t, 0.01);
      visit(g, 0, "dough");
      assert(!g.players[0].prep);
      assert(t.assistant.job);
    } else {
      visit(g, 0, "dough");
      g.assistantStep(t, 0.01);
      assert(g.players[0].prep);
      assert(!t.assistant.job);
    }
    assert.equal(t.stock.dough, stock - 1);
    assert.equal(t.rep, 0);
    o.patience = 0.001;
    tick(g, 0.02);
    assert(!t.assistant.job);
    assert(!g.players[0].prep);
  }
});
test("assistant waits for accepted orders/ingredients/pickup; raw output is not money", () => {
  const g = fresh(),
    t = g.teams[0];
  t.money = 300;
  visit(g, 0, "assistant");
  tick(g, 8);
  assert.equal(t.assistant.state, "Waiting for orders");
  const o = greet(g, 0);
  t.stock.cheese = 0;
  tick(g, 0.1);
  assert.equal(t.assistant.state, "Missing ingredients");
  t.stock.cheese = 1;
  tick(g, 0.1);
  assert(t.assistant.job);
  const cash = t.money;
  tick(g, 9);
  assert.equal(t.assistantOutput.stage, "raw");
  assert.equal(t.money, cash);
  const dough = t.stock.dough;
  tick(g, 10);
  assert.equal(t.stock.dough, dough);
  assert.equal(t.assistant.state, "Waiting for pickup");
  visit(g, 0, "assistant");
  assert.equal(g.players[0].hand.stage, "raw");
  assert(!g.deliver(g.players[0].hand, t));
  g.spawnVIP(1);
  g.vips[0].accepted.push(0);
  assert(!t.assistant.job);
});
test("waiter finishes committed task, pauses at recipient and never rewards during travel", () => {
  const g = fresh(),
    t = g.teams[0];
  tick(g, 8);
  t.money = 500;
  visit(g, 0, "waiter");
  tick(g, 0.1);
  const target = t.waiter.target;
  assert(target);
  const o = g.order(target);
  g.accept(o, 0);
  g.players[0].selected = o.id;
  cook(g, 0);
  visit(g, 0, "serving");
  const cash = t.money;
  assert(t.pickup || t.waiter.pizza);
  if (t.waiter.task === "accept") assert.equal(t.waiter.target, target);
  let sawPause = false;
  for (let i = 0; i < 3000 && t.rep === 0; i++) {
    g.step(1 / 120);
    if (t.waiter.task === "deliver" && t.waiter.service > 0) {
      sawPause = true;
      assert.equal(t.money, cash);
    }
  }
  assert(sawPause);
  assert.equal(t.rep, 10);
});
test("cancellation clears every food holder, assistant reservation and assembly window without refunds", () => {
  for (const stage of [
    "prep",
    "dough",
    "assembly",
    "raw",
    "baking",
    "ready",
    "pickup",
    "carried",
    "drop",
    "assistant",
    "output",
  ]) {
    const g = fresh(),
      t = g.teams[0];
    tick(g, 8);
    const o = greet(g, 0),
      p = g.players[0];
    if (stage === "assistant" || stage === "output") {
      t.money = 300;
      visit(g, 0, "assistant");
      tick(g, stage === "output" ? 9.1 : 0.1);
    } else {
      visit(g, 0, "dough");
      if (stage !== "prep") tick(g, 1.3);
      if (
        [
          "assembly",
          "raw",
          "baking",
          "ready",
          "pickup",
          "carried",
          "drop",
        ].includes(stage)
      ) {
        visit(g, 0, "topping");
        g.addIngredient(p, "sauce");
        if (stage !== "assembly") {
          g.addIngredient(p, "cheese");
          g.assemble(p);
        }
      }
      if (["baking", "ready", "pickup", "carried", "drop"].includes(stage)) {
        visit(g, 0, "oven");
        if (stage !== "baking") {
          tick(g, 3.1);
          if (stage !== "ready") g.interact(p);
        }
      }
      if (["pickup", "carried"].includes(stage)) {
        t.money = 300;
        visit(g, 0, "waiter");
        visit(g, 0, "serving");
        if (stage === "carried") {
          for (let i = 0; i < 3000 && !t.waiter.pizza; i++) g.step(1 / 120);
        }
      }
      if (stage === "drop") g.drop(p);
    }
    const stock = JSON.stringify(t.stock),
      cash = t.money;
    o.patience = 0.001;
    tick(g, 0.02);
    assert(!g.order(o.id), stage);
    assert(!g.pizzaExists(o.id, 0), stage);
    assert(!p.panel, stage);
    assert.equal(t.money, cash);
    assert.equal(JSON.stringify(t.stock), stock);
    assert.equal(t.rep, 0);
    assert(t.history.some((h) => h.label.includes("Cancelled")));
  }
});
test("flour moves, collides, affects only opponent without stun/drop and cannot stack", () => {
  const g = fresh(),
    p = g.players[0],
    r = g.players[1];
  p.x = 950;
  p.y = 900;
  p.faceX = 1;
  p.faceY = 0;
  r.x = 1100;
  r.y = 900;
  r.hand = { kind: "banana", owner: 1 };
  p.hand = { kind: "flour", owner: 0 };
  g.useItem(p);
  assert.equal(g.projectiles.length, 1);
  tick(g, 0.1);
  assert.equal(r.flourTime, 0);
  tick(g, 0.3);
  assert(r.flourTime > 0);
  assert(r.hand);
  assert.equal(r.stun, 0);
  assert.equal(p.flourTime, 0);
  const time = r.flourTime;
  p.trapCD = 0;
  p.hand = { kind: "flour", owner: 0 };
  g.useItem(p);
  tick(g, 0.4);
  assert(r.flourTime < time);
  p.x = 140;
  p.y = 210;
  p.faceX = 0;
  p.faceY = -1;
  p.trapCD = 0;
  p.hand = { kind: "flour", owner: 0 };
  g.useItem(p);
  tick(g, 0.2);
  assert(!g.projectiles.length);
  g.reset();
  assert(!g.projectiles.length);
  assert(g.players.every((p) => !p.flourTime));
});
test("sauce requires an empty rival table, blocks exact capacity, cleans only while held and protects after cleaning", () => {
  const g = fresh(),
    t = g.teams[0],
    p = g.players[1],
    table = t.tables[2];
  p.x = table.x;
  p.y = 695;
  p.faceX = 0;
  p.faceY = 1;
  p.hand = { kind: "bottle", owner: 1 };
  g.useItem(p);
  assert(table.dirty);
  assert(!p.hand);
  for (let i = 0; i < 20; i++) g.addCustomer(t);
  assert.equal(t.customers.length, 6);
  assert(!t.customers.some((c) => t.seats[c.seat].table === 2));
  const owner = g.players[0];
  owner.x = table.x;
  owner.y = 695;
  g.interact(owner);
  tick(g, 1, [{ interact: true }, {}]);
  assert(table.dirty);
  tick(g, 0.1);
  assert(!owner.cleaning);
  g.interact(owner);
  tick(g, 2.6, [{ interact: true }, {}]);
  assert(!table.dirty);
  p.trapCD = 0;
  p.hand = { kind: "bottle", owner: 1 };
  g.useItem(p);
  assert(p.hand);
  assert(!table.dirty);
  tick(g, 11);
  g.addCustomer(t);
  p.trapCD = 0;
  g.useItem(p);
  assert(p.hand, "incoming guest protects assigned table");
});
test("VIP groups 1–4 keep independent orders; one payment clears only its competitors", () => {
  for (let count = 1; count <= 4; count++) {
    const g = fresh();
    g.spawnVIP(count);
    assert.equal(g.vips.length, count);
    assert.equal(new Set(g.vips.map((v) => v.id)).size, count);
    const first = g.vips[0];
    greet(g, 0, first);
    greet(g, 1, first);
    cook(g, 0);
    cook(g, 1);
    const losing = g.players[1].hand,
      cash = g.teams[0].money;
    greet(g, 0, first);
    assert.equal(g.teams[0].rep, 12);
    assert(g.teams[0].money - cash <= 43);
    assert(!g.players[1].hand);
    assert(!g.deliver(losing, g.teams[1]));
    assert.equal(g.vips.length, count - 1);
    for (const other of g.vips) assert(g.order(other.id));
  }
});
test("bankruptcy includes affordable packs, all useful work and recoverable theft; simultaneous loss is a draw", () => {
  function empty() {
    const g = fresh();
    for (const t of g.teams) {
      t.money = 0;
      K.stockKeys.forEach((k) => (t.stock[k] = 0));
    }
    return g;
  }
  let g = empty();
  g.teams[0].stock = {
    dough: 1,
    sauce: 1,
    cheese: 1,
    pepperoni: 0,
    vegetables: 0,
  };
  g.checkBankruptcy();
  assert.equal(g.winner, 0);
  g = empty();
  g.teams[0].money = 26;
  assert(g.recovery(g.teams[0]));
  g = empty();
  g.teams[0].stock.dough = 1;
  g.teams[0].stock.sauce = 1;
  g.rats.push({ team: 0, stolen: "cheese" });
  assert(g.recovery(g.teams[0]));
  g.rats = [];
  g.drops.push({ owner: 0, item: { kind: "ingredient", key: "cheese" } });
  assert(g.recovery(g.teams[0]));
  g = empty();
  g.checkBankruptcy();
  assert.equal(g.winner, -1);
  g = fresh();
  tick(g, 8);
  greet(g, 0);
  cook(g, 0);
  g.teams[0].money = 0;
  K.stockKeys.forEach((k) => (g.teams[0].stock[k] = 0));
  assert(g.recovery(g.teams[0]));
  g.teams[0].open = false;
  g.checkBankruptcy();
  assert.equal(g.winner, null);
  const item = g.players[0].hand;
  g.teams[0].waiter = { pizza: item };
  g.players[0].hand = null;
  assert(g.recovery(g.teams[0]));
  item.stage = "burned";
  assert(!g.recovery(g.teams[0]));
});
test("departing guests walk to a navigable entrance; dissatisfaction is charged once", () => {
  const g = fresh(),
    t = g.teams[0];
  tick(g, 8);
  const c = t.customers[0];
  t.rep = 20;
  c.patience = 0.001;
  assert(g.path(c, t.entrance).length);
  tick(g, 0.02);
  assert(c.departing);
  assert(c.path.length);
  assert.equal(t.rep, 15);
  const before = { x: c.x, y: c.y };
  tick(g, 1);
  assert(Math.hypot(c.x - before.x, c.y - before.y) > 20);
  assert(t.customers.includes(c));
  assert.equal(t.rep, 15);
  tick(g, 10);
  assert(!t.customers.includes(c));
  assert.equal(t.rep, 15);
});
console.log(n + " jam regression groups passed");
