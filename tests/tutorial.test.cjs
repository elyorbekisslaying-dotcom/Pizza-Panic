const assert = require("node:assert/strict");
const { Game, Tutorial, K, tick, walk } = require("./helpers.cjs");
const g = new Game(() => 0.1);
let completed = 0;
const tutorial = new Tutorial(g, () => completed++),
  p = g.players[0];
function station(type) {
  const s = tutorial.station(type);
  p.panel = null;
  walk(g, 0, { x: s.x, y: s.y + 70 });
  g.interact(p);
  tick(g, 0.02);
}
function guest(o) {
  p.panel = null;
  const s = o.team === -1 ? g.vipSeats[o.seat] : g.teams[0].seats[o.seat];
  walk(g, 0, s.approach);
  g.interact(p);
  tick(g, 0.02);
}
let safety = 0;
while (!tutorial.done) {
  assert(++safety < 100, "stuck at " + tutorial.step.key);
  const key = tutorial.step.key;
  switch (key) {
    case "move":
      walk(g, 0, { x: 420, y: 710 });
      break;
    case "sign":
      station("sign");
      tick(g, 0.4);
      g.interact(p);
      tick(g, 0.1);
      break;
    case "greet":
      tick(g, 8);
      guest(tutorial.guest());
      break;
    case "terminal":
      station("terminal");
      g.select(p, p.orderList[0]);
      tick(g, 0.02);
      break;
    case "inventory":
      g.record("inspect", { id: 0 });
      tick(g, 0.02);
      break;
    case "buy":
      station("supply");
      g.buy(p, "cheese");
      tick(g, 0.02);
      break;
    case "dough":
      station("dough");
      tick(g, 1.3);
      break;
    case "ingredients":
      station("topping");
      for (const k of ["sauce", "cheese"]) g.addIngredient(p, k);
      tick(g, 0.02);
      break;
    case "raw":
      g.assemble(p);
      tick(g, 0.02);
      break;
    case "oven":
      station("oven");
      break;
    case "collect":
      tick(g, 3.1);
      g.interact(p);
      tick(g, 0.02);
      break;
    case "serve":
      guest(tutorial.guest());
      break;
    case "waiter":
      station("waiter");
      tick(g, 18);
      break;
    case "assistant":
      station("assistant");
      tick(g, 9.2);
      break;
    case "assistant-pickup":
      g.interact(p);
      tick(g, 0.02);
      break;
    case "staff-bake":
      station("oven");
      tick(g, 3.1);
      g.interact(p);
      tick(g, 0.02);
      break;
    case "staff-deliver":
      station("serving");
      tick(g, 20);
      break;
    case "banana":
      station("banana");
      walk(g, 0, { x: 570, y: 610 });
      p.faceX = 1;
      p.faceY = 0;
      g.useItem(p);
      tick(g, 3);
      break;
    case "flour":
      station("flour");
      walk(g, 0, { x: 570, y: 610 });
      p.faceX = 1;
      p.faceY = 0;
      g.useItem(p);
      tick(g, 1);
      break;
    case "sauce":
      station("bottle");
      walk(g, 0, { x: 660, y: 695 });
      p.faceX = 0;
      p.faceY = 1;
      g.useItem(p);
      tick(g, 0.02);
      break;
    case "clean":
      g.interact(p);
      tick(g, 2.6, [{ interact: true }, {}]);
      break;
    case "rats": {
      walk(g, 0, { x: 650, y: 400 });
      let n = 0;
      while (!g.rats.some((r) => r.stolen) && n++ < 1200) tick(g, 0.01);
      const rat = g.rats.find((r) => r.stolen);
      assert(rat, "rat must steal");
      for (
        let chase = 0;
        chase < 8 && !g.drops.some((d) => d.item.kind === "ingredient");
        chase++
      ) {
        const carrier = g.rats.find((r) => r.stolen);
        if (!carrier) break;
        walk(g, 0, { x: carrier.x, y: carrier.y });
        tick(g, 0.02);
      }
      const drop = g.drops.find((d) => d.item.kind === "ingredient");
      assert(drop, "stolen ingredient must drop");
      walk(g, 0, drop);
      g.interact(p);
      tick(g, 0.02);
      break;
    }
    case "vip": {
      const vip = g.vip;
      guest(vip);
      station("dough");
      tick(g, 1.3);
      station("topping");
      for (const k of K.recipes[p.hand.recipe].items.filter(
        (k) => k !== "dough",
      ))
        g.addIngredient(p, k);
      g.assemble(p);
      station("oven");
      tick(g, 3.1);
      g.interact(p);
      guest(vip);
      break;
    }
    default:
      throw Error(key);
  }
  console.log("LESSON", key, "->", tutorial.step?.key || "complete");
}
assert.equal(completed, 1);
assert.equal(g.teams[0].served, 3);
assert.equal(g.teams[0].rep, 32);
// Recovery is available after lost food and at advanced lessons; it never completes them.
const h = new Game(),
  t = new Tutorial(h, () => {});
t.index = 10;
h.teams[0].oven = { stage: "burned" };
t.recover();
assert.equal(t.step.key, "greet");
assert(!h.teams[0].oven);
assert(!t.done);
t.index = 20;
t.recover();
assert.equal(t.step.key, "sauce");
assert(!h.teams[0].tables.some((x) => x.dirty));
console.log(
  "PASS complete tutorial through actual movement, cooking, staff, gadgets, cleanup, theft recovery and VIP; recovery after burned food and cleanup.",
);
