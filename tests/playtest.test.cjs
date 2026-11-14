const assert = require("node:assert/strict");
const {
  Game,
  Tutorial,
  K,
  tick,
  at,
  visit,
  greet,
  fresh,
} = require("./helpers.cjs");
let count = 0;
function test(name, fn) {
  fn();
  console.log("PASS", name);
  count++;
}
function until(g, check, max = 60) {
  for (let i = 0; i < max * 60 && !check(); i++) g.step(1 / 60);
  assert(
    check(),
    "transition timed out: " + g.teams.map((t) => t.assistant?.state).join("/"),
  );
}
function setup(id = 0) {
  const g = fresh(),
    t = g.teams[id];
  g.teams.forEach((t) => (t.open = false));
  tick(g, 8);
  const o = greet(g, id);
  o.patience = 1000;
  t.money = 1000;
  visit(g, id, "assistant");
  return { g, t, o, p: g.players[id] };
}
function add(g, t) {
  t.open = true;
  g.addCustomer(t);
  t.open = false;
}
function food(o, id) {
  return {
    kind: "pizza",
    order: o.id,
    owner: id,
    recipe: o.recipe,
    stage: "ready",
    added: K.recipes[o.recipe].items.filter((k) => k !== "dough"),
    timer: 12,
  };
}
for (const id of [0, 1]) {
  test(`team ${id}: approaches, world stalls, ownership, doors, old floor space`, () => {
    const g = fresh(),
      t = g.teams[id],
      p = g.players[id];
    for (const s of t.stations) {
      assert(!g.solid(s.approach.x, s.approach.y), s.type);
      const path = g.path(p, s.approach);
      assert(path.length, s.type);
      let prev = p;
      for (const q of path) {
        assert(g.lineClear(prev, q), s.type);
        prev = q;
      }
    }
    const gadgets = t.stations.filter((s) => s.zone === "gadgets");
    assert.equal(gadgets.length, 4);
    assert(
      gadgets.every(
        (s) => s.x >= 900 && s.x <= 1100 && (id ? s.y > 600 : s.y < 600),
      ),
    );
    for (const s of gadgets) {
      const rival = g.players[1 - id],
        cash = t.money,
        otherCash = g.teams[1 - id].money;
      Object.assign(rival, s.approach);
      g.interact(rival);
      assert.equal(t.money, cash);
      assert.equal(g.teams[1 - id].money, otherCash);
      assert(!rival.hand);
    }
    for (const y of [150, 250, 350, 450, 750, 850, 950, 1050])
      assert(!g.solid(1000, y), "central lane");
    assert(!g.solid(K.mirror(id, 370), 270), "freed kitchen center");
    const c = t.customers[0];
    const path = g.path(t.entrance, t.seats[c.seat].approach);
    assert(
      path.some(
        (q) => Math.abs(q.y - t.door.y) < 15 && Math.abs(q.x - t.door.x) < 60,
      ),
    );
    t.open = false;
    tick(g, 8);
    c.patience = 0.01;
    tick(g, 0.1);
    assert(c.departing);
    until(g, () => !t.customers.includes(c), 20);
    Object.assign(p, { x: t.door.x, y: t.door.y + 40 });
    tick(g, 0.5);
    assert(t.door.open > 0.9);
    assert(g.path(p, { x: t.door.x, y: t.door.y - 60 }).length);
  });
  test(`team ${id}: full moving waiter/cook cycle, once-only reward, speed`, () => {
    const g = fresh(),
      t = g.teams[id];
    g.teams.forEach((t) => (t.open = false));
    t.money = 1000;
    visit(g, id, "assistant");
    visit(g, id, "waiter");
    const a = t.assistant;
    const start = { x: a.x, y: a.y },
      cash = t.money;
    let moved = false,
      paused = false;
    for (let i = 0; i < 60 * 60 && !t.served; i++) {
      g.step(1 / 60);
      moved ||= Math.hypot(a.x - start.x, a.y - start.y) > 100;
      paused ||= t.waiter.service > 0;
      if (!t.served) assert.equal(t.money, cash);
    }
    assert(moved && paused);
    assert.equal(t.served, 1);
    assert.equal(t.rep, 10);
    const paid = t.money;
    tick(g, 10);
    assert.equal(t.money, paid);
    assert(!t.oven && !t.pickup && !a.food && !a.job);
    const w = t.waiter;
    w.path = [{ x: w.x + 300, y: w.y }];
    const x = w.x;
    g.travel(w, 1, 115);
    assert.equal(w.x - x, 115);
    assert(115 / 235 < 0.5);
  });
  test(`team ${id}: occupied oven and pickup preserve exact objects; manual collection releases cook`, () => {
    const { g, t, o, p } = setup(id);
    add(g, t);
    const other = t.customers.at(-1);
    other.state = "waiting";
    g.accept(other, id);
    other.patience = 1000;
    const blocker = food(other, id);
    blocker.stage = "baking";
    blocker.timer = 3;
    t.oven = blocker;
    until(g, () => t.assistant.state === "Waiting for oven", 15);
    const dough = t.stock.dough;
    tick(g, 2);
    assert.equal(t.oven, blocker);
    assert.equal(t.assistant.food.order, o.id);
    assert(
      !g.status(o, id).startsWith("Ready"),
      "another order in the oven must not mark raw cook food ready",
    );
    assert(!g.solid(t.assistant.x, t.assistant.y));
    t.oven = null;
    t.pickup = blocker;
    blocker.stage = "ready";
    until(g, () => t.assistant.state === "Waiting for pickup space", 15);
    const ready = t.assistant.food;
    assert.equal(ready.stage, "ready");
    tick(g, 3);
    assert.equal(t.pickup, blocker);
    assert.equal(t.assistant.food, ready);
    assert.equal(t.stock.dough, dough);
    visit(g, id, "serving");
    assert.equal(p.hand, blocker);
    greet(g, id, other);
    assert.equal(t.rep, 10);
    until(g, () => t.pickup === ready, 10);
    visit(g, id, "serving");
    assert.equal(p.hand, ready);
    greet(g, id, o);
    assert.equal(t.rep, 20);
    assert(!t.assistant.job);
    const next = setup(id);
    until(next.g, () => next.t.oven?.stage === "ready", 20);
    const baked = next.t.oven;
    visit(next.g, id, "oven");
    assert.equal(next.p.hand, baked);
    assert(!next.t.assistant.job && !next.t.oven);
    tick(next.g, 3);
    assert.equal(next.p.hand, baked);
    assert(!next.t.pickup);
    assert.equal(next.t.rep, 0);
  });
  test(`team ${id}: cancellation at all cook phases and burned food clear reservations`, () => {
    for (const phase of ["prep", "oven", "bake", "pickup"]) {
      const { g, t, o } = setup(id);
      until(g, () => t.assistant.phase === phase, 30);
      const stock = JSON.stringify(t.stock),
        cash = t.money;
      o.patience = 0.001;
      tick(g, 0.02);
      assert(!g.order(o.id));
      assert(!g.pizzaExists(o.id, id));
      assert(!t.assistant.job && !t.assistant.food);
      assert(!t.oven && !t.pickup);
      assert.equal(t.money, cash);
      assert.equal(JSON.stringify(t.stock), stock);
    }
    const { g, t } = setup(id);
    until(g, () => t.assistant.phase === "bake", 20);
    t.oven.stage = "burned";
    g.assistantStep(t, 0.01);
    assert(!t.oven && !t.assistant.job && !t.assistant.food);
    assert.equal(t.rep, 0);
  });
  test(`team ${id}: auto-select urgency, manual/VIP priority, reservation race`, () => {
    const g = fresh(),
      t = g.teams[id],
      p = g.players[id];
    g.teams.forEach((t) => (t.open = false));
    tick(g, 8);
    add(g, t);
    tick(g, 8);
    const [a, b] = t.customers;
    g.accept(a, id);
    g.accept(b, id);
    a.patience = 80;
    b.patience = 60;
    p.selected = "stale";
    visit(g, id, "dough");
    assert.equal(p.prep.order, b.id);
    assert.match(p.message, /Assigned/);
    g.cancel(b.id);
    p.selected = a.id;
    visit(g, id, "dough");
    assert.equal(p.prep.order, a.id);
    g.cancel(a.id);
    g.spawnVIP(1);
    greet(g, id, g.vip);
    visit(g, id, "dough");
    assert.equal(p.prep.order, g.vip.id);
    g.cancel(g.vip.id);
    const z = setup(id);
    z.g.assistantStep(z.t, 0.01);
    visit(z.g, id, "dough");
    assert(!z.p.prep);
    assert.match(z.p.message, /Cook/);
    assert.equal(z.t.stock.dough, 3);
    z.p.selected = null;
    visit(z.g, id, "dough");
    assert(!z.p.prep);
    assert.match(z.p.message, /No unclaimed/);
  });
  test(`team ${id}: ten genuine staff deliveries reach victory`, () => {
    const g = fresh(),
      t = g.teams[id];
    g.teams.forEach((t) => (t.open = false));
    t.money = 1000;
    K.stockKeys.forEach((k) => (t.stock[k] = 12));
    visit(g, id, "assistant");
    visit(g, id, "waiter");
    for (let n = 0; n < 10; n++) {
      if (n) add(g, t);
      until(g, () => t.served === n + 1, 60);
    }
    assert.equal(t.rep, 100);
    assert.equal(t.served, 10);
    assert.equal(g.winner, id);
  });
}
test("central markets have comparable routes from restaurant entrances", () => {
  const g = fresh();
  for (const type of ["banana", "flour", "bottle", "rats"]) {
    const lengths = [0, 1].map(
      (id) =>
        g.path(
          { x: id ? 1170 : 830, y: 610 },
          g.teams[id].stations.find((s) => s.type === type).approach,
        ).length * 20,
    );
    assert(Math.abs(lengths[0] - lengths[1]) <= 40, type);
  }
});
test("stains generated once, unique after cleaning, gradual fade and mirrored persistence", () => {
  const g = new Game(),
    t = g.teams[0],
    p = g.players[1],
    table = t.tables[2];
  g.countdown = 0;
  g.nextRats = Infinity;
  g.nextVIP = Infinity;
  Object.assign(p, {
    x: table.x,
    y: 695,
    faceX: 0,
    faceY: 1,
    hand: { kind: "bottle", owner: 1 },
  });
  g.useItem(p);
  assert(table.dirty);
  assert.equal(table.stains.length, 36);
  assert(new Set(table.stains.map((s) => s.rx)).size > 20);
  const stains = JSON.stringify(table.stains);
  tick(g, 0.5);
  assert.equal(JSON.stringify(table.stains), stains);
  const owner = g.players[0];
  Object.assign(owner, { x: table.x, y: 695 });
  g.interact(owner);
  tick(g, 1, [{ interact: true }, {}]);
  assert(table.cleanProgress > 0.35 && table.cleanProgress < 0.45);
  assert.equal(JSON.stringify(table.stains), stains);
  tick(g, 1.6, [{ interact: true }, {}]);
  assert(!table.dirty);
  assert(!table.stains);
  table.protectedUntil = 0;
  p.trapCD = 0;
  p.hand = { kind: "bottle", owner: 1 };
  g.useItem(p);
  assert.notEqual(JSON.stringify(table.stains), stains);
});
test("tutorial route cache, UI suppression, moved station, discarded/dropped food recovery", () => {
  const g = new Game(),
    t = new Tutorial(g, () => {}),
    p = g.players[0];
  t.index = t.steps.findIndex((s) => s.key === "sign");
  t.startStep();
  t.updateGuide();
  const path = t.guide.path;
  assert(path.length);
  let prev = p;
  for (const q of path) {
    assert(g.lineClear(prev, q));
    prev = q;
  }
  const builds = t.routeBuilds;
  for (let i = 0; i < 30; i++) t.updateGuide();
  assert.equal(t.routeBuilds, builds);
  const s = t.station("sign");
  s.approach.x += 20;
  t.updateGuide();
  assert.equal(t.guide.goal.x, s.approach.x);
  assert(t.routeBuilds > builds);
  t.index = t.steps.findIndex((s) => s.key === "buy");
  t.startStep();
  p.panel = "supply";
  t.updateGuide();
  assert(t.uiTarget.includes("cheese"));
  assert(!t.guide.goal);
  p.panel = null;
  tick(g, 8);
  greet(g, 0);
  t.index = t.steps.findIndex((s) => s.key === "dough");
  t.startStep();
  visit(g, 0, "dough");
  tick(g, 1.3);
  assert.equal(t.step.key, "ingredients");
  g.drop(p);
  tick(g, 0.1);
  assert.equal(t.target, g.drops[0]);
  g.drops = [];
  tick(g, 0.1);
  assert.equal(t.step.key, "dough");
});
test("reset clears cook/waiter/effects/paths/claims and rebuilds navigation", () => {
  const { g, t, p } = setup();
  visit(g, 0, "waiter");
  tick(g, 1);
  p.flourTime = 2;
  t.tables[2].dirty = true;
  t.tables[2].stains = g.makeStains(t.tables[2]);
  g.reset();
  assert(
    g.teams.every(
      (t) =>
        !t.assistant &&
        !t.waiter &&
        !t.oven &&
        !t.pickup &&
        t.tables.every((x) => !x.stains && !x.dirty),
    ),
  );
  assert(
    g.players.every((p) => !p.hand && !p.prep && !p.flourTime && !p.selected),
  );
  assert(!g.tutorial);
});
console.log(count + " playtest regression groups passed");
