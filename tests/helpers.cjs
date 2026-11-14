const fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const context = vm.createContext({ console });
for (const f of ["orders", "game", "tutorial"])
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "../js/" + f + ".js"), "utf8"),
    context,
  );
const { Game, K, Tutorial } = vm.runInContext(
  "({Game:RivalGame.Game,K:Kitchen,Tutorial:KitchenTutorial})",
  context,
);
function tick(g, s, input) {
  for (let i = 0; i < Math.ceil(s * 120) && g.winner === null; i++)
    g.step(1 / 120, input || [{}, g.tutorial?.input() || {}]);
}
function at(g, id, type) {
  const s = g.teams[id].stations.find((s) => s.type === type),
    p = g.players[id];
  p.x = s.approach.x;
  p.y = s.approach.y;
  p.panel = null;
  return p;
}
function visit(g, id, type) {
  const p = at(g, id, type);
  g.interact(p);
  return p;
}
function greet(g, id, customer) {
  const t = g.teams[id],
    o =
      customer ||
      t.customers.find((c) => !c.departing && c.state !== "entering"),
    seat = o.team === -1 ? g.vipSeats[o.seat] : t.seats[o.seat],
    p = g.players[id];
  p.x = seat.approach.x;
  p.y = seat.approach.y;
  p.panel = null;
  g.interact(p);
  return o;
}
function cook(g, id) {
  const p = visit(g, id, "dough");
  tick(g, 1.3);
  assert.equal(p.hand?.stage, "dough");
  visit(g, id, "topping");
  for (const key of K.recipes[p.hand.recipe].items.filter((k) => k !== "dough"))
    assert(g.addIngredient(p, key));
  assert(g.assemble(p));
  visit(g, id, "oven");
  tick(g, 3.1);
  g.interact(p);
  assert.equal(p.hand?.stage, "ready");
  return p.hand;
}
function fresh() {
  const g = new Game(() => 0.1);
  g.countdown = 0;
  g.nextRats = Infinity;
  g.nextVIP = Infinity;
  return g;
}
function walk(g, id, target) {
  const p = g.players[id];
  if (Math.hypot(p.x - target.x, p.y - target.y) < 20) return;
  const route = g.path(p, target);
  assert(route.length, "route to " + JSON.stringify(target));
  for (const q of route) {
    let n = 0;
    while (Math.hypot(q.x - p.x, q.y - p.y) > 2) {
      assert(++n < 500, "blocked route");
      const inputs = [{}, g.tutorial?.input() || {}];
      inputs[id] = { x: q.x - p.x, y: q.y - p.y };
      g.step(1 / 240, inputs);
    }
  }
}
module.exports = {
  Game,
  K,
  Tutorial,
  tick,
  at,
  visit,
  greet,
  cook,
  fresh,
  walk,
};
