const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const out = process.env.ARTIFACT_DIR || "/tmp/pizza-playtest";
fs.mkdirSync(out, { recursive: true });
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
  const measurements = await page.evaluate(() => {
    const result = [];
    for (const [w, h] of [
      [670, 520],
      [950, 830],
      [450, 350],
    ]) {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const x = c.getContext("2d");
      for (const left of [2.5, 1.4, 0.1, 0]) {
        x.clearRect(0, 0, w, h);
        RivalRenderer.flourMask(x, w, h, left);
        const data = x.getImageData(0, 0, w, h).data;
        let dense = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i] > 230) dense++;
        result.push({
          w,
          h,
          left,
          dense: dense / (w * h),
          center: data[(Math.floor(h / 2) * w + Math.floor(w / 2)) * 4 + 3],
        });
      }
    }
    return result;
  });
  for (const m of measurements) {
    if (m.left === 2.5) {
      assert(m.dense >= 0.75 && m.dense <= 0.85, JSON.stringify(m));
      assert(m.center > 240);
    }
    if (!m.left) assert.equal(m.center, 0);
  }
  console.log("FLOUR PIXELS", JSON.stringify(measurements));
  const stains = await page.evaluate(() => {
    const g = rivalTest.game,
      table = g.teams[0].tables[2];
    table.dirty = true;
    table.stains = g.makeStains(table);
    const original = JSON.stringify(table.stains);
    const draw = (offset, progress = 0) => {
      const c = document.createElement("canvas");
      c.width = 320;
      c.height = 180;
      const x = c.getContext("2d");
      x.translate(160 - table.x - offset, 90 - table.y);
      x.translate(offset, 0);
      table.cleanProgress = progress;
      RivalRenderer.tableStains(x, table);
      return x.getImageData(0, 0, 320, 180).data;
    };
    const a = draw(0),
      b = draw(137),
      f = draw(0, 0.5);
    let outside = 0,
      alpha = 0,
      fade = 0;
    for (let i = 3; i < a.length; i += 4) {
      const px = ((i - 3) / 4) % 320,
        py = Math.floor((i - 3) / 4 / 320);
      if (
        (Math.abs(px - 160) > table.w / 2 - 3 ||
          Math.abs(py - 90) > table.h / 2 - 3) &&
        a[i]
      )
        outside++;
      alpha += a[i];
      fade += f[i];
    }
    return {
      same: a.every((v, i) => v === b[i]),
      stable: original === JSON.stringify(table.stains),
      outside,
      ratio: fade / alpha,
    };
  });
  assert(stains.same && stains.stable);
  assert.equal(stains.outside, 0);
  assert(stains.ratio > 0.48 && stains.ratio < 0.85);
  console.log("STAINS", stains);
  // Help text scrolls internally, preserving the actual Back button at small sizes.
  await page.getByRole("button", { name: "How to Play", exact: true }).click();
  for (const size of [
    { width: 1366, height: 768 },
    { width: 800, height: 600 },
    { width: 900, height: 500 },
  ]) {
    await page.setViewportSize(size);
    const b = await page
      .getByRole("button", { name: "Back", exact: true })
      .boundingBox();
    assert(b.y >= 0 && b.y + b.height <= size.height);
    const scroll = await page.locator("#description").evaluate((e) => ({
      height: e.clientHeight,
      scroll: e.scrollHeight,
      color: getComputedStyle(e).color,
    }));
    assert(scroll.height < scroll.scroll);
    assert.equal(scroll.color, "rgb(220, 227, 232)");
    await page
      .locator("#description")
      .evaluate((e) => (e.scrollTop = e.scrollHeight));
    await page.screenshot({ path: path.join(out, `help-${size.height}.png`) });
  }
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole("button", { name: "Tutorial", exact: true }).click();
  await page.evaluate(() => {
    const g = rivalTest.game,
      t = g.tutorial;
    t.index = t.steps.findIndex((s) => s.key === "sign");
    t.startStep();
    t.updateGuide();
    rivalTest.refresh();
  });
  await page.screenshot({ path: path.join(out, "tutorial-route-door.png") });
  await page.evaluate(() => {
    const g = rivalTest.game,
      t = g.tutorial;
    t.index = t.steps.findIndex((s) => s.key === "buy");
    t.startStep();
    const p = g.players[0];
    Object.assign(p, t.station("supply").approach);
    g.interact(p);
    t.updateGuide();
    rivalTest.refresh();
  });
  assert(
    await page
      .locator('.lesson-target[data-action="buy"][data-key="cheese"]')
      .isVisible(),
  );
  assert(await page.evaluate(() => !rivalTest.game.tutorial.guide.goal));
  await page.screenshot({ path: path.join(out, "tutorial-button-hint.png") });
  await page.evaluate(() => {
    rivalTest.game.reset("competitive");
    rivalTest.show("play");
    rivalTest.game.countdown = 0;
  });
  const staff = await page.evaluate(() => {
    const g = rivalTest.game,
      check = (x, m) => {
        if (!x) throw Error(m);
      },
      tick = (s) => {
        for (let i = 0; i < s * 120; i++) g.step(1 / 120);
      },
      visit = (id, type) => {
        const p = g.players[id];
        Object.assign(
          p,
          g.teams[id].stations.find((s) => s.type === type).approach,
        );
        p.panel = null;
        g.interact(p);
      };
    g.nextRats = g.nextVIP = Infinity;
    g.teams.forEach((t) => {
      t.open = false;
      t.money = 1000;
    });
    tick(8);
    for (const id of [0, 1]) {
      visit(id, "waiter");
      visit(id, "assistant");
    }
    tick(45);
    for (const t of g.teams) {
      check(t.served === 1, "autonomous delivery");
      check(t.rep === 10, "one payment");
    }
    // Genuine delivery victories for both teams, with isolated reset and controlled arrivals.
    const wins = [];
    for (const id of [0, 1]) {
      g.reset();
      g.countdown = 0;
      g.nextRats = g.nextVIP = Infinity;
      g.teams.forEach((t) => (t.open = false));
      const t = g.teams[id];
      t.money = 1000;
      Kitchen.stockKeys.forEach((k) => (t.stock[k] = 12));
      visit(id, "assistant");
      visit(id, "waiter");
      for (let n = 0; n < 10; n++) {
        if (n) {
          t.open = true;
          g.addCustomer(t);
          t.open = false;
        }
        for (let i = 0; i < 7200 && t.served < n + 1; i++) g.step(1 / 120);
        check(t.served === n + 1, "service " + n);
      }
      check(g.winner === id, "winner");
      wins.push({ id, served: t.served, rep: t.rep, time: g.time });
    }
    return wins;
  });
  console.log("BROWSER STAFF VICTORIES", staff);
  await page.evaluate(() => {
    rivalTest.game.reset("competitive");
    rivalTest.show("play");
    const g = rivalTest.game;
    g.countdown = 0;
    g.nextRats = g.nextVIP = Infinity;
    g.players[0].x = 1000;
    g.players[0].y = 450;
    g.players[1].x = 1000;
    g.players[1].y = 750;
  });
  await page.screenshot({ path: path.join(out, "central-markets.png") });
  const overview = await page.evaluate(() => {
    const g = rivalTest.game;
    g.players[0].x = 420;
    g.players[0].y = 1040;
    g.players[1].x = 1580;
    g.players[1].y = 1040;
    for (const t of g.teams) {
      const table = t.tables[2];
      table.dirty = true;
      table.stains = g.makeStains(table);
    }
    const c = document.createElement("canvas");
    c.width = 2000;
    c.height = 1200;
    RivalRenderer.render(c.getContext("2d"), g, 0);
    return c.toDataURL().split(",")[1];
  });
  fs.writeFileSync(
    path.join(out, "world-overview.png"),
    Buffer.from(overview, "base64"),
  );
  // Render two equal camera views: flour is local, even with exactly the same world/camera.
  const local = await page.evaluate(() => {
    const g = rivalTest.game;
    g.players.forEach((p) => {
      p.x = 420;
      p.y = 580;
      p.panel = null;
      p.flourTime = 0;
    });
    const draw = (id) => {
      const c = document.createElement("canvas");
      c.width = 670;
      c.height = 520;
      RivalRenderer.render(c.getContext("2d"), g, id);
      return c.getContext("2d").getImageData(0, 0, 670, 520).data;
    };
    const before = draw(0);
    g.players[1].flourTime = 2.5;
    const unaffected = draw(0),
      affected = draw(1);
    return {
      same: before.every((v, i) => {
        const pixel = Math.floor(i / 4);
        return (
          (Math.abs((pixel % 670) - 335) < 60 &&
            Math.abs(Math.floor(pixel / 670) - 260) < 60) ||
          v === unaffected[i]
        );
      }),
      changed: affected.some((v, i) => v !== before[i]),
    };
  });
  assert(local.same && local.changed);
  await page.keyboard.press("Escape");
  const left = await page.evaluate(() => rivalTest.game.players[1].flourTime);
  await page.waitForTimeout(250);
  assert.equal(
    await page.evaluate(() => rivalTest.game.players[1].flourTime),
    left,
  );
  await page.screenshot({ path: path.join(out, "flour-pause.png") });
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.screenshot({ path: path.join(out, "flour-dense.png") });
  await page.evaluate(() => {
    const g = rivalTest.game;
    for (let i = 0; i < 400; i++) g.step(1 / 120);
  });
  assert.equal(
    await page.evaluate(() => rivalTest.game.players[1].flourTime),
    0,
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Main menu", exact: true }).click();
  assert(
    await page.evaluate(
      () =>
        rivalTest.game.players.every((p) => !p.flourTime) &&
        rivalTest.game.teams.every((t) => !t.cooks.length && !t.waiter),
    ),
  );
  const helpers = fs.readFileSync(path.join(__dirname, "helpers.cjs"), "utf8");
  const helperBody = helpers.slice(
    helpers.indexOf("function tick("),
    helpers.indexOf("module.exports"),
  );
  const regressionFile = fs.readFileSync(
    path.join(__dirname, "playtest.test.cjs"),
    "utf8",
  );
  const regressions = regressionFile.slice(regressionFile.indexOf("let count"));
  const groups = await page.evaluate(
    (source) => {
      const assert = (v, m) => {
        if (!v) throw Error(m || "assertion failed");
      };
      assert.equal = (a, b, m) =>
        assert(a === b, m || String(a) + " !== " + String(b));
      assert.notEqual = (a, b, m) => assert(a !== b, m);
      assert.match = (a, re) => assert(re.test(a), a);
      return new Function("assert", "Game", "K", "Tutorial", source)(
        assert,
        RivalGame.Game,
        Kitchen,
        KitchenTutorial,
      );
    },
    helperBody + "\n" + regressions + "\nreturn count;",
  );
  assert.equal(groups, 16);
  console.log("PASS all 16 risky-transition groups repeated inside Chromium");
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    path.join(out, "visual-metrics.json"),
    JSON.stringify({ measurements, stains, staff }, null, 2),
  );
  await browser.close();
  console.log(
    "PASS browser pixels, stable clipped stains, responsive help, tutorial route/button, staff victories, local flour, pause/menu cleanup; no page errors",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
