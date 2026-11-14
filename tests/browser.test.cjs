const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const artifacts =
  process.env.ARTIFACT_DIR ||
  path.join(require("node:os").tmpdir(), "pizza-panic-smoke");
fs.mkdirSync(artifacts, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
      viewport: { width: 1366, height: 768 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    (process.env.GAME_URL || "http://127.0.0.1:8000/") + "?test=1",
  );
  await page.getByRole("button", { name: "Play", exact: true }).waitFor();
  assert(await page.locator("#match").isHidden());
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator("#volume").fill("0.25");
  await page.locator("#sound-toggle").uncheck();
  assert.deepEqual(await page.evaluate(() => rivalTest.sound), {
    volume: 0.25,
    muted: true,
    gain: 0,
  });
  await page.locator("#sound-toggle").check();
  assert.equal(await page.evaluate(() => rivalTest.sound.gain), 0.25);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.screenshot({ path: path.join(artifacts, "menu.png") });
  await page.getByRole("button", { name: "Play", exact: true }).click();
  const tick = async (s) =>
    page.evaluate((s) => {
      for (let i = 0; i < s * 120; i++) rivalTest.game.step(1 / 120);
      rivalTest.refresh();
    }, s);
  const station = async (id, type) =>
    page.evaluate(
      ({ id, type }) => {
        const g = rivalTest.game,
          p = g.players[id],
          s = g.teams[id].stations.find((s) => s.type === type);
        p.x = s.x;
        p.y = s.y + 70;
        p.panel = null;
        rivalTest.refresh();
      },
      { id, type },
    );
  const interact = (id) => page.keyboard.press(id ? "Enter" : "KeyE");
  await tick(8);
  const start = await page.evaluate(() =>
    rivalTest.game.players.map((p) => p.x),
  );
  await page.keyboard.down("KeyD");
  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(200);
  await page.keyboard.up("KeyD");
  await page.keyboard.up("ArrowLeft");
  const end = await page.evaluate(() => rivalTest.game.players.map((p) => p.x));
  assert(end[0] > start[0] && end[1] < start[1]);
  await station(0, "supply");
  const cash = await page.evaluate(() => rivalTest.game.teams[0].money);
  await interact(0);
  assert.equal(await page.evaluate(() => rivalTest.game.teams[0].money), cash);
  const rx = await page.evaluate(() => rivalTest.game.players[1].x);
  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(150);
  await page.keyboard.up("ArrowLeft");
  assert(await page.evaluate((x) => rivalTest.game.players[1].x < x, rx));
  await interact(0);
  assert.equal(
    await page.evaluate(() => rivalTest.game.teams[0].money),
    cash - 8,
  );
  await page.keyboard.press("KeyI");
  // Both players take their own first guest through the real interaction handler.
  for (const id of [0, 1]) {
    await page.evaluate((id) => {
      const g = rivalTest.game,
        p = g.players[id],
        s = g.teams[id].seats[0];
      p.x = s.approach.x;
      p.y = s.approach.y;
    }, id);
    await interact(id);
    assert(
      await page.evaluate((id) => !!rivalTest.game.players[id].selected, id),
    );
    await station(id, "dough");
    await interact(id);
  }
  await tick(1.3);
  for (const id of [0, 1]) {
    await station(id, "topping");
    await interact(id);
  }
  await page.screenshot({ path: path.join(artifacts, "assembly-laptop.png") });
  // Cancelled drag spends nothing; real pointer drop uses CSS bounds after resizing.
  async function dragIngredient(id, key, drop) {
    const panel = page.locator(".player").nth(id).locator(".panel"),
      b = await panel
        .locator('[data-action="add"][data-key="' + key + '"]')
        .boundingBox(),
      r = await panel.locator(".pizza-drop").boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      drop ? r.x + r.width / 2 : 5,
      drop ? r.y + r.height / 2 : 5,
      { steps: 10 },
    );
    await page.mouse.up();
  }
  const sauce = await page.evaluate(() => rivalTest.game.teams[0].stock.sauce);
  await dragIngredient(0, "sauce", false);
  assert.equal(
    await page.evaluate(() => rivalTest.game.teams[0].stock.sauce),
    sauce,
  );
  await dragIngredient(0, "sauce", true);
  assert.equal(
    await page.evaluate(() => rivalTest.game.teams[0].stock.sauce),
    sauce - 1,
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(150);
  await dragIngredient(0, "cheese", true);
  await page
    .locator(".player")
    .nth(0)
    .getByRole("button", { name: "Confirm assembly" })
    .click();
  assert.equal(
    await page.evaluate(() => rivalTest.game.players[0].hand.stage),
    "raw",
  );
  // Red completes exclusively through its keyboard focus while Blue can move.
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  assert.equal(
    await page.evaluate(() => rivalTest.game.players[1].hand.stage),
    "raw",
  );
  // Blue keyboard assembly is also exercised in the next fresh match below.
  for (const id of [0, 1]) {
    await station(id, "oven");
    await interact(id);
  }
  await tick(3.1);
  for (const id of [0, 1]) {
    await interact(id);
  }
  // Red is near its oven, so reposition Blue to collect its own without altering food state.
  await station(0, "oven");
  await interact(0);
  for (const id of [0, 1]) {
    assert.equal(
      await page.evaluate((id) => rivalTest.game.players[id].hand?.stage, id),
      "ready",
    );
    await page.evaluate((id) => {
      const g = rivalTest.game,
        p = g.players[id],
        o = g.order(p.hand.order),
        s = g.teams[id].seats[o.seat];
      p.x = s.approach.x;
      p.y = s.approach.y;
    }, id);
    await interact(id);
    assert.equal(
      await page.evaluate((id) => rivalTest.game.teams[id].rep, id),
      10,
    );
  }
  await page.screenshot({ path: path.join(artifacts, "duel-fullhd.png") });
  await page.keyboard.press("Escape");
  const paused = await page.evaluate(() => rivalTest.game.time);
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => rivalTest.game.time), paused);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  assert.equal(await page.evaluate(() => rivalTest.game.teams[0].rep), 0);
  assert(
    await page.evaluate(() =>
      rivalTest.game.players.every((p) => !p.panel && !p.hand),
    ),
  );
  await tick(8);
  await page.evaluate(() => {
    const g = rivalTest.game,
      p = g.players[0],
      s = g.teams[0].seats[0];
    p.x = s.approach.x;
    p.y = s.approach.y;
  });
  await interact(0);
  await station(0, "dough");
  await interact(0);
  await tick(1.3);
  await station(0, "topping");
  await interact(0);
  await page.keyboard.press("KeyE");
  await page.keyboard.press("KeyS");
  await page.keyboard.press("KeyE");
  await page.keyboard.press("KeyS");
  await page.keyboard.press("KeyS");
  await page.keyboard.press("KeyS");
  await page.keyboard.press("KeyE");
  assert.equal(
    await page.evaluate(() => rivalTest.game.players[0].hand.stage),
    "raw",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Main menu", exact: true }).click();
  assert(await page.locator("#match").isHidden());
  const time = await page.evaluate(() => rivalTest.game.time);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => rivalTest.game.time), time);
  // Reach the victory screen through ten cooked and delivered orders, never by setting reputation/winner.
  await page.getByRole("button", { name: "Play", exact: true }).click();
  const outcome = await page.evaluate(() => {
    const g = rivalTest.game,
      p = g.players[0],
      t = g.teams[0];
    g.nextRats = Infinity;
    g.nextVIP = Infinity;
    const tick = (seconds) => {
      for (let i = 0; i < seconds * 120; i++) g.step(1 / 120);
    };
    const visit = (type) => {
      const s = t.stations.find((s) => s.type === type);
      p.x = s.x;
      p.y = s.y + 70;
      p.panel = null;
      g.interact(p);
    };
    for (let n = 0; n < 10; n++) {
      tick(8);
      let o = t.customers.find((c) => !c.departing && c.state !== "entering");
      if (!o) {
        g.addCustomer(t);
        tick(8);
        o = t.customers.find((c) => !c.departing && c.state !== "entering");
      }
      const seat = t.seats[o.seat];
      p.x = seat.approach.x;
      p.y = seat.approach.y;
      g.interact(p);
      visit("terminal");
      if (!g.select(p, o.id)) throw Error("terminal select failed");
      visit("supply");
      for (const key of Kitchen.recipes[o.recipe].items)
        if (t.stock[key] === 0 && !g.buy(p, key)) throw Error("restock failed");
      p.panel = null;
      visit("dough");
      tick(1.3);
      visit("topping");
      for (const key of Kitchen.recipes[o.recipe].items.filter(
        (k) => k !== "dough",
      ))
        if (!g.addIngredient(p, key)) throw Error("ingredient failed");
      if (!g.assemble(p)) throw Error("assembly failed");
      visit("oven");
      tick(3.1);
      g.interact(p);
      p.x = seat.approach.x;
      p.y = seat.approach.y;
      g.interact(p);
      if (t.rep !== (n + 1) * 10) throw Error("delivery failed");
    }
    return { winner: g.winner, rep: t.rep, served: t.served };
  });
  assert.deepEqual(outcome, { winner: 0, rep: 100, served: 10 });
  await page.getByRole("button", { name: "Rematch", exact: true }).click();
  assert.equal(await page.evaluate(() => rivalTest.game.winner), null);
  assert.equal(await page.evaluate(() => rivalTest.game.teams[0].rep), 0);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.evaluate(() => {
    const g = rivalTest.game;
    g.nextRats = Infinity;
    g.nextVIP = Infinity;
    for (const id of [0, 1]) {
      const t = g.teams[id],
        p = g.players[id];
      t.money = 140;
      const s = t.stations.find((s) => s.type === "waiter");
      p.x = s.x;
      p.y = s.y + 70;
      g.interact(p);
      p.x = Kitchen.mirror(id, 420);
      p.y = 650;
    }
    for (let i = 0; i < 105 * 120; i++) g.step(1 / 120);
    rivalTest.refresh();
  });
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(artifacts, "six-seats-laptop.png") });
  assert.deepEqual(errors, []);
  console.log(
    "PASS browser: HTTP launch, menu, actual audio gain, two-player input, local window focus, purchases, both keyboard assembly flows, cancelled/successful pointer drag at 1366x768 and 1920x1080, both baked deliveries, terminal selection, ten actual deliveries to victory, rematch, six seated guests, pause, restart and main menu; zero page errors.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
