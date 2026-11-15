const assert = require("node:assert/strict");
const { Game, K, visit } = require("./helpers.cjs");
for (const seed of [17, 83, 211, 907]) {
  let randomState = seed;
  const random = () => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 4294967296;
  };
  const g = new Game(random);
  g.countdown = 0;
  g.nextRats = g.nextVIP = Infinity;
  for (const t of g.teams) {
    t.money = 50000;
    K.stockKeys.forEach((k) => (t.stock[k] = 1000));
    for (let i = 0; i < 4; i++) visit(g, t.id, "assistant");
    visit(g, t.id, "waiter");
  }
  let collected = 0,
    burned = 0,
    cancelled = 0;
  for (let frame = 0; frame < 1200 * 60 && g.winner === null; frame++) {
    if (frame % 420 === 0) {
      for (const t of g.teams) {
        const p = g.players[t.id];
        if (p.hand?.stage === "ready") visit(g, t.id, "serving");
        const slot = t.ovens.findIndex((f) => f?.stage === "ready");
        if (slot >= 0 && !p.hand) {
          Object.assign(
            p,
            t.stations.find((s) => s.type === "oven").slots[slot].approach,
          );
          g.interact(p);
          if (p.hand) collected++;
        }
      }
    }
    if (frame > 0 && frame % 1380 === 0) {
      const t = g.teams[Math.floor(random() * 2)],
        a = t.cooks.find((a) => a.job);
      if (a) {
        const o = g.order(a.job.order);
        o.patience = 0.001;
        cancelled++;
      }
    }
    if (frame > 0 && frame % 1740 === 0) {
      const t = g.teams[Math.floor(random() * 2)],
        f = t.ovens.find((f) => f?.stage === "ready");
      if (f) {
        f.timer = 0.001;
        burned++;
      }
    }
    const before = g.teams.map((t) => ({
      cash: t.money,
      served: t.served,
      rep: t.rep,
      lost: t.lost,
    }));
    g.step(1 / 60);
    for (const t of g.teams) {
      const p = g.players[t.id];
      const dishes = [
        ...t.ovens,
        ...t.pickup,
        ...t.cooks.map((a) => a.food),
        t.waiter?.pizza,
        p.hand,
        p.prep,
        ...g.drops.filter((d) => d.owner === t.id).map((d) => d.item),
      ].filter((f) => f?.kind === "pizza");
      assert.equal(
        new Set(dishes.map((f) => f.order)).size,
        dishes.length,
        "duplicate physical pizza",
      );
      const jobs = t.cooks.filter((a) => a.job).map((a) => a.job.order);
      assert.equal(new Set(jobs).size, jobs.length, "duplicate cook claim");
      for (const f of dishes)
        assert(g.accepted(g.order(f.order), t.id), "stale cancelled food");
      for (const a of t.cooks) {
        assert(!g.solid(a.x, a.y), "blocked cook");
        if (a.job) assert(g.accepted(g.order(a.job.order), t.id), "stale task");
      }
      const deliveries = t.served - before[t.id].served,
        payment = t.money - before[t.id].cash;
      assert(
        deliveries === 0
          ? payment === 0
          : deliveries === 1 && payment >= 16 && payment <= 25,
        "payment without one actual delivery",
      );
      assert.equal(
        t.rep,
        Math.min(
          100,
          Math.max(0, before[t.id].rep - 5 * (t.lost - before[t.id].lost)) +
            10 * deliveries,
        ),
      );
    }
  }
  assert([0, 1].includes(g.winner), "match reaches a real delivery victory");
  assert(g.teams[g.winner].served >= 10);
  assert.equal(g.teams[g.winner].rep, 100);
  assert(
    collected > 0 && cancelled > 0,
    "stress exercised collection and cancellation",
  );
  const frozen = JSON.stringify(g.teams);
  g.step(1);
  assert.equal(JSON.stringify(g.teams), frozen);
  console.log(
    "PASS seeded simultaneous four-cook stress",
    JSON.stringify({
      seed,
      winner: g.winner,
      served: g.teams.map((t) => t.served),
      collected,
      cancelled,
      burned,
      seconds: +g.time.toFixed(2),
    }),
  );
}
