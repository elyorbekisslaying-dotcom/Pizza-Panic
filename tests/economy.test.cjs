const assert = require("node:assert/strict");
const { Game, K, tick } = require("./helpers.cjs");
function run(policy, seed) {
  let rng = seed;
  const g = new Game(
    () => (rng = (rng * 1664525 + 1013904223) >>> 0) / 2 ** 32,
  );
  g.countdown = 0;
  g.nextVIP = Infinity;
  const t = g.teams[0],
    p = g.players[0];
  g.teams[1].open = false;
  let travel = 0,
    orders = 0,
    totalPayments = 0,
    ingredientsBought = 0,
    firstHire = null;
  function walk(target) {
    if (g.winner !== null) return false;
    if (Math.hypot(p.x - target.x, p.y - target.y) < 20) return true;
    const route = g.path(p, target);
    assert(route.length, "route");
    for (const q of route) {
      let tries = 0;
      while (Math.hypot(q.x - p.x, q.y - p.y) > 2 && g.winner === null) {
        assert(++tries < 400, "blocked");
        const old = g.time;
        g.step(1 / 120, [{ x: q.x - p.x, y: q.y - p.y }, {}]);
        travel += g.time - old;
      }
    }
    return g.winner === null;
  }
  function visit(type) {
    p.panel = null;
    const s = t.stations.find((s) => s.type === type);
    if (!walk(s.approach)) return false;
    g.interact(p);
    return true;
  }
  while (g.winner === null && g.time < 900) {
    if (policy === "waiter" && !t.waiter && t.money >= 100) {
      visit("waiter");
      firstHire ??= g.time;
    }
    if (policy === "assistant-safe" && !t.assistant && t.money >= 180) {
      visit("supply");
      for (const k of K.recipes[0].items)
        if (t.stock[k] === 0 && g.buy(p, k)) ingredientsBought += K.prices[k];
      p.panel = null;
    }
    if (
      (policy === "assistant" || policy === "assistant-safe") &&
      !t.assistant &&
      t.money >= 180
    ) {
      visit("assistant");
      firstHire ??= g.time;
    }
    let o;
    if (t.assistant) {
      if (!t.pickup) {
        tick(g, 0.25);
        const available = t.customers.find(
          (c) => c.state === "accepted" && !c.departing,
        );
        if (!available) {
          o = t.customers.find((c) => c.state === "waiting");
          if (o && walk(t.seats[o.seat].approach)) g.interact(p);
        }
        if (t.assistant.state === "Missing ingredients") {
          visit("supply");
          for (const k of K.stockKeys)
            if (t.stock[k] === 0 && g.buy(p, k))
              ingredientsBought += K.prices[k];
          p.panel = null;
        }
        continue;
      }
      o = g.order(t.pickup.order);
      visit("serving");
    } else {
      o = t.customers
        .filter((c) => !c.departing && c.state !== "entering")
        .sort((a, b) => a.patience - b.patience)[0];
      if (!o) {
        tick(g, 0.1);
        continue;
      }
      if (!walk(t.seats[o.seat].approach)) break;
      g.interact(p);
      if (!g.order(o.id)) continue;
      const needs = K.recipes[o.recipe].items.filter((k) => t.stock[k] === 0);
      if (needs.length) {
        visit("supply");
        for (const k of needs)
          if (g.buy(p, k)) ingredientsBought += K.prices[k];
        p.panel = null;
      }
      p.selected = o.id;
      if (!visit("dough")) break;
      tick(g, 1.3);
      if (!p.hand) continue;
      visit("topping");
      for (const k of K.recipes[o.recipe].items.filter((k) => k !== "dough"))
        g.addIngredient(p, k);
      if (!g.assemble(p)) {
        p.panel = null;
        continue;
      }
    }
    if (!p.hand) continue;
    if (p.hand.stage !== "ready") {
      visit("oven");
      tick(g, 3.1);
      g.interact(p);
    }
    if (!p.hand) continue;
    const cash = t.money;
    if (t.waiter) {
      visit("serving");
      let guard = 0;
      while (g.order(o.id) && g.winner === null && guard++ < 6000)
        tick(g, 1 / 120);
    } else {
      if (!walk(t.seats[o.seat].approach)) break;
      g.interact(p);
    }
    if (!g.order(o.id) && t.money > cash) {
      orders++;
      totalPayments += t.money - cash;
    }
  }
  assert.notEqual(
    g.winner,
    null,
    policy + " must reach a real terminal result",
  );
  return {
    policy,
    seed,
    winner: g.winner,
    reason: g.resultReason,
    rep: t.rep,
    stock: t.stock,
    seconds: +g.time.toFixed(1),
    served: t.served,
    lost: t.lost,
    firstHireSeconds: firstHire === null ? null : +firstHire.toFixed(1),
    payments: totalPayments,
    ingredientPackSpend: ingredientsBought,
    cash: t.money,
    waiterBusySeconds: +g.metrics.waiterBusy[0].toFixed(1),
    assistantBusySeconds: +g.metrics.assistantBusy[0].toFixed(1),
    travelSeconds: +travel.toFixed(1),
    affordableGadgetsAtEnd: Object.fromEntries(
      ["banana", "flour", "bottle", "rats"].map((k) => [
        k,
        t.money >= K.purchases[k],
      ]),
    ),
  };
}
const results = ["manual", "waiter", "assistant", "assistant-safe"].map(
  (p, i) => run(p, 110 + i),
);
console.log(JSON.stringify(results, null, 2));
