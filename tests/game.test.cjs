const fs = require("node:fs"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const context = vm.createContext({ console });
for (const f of ["orders", "game"])
  vm.runInContext(
    fs.readFileSync(__dirname + "/../js/" + f + ".js", "utf8"),
    context,
  );
const { Game, K } = vm.runInContext(
  "({Game:RivalGame.Game,K:Kitchen})",
  context,
);
let count = 0;
const test = (name, fn) => {
  fn();
  count++;
  console.log("PASS " + name);
};
function setup() {
  const g = new Game(() => 0.1);
  g.countdown = 0;
  g.nextRats = Infinity;
  g.nextVIP = Infinity;
  return g;
}
function tick(g, s, input) {
  for (let i = 0; i < Math.ceil(s * 120); i++) g.step(1 / 120, input);
}
function at(g, id, type) {
  const p = g.players[id],
    s = g.teams[id].stations.find((s) => s.type === type);
  p.x = s.x;
  p.y = s.y + 70;
  p.panel = null;
  return p;
}
function greet(g, id, seat = 0) {
  tick(g, 8);
  const t = g.teams[id],
    p = g.players[id],
    s = t.seats[seat];
  p.x = s.approach.x;
  p.y = s.approach.y;
  g.interact(p);
  assert(p.selected);
  return g.order(p.selected);
}
function cook(g, id) {
  const p = g.players[id];
  at(g, id, "dough");
  g.interact(p);
  tick(g, 1.3);
  assert.equal(p.hand.stage, "dough");
  at(g, id, "topping");
  g.interact(p);
  for (const k of K.recipes[p.hand.recipe].items.filter((k) => k !== "dough"))
    assert(g.addIngredient(p, k));
  assert(g.assemble(p));
  assert.equal(p.hand.stage, "raw");
  at(g, id, "oven");
  g.interact(p);
  tick(g, 3.1);
  g.interact(p);
  assert.equal(p.hand.stage, "ready");
  return p.hand;
}
function serve(g, id, o) {
  const p = g.players[id],
    s = g.teams[id].seats[o.seat];
  p.x = s.approach.x;
  p.y = s.approach.y;
  g.interact(p);
}
test("one kitchen: guest enters, waits, accepts once, cooks and pays only on delivery", () => {
  const g = setup(),
    t = g.teams[0],
    p = g.players[0];
  assert.equal(t.customers[0].state, "entering");
  tick(g, 8);
  assert.equal(t.customers[0].state, "waiting");
  assert(!p.selected);
  at(g, 0, "dough");
  g.interact(p);
  assert(!p.prep);
  const o = greet(g, 0);
  assert.equal(o.state, "accepted");
  o.patience = 75;
  g.interact(p);
  assert.equal(o.patience, 75);
  const money = t.money,
    item = cook(g, 0);
  assert.equal(t.money, money);
  serve(g, 0, o);
  assert(t.money > money);
  assert.equal(t.rep, 10);
  assert(!g.deliver(item, t));
  assert.equal(t.rep, 10);
});
test("same complete cooking and delivery system for red", () => {
  const g = setup(),
    o = greet(g, 1);
  cook(g, 1);
  serve(g, 1, o);
  assert.equal(g.teams[1].rep, 10);
  assert.equal(g.teams[0].rep, 0);
});
test("three tables, six independent seats; duplicate acceptance and timers", () => {
  const g = setup(),
    t = g.teams[0];
  for (let i = 0; i < 5; i++) g.addCustomer(t);
  tick(g, 8);
  assert.equal(t.tables.length, 3);
  assert.equal(t.customers.length, 6);
  assert.equal(new Set(t.customers.map((c) => c.seat)).size, 6);
  assert.equal(new Set(t.customers.map((c) => c.id)).size, 6);
  const c = t.customers[0];
  c.patience = 0.1;
  assert(g.accept(c, 0));
  assert.equal(c.patience, 115);
  c.patience = 42;
  assert(!g.accept(c, 0));
  assert.equal(c.patience, 42);
  assert(!g.accept(t.customers[1], 1));
});
test("all stations and all seats have collision-safe routes in both kitchens", () => {
  const g = setup();
  for (const t of g.teams)
    for (const s of [...t.stations, ...t.seats]) {
      const target = s.approach || { x: s.x, y: s.y + 70 };
      const path = g.path(g.players[t.id], target);
      assert(path.length, s.type);
      for (const p of path) assert(!g.solid(p.x, p.y, 12), s.type);
    }
});
test("supplies opening is free; explicit individual purchases; no free aid", () => {
  const g = setup(),
    t = g.teams[0],
    p = at(g, 0, "supply");
  g.interact(p);
  assert.equal(t.money, 60);
  for (const k of K.stockKeys) {
    const cash = t.money;
    assert(g.buy(p, k));
    assert.equal(t.money, cash - K.prices[k]);
    assert.equal(t.stock[k], 8);
  }
  t.money = 0;
  const amount = t.stock.cheese;
  assert(!g.buy(p, "cheese"));
  assert.equal(t.stock.cheese, amount);
  assert.equal(typeof g.aid, "undefined");
});
test("assembly spends once, rejects extra/wrong/zero stock; closing and interrupted dough preserve additions", () => {
  const g = setup();
  greet(g, 0);
  const p = at(g, 0, "dough");
  g.interact(p);
  tick(g, 1.3);
  at(g, 0, "topping");
  g.interact(p);
  const t = g.teams[0],
    before = t.stock.sauce;
  assert(!g.addIngredient(p, "pepperoni"));
  assert(g.addIngredient(p, "sauce"));
  assert(!g.addIngredient(p, "sauce"));
  assert.equal(t.stock.sauce, before - 1);
  p.panel = null;
  g.interact(p);
  assert(p.hand.added.includes("sauce"));
  t.stock.cheese = 0;
  assert(!g.addIngredient(p, "cheese"));
  assert(!g.assemble(p));
  g.hit(p, 1, 0);
  assert(!p.panel);
  assert(!p.hand);
  tick(g, 0.7);
  p.x = g.drops[0].x;
  p.y = g.drops[0].y;
  g.interact(p);
  assert(p.hand.added.includes("sauce"));
  assert.equal(t.stock.sauce, before - 1);
});
test("waiter takes orders by walking and accepts only explicitly transferred baked pizza", () => {
  const g = setup(),
    t = g.teams[0];
  t.money = 1000;
  const p = at(g, 0, "waiter");
  g.interact(p);
  assert(t.waiter);
  const initial = { x: t.waiter.x, y: t.waiter.y };
  tick(g, 14);
  const o = t.customers[0];
  assert.equal(o.state, "accepted");
  assert(Math.hypot(t.waiter.x - initial.x, t.waiter.y - initial.y) > 100);
  p.selected = o.id;
  at(g, 0, "dough");
  g.interact(p);
  tick(g, 1.3);
  at(g, 0, "serving");
  const cash = t.money;
  g.interact(p);
  assert(!t.pickup);
  assert.equal(p.hand.stage, "dough");
  at(g, 0, "topping");
  g.interact(p);
  for (const k of ["sauce", "cheese"]) g.addIngredient(p, k);
  g.assemble(p);
  at(g, 0, "serving");
  g.interact(p);
  assert(!t.pickup);
  assert.equal(t.money, cash);
  at(g, 0, "oven");
  g.interact(p);
  tick(g, 3.1);
  g.interact(p);
  at(g, 0, "serving");
  g.interact(p);
  assert(t.pickup);
  assert(!p.hand);
  assert.equal(t.money, cash);
  let elapsed = 0;
  while (t.rep === 0 && elapsed < 25) {
    tick(g, 0.1);
    elapsed += 0.1;
    if (t.waiter.task === "deliver")
      assert(!g.solid(t.waiter.x, t.waiter.y, 11));
  }
  assert.equal(t.rep, 10);
  assert(elapsed > 1);
  assert(
    Math.hypot(
      t.waiter.x - t.seats[0].approach.x,
      t.waiter.y - t.seats[0].approach.y,
    ) < 25,
  );
});
test("expired waiter task clears without reward or hanging", () => {
  const g = setup(),
    t = g.teams[0],
    o = greet(g, 0);
  cook(g, 0);
  t.money = 1000;
  at(g, 0, "waiter");
  g.interact(g.players[0]);
  at(g, 0, "serving");
  g.interact(g.players[0]);
  o.patience = 0.01;
  const cash = t.money;
  tick(g, 0.2);
  assert.equal(t.rep, 0);
  assert.equal(t.money, cash);
  assert(!t.pickup);
  assert(!t.waiter.pizza);
  assert.notEqual(t.waiter.target, o.id);
});
test("raw, burned, wrong recipe, wrong owner and wrong seat never pay", () => {
  const g = setup(),
    o = greet(g, 0),
    t = g.teams[0];
  for (const patch of [
    { stage: "raw" },
    { stage: "burned" },
    { owner: 1 },
    { recipe: 2 },
  ])
    assert(
      !g.deliver(
        { order: o.id, owner: 0, recipe: o.recipe, stage: "ready", ...patch },
        t,
      ),
    );
  const pizza = cook(g, 0);
  g.addCustomer(t);
  tick(g, 7);
  const other = t.customers.find((c) => c.id !== o.id);
  g.accept(other, 0);
  const p = g.players[0],
    s = t.seats[other.seat];
  p.x = s.approach.x;
  p.y = s.approach.y;
  g.interact(p);
  assert.equal(t.rep, 0);
  assert.equal(p.hand, pizza);
});
test("oven burns and cancelled food clears every holder", () => {
  const g = setup(),
    o = greet(g, 0);
  cook(g, 0);
  const p = g.players[0];
  g.drop(p);
  o.patience = 0.01;
  tick(g, 0.1);
  assert(!g.drops.length);
  const h = setup();
  greet(h, 0);
  cook(h, 0);
  const t = h.teams[0];
  t.oven = h.players[0].hand;
  h.players[0].hand = null;
  tick(h, 13);
  assert.equal(t.oven.stage, "burned");
  assert(!h.deliver(t.oven, t));
  at(h, 0, "oven");
  h.interact(h.players[0]);
  assert(!t.oven);
});
test("bananas occupy hands, purchase respects food, warning and owner immunity", () => {
  const g = setup(),
    t = g.teams[0],
    p = at(g, 0, "banana");
  g.interact(p);
  assert.equal(p.hand.kind, "banana");
  assert.equal(t.money, 48);
  g.interact(p);
  assert.equal(t.money, 48);
  p.x = 500;
  p.y = 600;
  p.faceX = 1;
  p.faceY = 0;
  g.trap(p);
  assert(!p.hand);
  assert.equal(g.traps.length, 1);
  p.x = 530;
  tick(g, 1.3);
  assert.equal(p.stun, 0);
  const r = g.players[1];
  r.x = 530;
  r.y = 600;
  tick(g, 0.02);
  assert(r.stun > 0);
  assert.equal(g.traps.length, 0);
  p.immune = 0;
  p.x = 140;
  p.y = 210;
  p.faceX = 0;
  p.faceY = -1;
  p.hand = { kind: "banana", owner: 0 };
  p.trapCD = 0;
  g.trap(p);
  assert(p.hand);
  assert.equal(g.traps.length, 0);
});
test("rolling pin hits only short forward sector during active frames; no repeated hit", () => {
  for (const [x, y] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [Math.SQRT1_2, Math.SQRT1_2],
  ]) {
    const g = setup(),
      p = g.players[0],
      r = g.players[1];
    p.x = 1000;
    p.y = 900;
    p.faceX = x;
    p.faceY = y;
    r.x = p.x + x * 52;
    r.y = p.y + y * 52;
    g.punch(p);
    assert.equal(r.immune, 0);
    tick(g, 0.1);
    assert.equal(r.immune, 0);
    tick(g, 0.05);
    assert(r.immune > 0);
    const immune = r.immune;
    tick(g, 0.1);
    assert(r.immune < immune);
  }
  for (const offset of [
    [-40, 0],
    [80, 0],
    [30, 35],
  ]) {
    const g = setup(),
      p = g.players[0],
      r = g.players[1];
    p.x = 1000;
    p.y = 900;
    p.faceX = 1;
    p.faceY = 0;
    r.x = p.x + offset[0];
    r.y = p.y + offset[1];
    g.punch(p);
    tick(g, 0.3);
    assert.equal(r.immune, 0);
  }
});
test("rats navigate from burrow to storage and exit with at most four stolen units", () => {
  const g = setup(),
    t = g.teams[0];
  g.players[0].x = 420;
  g.players[0].y = 600;
  const before = K.stockKeys.reduce((s, k) => s + t.stock[k], 0);
  assert(g.invade(0));
  assert(!g.invade(0));
  assert.equal(g.rats.length, 4);
  let stolen = false;
  for (let i = 0; i < 1500; i++) {
    g.step(1 / 120);
    for (const r of g.rats) {
      assert(!g.solid(r.x, r.y, 10));
      if (r.stolen) stolen = true;
    }
  }
  assert(stolen);
  assert.equal(g.rats.length, 0);
  assert.equal(before - K.stockKeys.reduce((s, k) => s + t.stock[k], 0), 4);
});
test("scared rats drop stolen real stock exactly once; owner recovers it", () => {
  const g = setup(),
    t = g.teams[0],
    p = g.players[0];
  g.invade(0);
  let r;
  for (let i = 0; i < 1200; i++) {
    g.step(1 / 120);
    r = g.rats.find((r) => r.stolen);
    if (r) break;
  }
  assert(r);
  p.x = r.x + 40;
  p.y = r.y;
  tick(g, 0.02);
  const d = g.drops.find((d) => d.item.kind === "ingredient");
  assert(d);
  const amount = t.stock[d.item.key];
  tick(g, 0.02);
  assert.equal(g.drops.length, 1);
  p.x = d.x;
  p.y = d.y;
  g.interact(p);
  assert.equal(t.stock[d.item.key], amount + 1);
  assert(!g.drops.length);
  const h = setup();
  h.invade(0);
  h.players[0].x = h.rats[0].x + 35;
  h.players[0].y = h.rats[0].y;
  tick(h, 0.2);
  assert(!h.drops.length);
  assert(h.rats.length > 0);
});
test("paid wave cooldown and active cap reject without charging", () => {
  const g = setup(),
    t = g.teams[0];
  t.money = 1000;
  const p = at(g, 0, "rats");
  g.interact(p);
  assert.equal(t.money, 955);
  g.interact(p);
  assert.equal(t.money, 955);
  t.ratCD = 0;
  g.interact(p);
  assert.equal(t.money, 955);
  assert.equal(g.rats.filter((r) => r.team === 1).length, 4);
});
test("VIP accepts both players personally, rejects waiter pickup and rewards one winner", () => {
  const g = setup();
  g.nextVIP = 0;
  tick(g, 0.1);
  const o = g.vip;
  for (const id of [0, 1]) {
    const p = g.players[id];
    p.x = g.vipSeats[0].approach.x;
    p.y = g.vipSeats[0].approach.y;
    g.interact(p);
    assert.equal(p.selected, o.id);
    cook(g, id);
  }
  const first = g.players[0].hand,
    second = g.players[1].hand;
  g.teams[1].waiter = { x: 340, y: 400, task: "idle", path: [] };
  at(g, 1, "serving");
  g.interact(g.players[1]);
  assert(!g.teams[1].pickup);
  assert(g.deliver(first, g.teams[0]));
  assert(!g.deliver(second, g.teams[1]));
  assert.equal(g.teams[0].rep, 12);
  assert.equal(g.teams[1].rep, 0);
  assert(!g.players[1].hand);
});
test("simultaneous movement, local panels and wall-safe dash", () => {
  const g = setup(),
    p = g.players[0],
    r = g.players[1],
    x = p.x,
    rx = r.x;
  tick(g, 0.2, [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
  ]);
  assert(p.x > x && r.x < rx);
  p.panel = "supply";
  const px = p.x;
  tick(g, 0.2, [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
  ]);
  assert.equal(p.x, px);
  assert(r.x < rx - 50);
  p.panel = null;
  p.x = 140;
  p.y = 220;
  p.faceX = 0;
  p.faceY = -1;
  g.dash(p);
  tick(g, 0.3, [{ x: 0, y: -1 }, {}]);
  assert(!g.solid(p.x, p.y));
});
test("actual repeated deliveries reach five stars, freeze and reset all state", () => {
  const g = setup(),
    t = g.teams[0];
  for (let i = 0; i < 10; i++) {
    let o = t.customers.find((c) => !c.departing);
    if (!o) {
      g.addCustomer(t);
      o = t.customers.find((c) => !c.departing);
    }
    tick(g, 8);
    o = t.customers.find((c) => !c.departing && c.state !== "entering");
    const p = g.players[0],
      seat = t.seats[o.seat];
    p.x = seat.approach.x;
    p.y = seat.approach.y;
    g.interact(p);
    for (const k of K.stockKeys) t.stock[k] = 4;
    cook(g, 0);
    serve(g, 0, o);
  }
  assert.equal(g.winner, 0);
  assert.equal(t.rep, 100);
  const time = g.time;
  tick(g, 2);
  assert.equal(g.time, time);
  g.reset();
  assert.equal(g.winner, null);
  assert.equal(g.teams[0].rep, 0);
  assert(!g.players[0].panel);
  assert(!g.rats.length);
  assert(!g.drops.length);
  assert(!g.teams[0].waiter);
});
test("full blue route uses actual collision movement from guest through cooking and delivery", () => {
  const g = setup(),
    p = g.players[0],
    t = g.teams[0];
  function walk(target) {
    const route = g.path(p, target);
    assert(route.length);
    for (const point of route) {
      let steps = 0;
      while (Math.hypot(p.x - point.x, p.y - point.y) > 2) {
        assert(++steps < 200, "route must not get stuck");
        const dx = point.x - p.x,
          dy = point.y - p.y;
        g.step(1 / 240, [{ x: dx, y: dy }, {}]);
        assert(!g.solid(p.x, p.y));
      }
    }
  }
  const visit = (type) => {
    const s = t.stations.find((s) => s.type === type);
    walk({ x: s.x, y: s.y + 70 });
    g.interact(p);
  };
  tick(g, 8);
  walk(t.seats[0].approach);
  g.interact(p);
  assert(p.selected);
  visit("dough");
  tick(g, 1.3);
  visit("topping");
  for (const key of ["sauce", "cheese"]) assert(g.addIngredient(p, key));
  assert(g.assemble(p));
  visit("oven");
  tick(g, 3.1);
  g.interact(p);
  assert.equal(p.hand.stage, "ready");
  walk(t.seats[0].approach);
  g.interact(p);
  assert.equal(t.rep, 10);
});
test("natural arrivals gradually occupy six seats when waiter takes orders", () => {
  const g = setup(),
    t = g.teams[0];
  t.money = 200;
  const p = at(g, 0, "waiter");
  g.interact(p);
  tick(g, 105);
  assert.equal(t.customers.length, 6);
  assert(t.customers.every((c) => c.state === "accepted"));
});
test("terminal state follows pizza until actual delivery and waiter/player acceptance races are idempotent", () => {
  const g = setup(),
    o = greet(g, 0),
    p = g.players[0],
    t = g.teams[0];
  assert.equal(g.status(o, 0), "Accepted");
  at(g, 0, "terminal");
  g.interact(p);
  assert.equal(p.panel, "terminal");
  assert(g.select(p, o.id));
  at(g, 0, "dough");
  g.interact(p);
  tick(g, 1.3);
  assert.equal(g.status(o, 0), "Dough ready");
  at(g, 0, "topping");
  g.interact(p);
  g.addIngredient(p, "sauce");
  assert.equal(g.status(o, 0), "Assembling");
  g.addIngredient(p, "cheese");
  g.assemble(p);
  at(g, 0, "oven");
  g.interact(p);
  assert.equal(g.status(o, 0), "Baking");
  tick(g, 3.1);
  assert.equal(g.status(o, 0), "Ready");
  g.interact(p);
  assert(g.order(o.id));
  t.money = 1000;
  at(g, 0, "waiter");
  g.interact(p);
  at(g, 0, "serving");
  g.interact(p);
  assert.equal(g.status(o, 0), "Ready at pickup");
  for (let i = 0; i < 1200 && t.waiter.task !== "deliver"; i++) g.step(1 / 120);
  assert.equal(g.status(o, 0), "Being delivered");
  tick(g, 15);
  assert(!g.order(o.id));
  assert.equal(t.rep, 10);
});
console.log(count + " regression groups passed");
