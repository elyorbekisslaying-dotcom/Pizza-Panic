const { strict: assert } = require("node:assert");
const { fresh, K, tick, visit, greet } = require("./helpers.cjs");
let groups = 0;
function until(g, check, seconds = 70) {
  for (let i = 0; i < seconds * 60 && !check(); i++) g.step(1 / 60);
  assert(
    check(),
    "transition timeout: " +
      g.teams.flatMap((t) => t.cooks.map((a) => a.state)).join(", "),
  );
}
function setup(id, count = 4) {
  const g = fresh(),
    t = g.teams[id];
  for (const team of g.teams) team.open = false;
  t.money = 10000;
  K.stockKeys.forEach((k) => (t.stock[k] = 50));
  for (let i = 1; i < count; i++) {
    t.open = true;
    g.addCustomer(t);
    t.open = false;
  }
  tick(g, 12);
  for (const c of t.customers) {
    assert.equal(c.state, "waiting");
    g.accept(c, id);
    c.patience = 1000;
  }
  for (let i = 0; i < 4; i++) visit(g, id, "assistant");
  assert.equal(t.cooks.length, 4);
  const cash = t.money;
  visit(g, id, "assistant");
  assert.equal(t.cooks.length, 4);
  assert.equal(t.money, cash);
  return { g, t, p: g.players[id] };
}
function invariant(g, t) {
  const objects = [
    ...t.ovens,
    ...t.pickup,
    ...t.cooks.map((a) => a.food),
    t.waiter?.pizza,
    g.players[t.id].hand,
    g.players[t.id].prep,
  ].filter((f) => f?.kind === "pizza");
  assert.equal(
    new Set(objects.map((f) => f.order)).size,
    objects.length,
    "a dish has one physical holder",
  );
  const reservations = t.cooks.filter((a) => a.job).map((a) => a.job.order);
  assert.equal(
    new Set(reservations).size,
    reservations.length,
    "unique cook reservations",
  );
  for (const a of t.cooks)
    assert(!g.solid(a.x, a.y), "cook follows accessible route");
}
for (const id of [0, 1]) {
  {
    const { g, t, p } = setup(id);
    const stock = t.stock.dough,
      cash = t.money;
    tick(g, 0.02);
    assert.equal(t.cooks.filter((a) => a.job).length, 4);
    assert.equal(new Set(t.cooks.map((a) => a.job.order)).size, 4);
    assert.equal(t.stock.dough, stock - 4);
    assert.equal(new Set(t.cooks.map((a) => a.x + "," + a.y)).size, 4);
    let maxSlots = 0;
    for (let i = 0; i < 70 * 60 && t.pickup.length < 4; i++) {
      g.step(1 / 60);
      invariant(g, t);
      maxSlots = Math.max(maxSlots, t.ovens.filter(Boolean).length);
      assert.equal(t.money, cash);
      assert.equal(t.rep, 0);
    }
    assert.equal(t.pickup.length, 4);
    assert(maxSlots >= 2, "parallel baking");
    const removed = t.pickup[1];
    g.cancel(removed.order);
    assert.equal(t.pickup.length, 3);
    assert(!g.pizzaExists(removed.order, id));
    // Cancellation normally follows departure; prevent this fixture from re-claiming it.
    g.leave(t, g.order(removed.order));
    p.selected = t.pickup[1].order;
    const selected = t.pickup[1];
    visit(g, id, "serving");
    assert.equal(p.hand, selected);
    greet(g, id, g.order(selected.order));
    assert.equal(t.rep, 10);
    assert(!g.deliver(selected, t));
    visit(g, id, "waiter");
    until(g, () => t.pickup.length === 0 && !t.waiter.pizza);
    assert.equal(t.rep, 30);
    assert.equal(t.served, 3);
    invariant(g, t);
    console.log(
      "PASS team",
      id,
      ": four unique cooks, parallel oven slots, multi-dish queue, selected collection, cancellation, real once-only payments",
    );
    groups++;
  }
  {
    const { g, t, p } = setup(id, 8);
    const blockers = t.customers
      .slice(4)
      .map((o) => ({
        kind: "pizza",
        owner: id,
        order: o.id,
        recipe: o.recipe,
        stage: "baking",
        timer: 1000,
      }));
    t.ovens = blockers.slice();
    until(g, () => t.cooks.every((a) => a.state === "Waiting for oven"));
    const stock = JSON.stringify(t.stock);
    tick(g, 2);
    assert.equal(JSON.stringify(t.stock), stock);
    assert(t.ovens.every((f, i) => f === blockers[i]));
    assert(t.cooks.every((a) => a.food?.stage === "raw"));
    // Timers and states are independent, even while all other slots remain occupied.
    t.ovens[0].timer = 0.01;
    tick(g, 0.02);
    assert.equal(t.ovens[0].stage, "ready");
    assert(t.ovens.slice(1).every((f) => f.stage === "baking"));
    t.ovens[0].timer = 0.01;
    tick(g, 0.02);
    assert.equal(t.ovens[0].stage, "burned");
    Object.assign(
      p,
      t.stations.find((s) => s.type === "oven").slots[0].approach,
    );
    g.interact(p);
    assert(!t.ovens[0]);
    until(
      g,
      () =>
        t.ovens[0]?.order ===
          t.cooks.find((a) => a.phase === "bake")?.job?.order && !!t.ovens[0],
      15,
    );
    const food = t.ovens[0],
      a = t.cooks.find((a) => a.job?.order === food.order);
    until(g, () => food.stage === "ready", 5);
    Object.assign(
      p,
      t.stations.find((s) => s.type === "oven").slots[0].approach,
    );
    g.interact(p);
    assert.equal(p.hand, food);
    assert(!a.job && !a.food);
    assert(!t.ovens[0]);
    tick(g, 0.1);
    invariant(g, t);
    assert(!t.pickup.includes(food));
    // Customer departure clears occupied slot and linked reservation immediately.
    const departing = t.cooks.find((a) => a.job);
    const order = g.order(departing.job.order);
    order.patience = 0.001;
    tick(g, 0.02);
    assert.notEqual(departing.job?.order, order.id);
    assert(!g.pizzaExists(order.id, id));
    console.log(
      "PASS team",
      id,
      ": full oven waits, independent bake/burn timers, manual collection has no NPC copy, departure releases tasks",
    );
    groups++;
  }
  {
    const { g, t } = setup(id, 10);
    visit(g, id, "waiter");
    for (let i = 0; i < 600 * 60 && g.winner === null; i++) {
      g.step(1 / 60);
      invariant(g, t);
    }
    assert.equal(g.winner, id);
    assert.equal(t.served, 10);
    assert.equal(t.rep, 100);
    assert.equal(
      g.events.filter((e) => e.type === "deliver" && e.id === id).length,
      10,
    );
    const frozen = JSON.stringify(t);
    tick(g, 3);
    assert.equal(JSON.stringify(t), frozen);
    g.reset();
    assert(
      g.teams.every(
        (t) =>
          !t.cooks.length &&
          !t.pickup.length &&
          t.ovens.length === 4 &&
          !t.ovens.some(Boolean),
      ),
    );
    console.log(
      "PASS team",
      id,
      ": four-cook victory through ten actual waiter deliveries, victory freeze and reset",
    );
    groups++;
  }
}
console.log(groups + " shared-kitchen regression groups passed");
