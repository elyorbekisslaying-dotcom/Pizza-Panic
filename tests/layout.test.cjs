const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const out = process.env.ARTIFACT_DIR || "/tmp/pizza-layout";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem("pizza-tutorial-v1", "complete"),
  );
  await page.goto(
    (process.env.GAME_URL || "http://127.0.0.1:8000/") + "?test=1",
  );
  for (const [width, height] of [
    [1366, 768],
    [1024, 600],
    [800, 600],
    [960, 540],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => {
      rivalTest.startTutorial();
      const g = rivalTest.game,
        t = g.teams[0],
        p = g.players[0];
      for (let i = 0; i < 12 * 120; i++) g.step(1 / 120);
      const o = t.customers[0];
      g.accept(o, 0);
      p.selected = o.id;
      t.stock.cheese = 8;
      Object.assign(p, t.stations.find((s) => s.type === "dough").approach);
      g.interact(p);
      for (let i = 0; i < 160; i++) g.step(1 / 120);
      Object.assign(p, t.stations.find((s) => s.type === "topping").approach);
      g.interact(p);
      g.tutorial.index = g.tutorial.steps.findIndex(
        (s) => s.key === "ingredients",
      );
      g.tutorial.startStep();
      g.tutorial.updateGuide();
      rivalTest.refresh();
    });
    const measure = await page.evaluate(() => {
      const panel = document
          .querySelector(".blue .panel")
          .getBoundingClientRect(),
        guide = document.querySelector("#instructor").getBoundingClientRect();
      const footer = document
        .querySelector(".blue .panel footer")
        .getBoundingClientRect();
      return {
        panel: { top: panel.top, bottom: panel.bottom, height: panel.height },
        guide: { bottom: guide.bottom },
        footer: { top: footer.top, bottom: footer.bottom },
        color: getComputedStyle(document.querySelector(".lesson-target"))
          .outlineColor,
        path: rivalTest.game.tutorial.guide.path.length,
      };
    });
    assert(measure.panel.top >= measure.guide.bottom);
    assert(measure.footer.bottom <= height);
    assert(measure.panel.height > 200);
    assert.equal(measure.color, "rgb(255, 218, 87)");
    assert.equal(measure.path, 0);
    // Real mouse drag onto dough followed by keyboard ingredient selection.
    const sauce = page.locator('.blue [data-action="add"][data-key="sauce"]'),
      dough = page.locator(".blue .pizza-drop");
    await sauce.scrollIntoViewIfNeeded();
    await dough.scrollIntoViewIfNeeded();
    const a = await sauce.boundingBox(),
      b = await dough.boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
    assert(
      await page.evaluate(() =>
        rivalTest.game.players[0].hand.added.includes("sauce"),
      ),
    );
    await page.evaluate(() => {
      rivalTest.game.players[0].cursor = 1;
      rivalTest.refresh();
    });
    await page.keyboard.press("KeyE");
    assert(
      await page.evaluate(() =>
        rivalTest.game.players[0].hand.added.includes("cheese"),
      ),
    );
    await page.screenshot({
      path: path.join(out, `assembly-${width}x${height}.png`),
    });
    await page
      .getByRole("button", { name: "Confirm assembly", exact: true })
      .click();
    assert.equal(
      await page.evaluate(() => rivalTest.game.players[0].hand.stage),
      "raw",
    );
    await page.locator("#collapse-instructor").click();
    assert(await page.locator("#lesson-text").isHidden());
    await page.locator("#collapse-instructor").click();
    assert(await page.locator("#lesson-text").isVisible());
  }
  console.log(
    "PASS four screen sizes: assembly drag, keyboard ingredients, yellow lesson target, hidden world route, reachable footer, instructor collapse",
  );
  // Browser production simulation: four cooks and one waiter serve ten real customers for each side.
  const wins = await page.evaluate(() => {
    rivalTest.start();
    const g = rivalTest.game;
    const results = [];
    function check(ok, message) {
      if (!ok) throw Error(message);
    }
    const visit = (id, type) => {
      const p = g.players[id];
      p.panel = null;
      Object.assign(
        p,
        g.teams[id].stations.find((s) => s.type === type).approach,
      );
      g.interact(p);
    };
    for (const id of [0, 1]) {
      g.reset();
      g.countdown = 0;
      g.nextRats = g.nextVIP = Infinity;
      g.teams.forEach((t) => (t.open = false));
      const t = g.teams[id];
      t.money = 10000;
      Kitchen.stockKeys.forEach((k) => (t.stock[k] = 50));
      for (let i = 1; i < 10; i++) {
        t.open = true;
        g.addCustomer(t);
        t.open = false;
      }
      for (let i = 0; i < 12 * 60; i++) g.step(1 / 60);
      t.customers.forEach((o) => {
        g.accept(o, id);
        o.patience = 1000;
      });
      for (let i = 0; i < 4; i++) visit(id, "assistant");
      visit(id, "waiter");
      for (let i = 0; i < 600 * 60 && g.winner === null; i++) {
        g.step(1 / 60);
        const jobs = t.cooks.filter((a) => a.job).map((a) => a.job.order);
        check(new Set(jobs).size === jobs.length, "duplicate cook claim");
        const dishes = [
          ...t.ovens,
          ...t.pickup,
          ...t.cooks.map((a) => a.food),
          t.waiter?.pizza,
        ].filter(Boolean);
        check(
          new Set(dishes.map((f) => f.order)).size === dishes.length,
          "duplicate dish",
        );
      }
      check(g.winner === id && t.served === 10, "four-cook delivery victory");
      results.push({ id, served: t.served, rep: t.rep, time: g.time });
    }
    g.reset();
    g.countdown = 0;
    rivalTest.refresh();
    return results;
  });
  console.log("PASS Chromium four-cook victories", JSON.stringify(wins));
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.evaluate(() => {
    const g = rivalTest.game;
    g.countdown = 0;
    for (const t of g.teams) {
      t.money = 10000;
      t.open = false;
      for (let i = 0; i < 4; i++) {
        const p = g.players[t.id];
        Object.assign(
          p,
          t.stations.find((s) => s.type === "assistant").approach,
        );
        g.interact(p);
      }
      Object.assign(g.players[t.id], { x: Kitchen.mirror(t.id, 430), y: 405 });
    }
    rivalTest.refresh();
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(out, "shared-kitchens.png") });
  // Actual keyboard dispatch leaves attack/dash inert, window I/O still works.
  for (const key of ["KeyF", "Slash", "ShiftLeft", "ShiftRight"])
    await page.keyboard.press(key);
  assert(
    await page.evaluate(() =>
      rivalTest.game.players.every(
        (p) => !("attack" in p) && !("dashTime" in p),
      ),
    ),
  );
  await page.evaluate(() => {
    Object.assign(
      rivalTest.game.players[0],
      rivalTest.game.teams[0].stations.find((s) => s.type === "terminal")
        .approach,
    );
  });
  await page.keyboard.press("KeyI");
  assert.equal(
    await page.evaluate(() => rivalTest.game.players[0].panel),
    "terminal",
  );
  await page.keyboard.press("KeyI");
  // Immunity really alternates fully invisible frames, using production rendering.
  const blink = await page.evaluate(() => {
    const g = rivalTest.game,
      p = g.players[0];
    p.immune = 2.5;
    p.hidden = false;
    p.hand = null;
    const draw = (time) => {
      g.time = time;
      const c = document.createElement("canvas");
      c.width = 670;
      c.height = 520;
      RivalRenderer.render(c.getContext("2d"), g, 0);
      return c.toDataURL();
    };
    p.hidden = true;
    const hidden = draw(0.15);
    p.hidden = false;
    const invisible = draw(0.15),
      visible = draw(0.2);
    return { invisible: invisible === hidden, visible: visible !== hidden };
  });
  assert(blink.invisible && blink.visible);
  assert.deepEqual(errors, []);
  console.log(
    "PASS removed keys, retained I window, full visible/invisible immunity blinking; no page errors",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
