const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const out =
  process.env.ARTIFACT_DIR ||
  path.join(require("node:os").tmpdir(), "pizza-jam");
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const url = (process.env.GAME_URL || "http://127.0.0.1:8000/") + "?test=1";
  await page.goto(url);
  assert(
    await page
      .getByRole("button", { name: "Competitive Mode", exact: true })
      .isDisabled(),
  );
  assert(await page.locator("#match").isHidden());
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator("#volume").fill("0.25");
  await page.locator("#sound-toggle").uncheck();
  assert.equal(await page.evaluate(() => rivalTest.sound.gain), 0);
  await page.locator("#sound-toggle").check();
  assert.equal(await page.evaluate(() => rivalTest.sound.gain), 0.25);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.screenshot({ path: path.join(out, "menu-locked.png") });
  const tick = async (s) =>
    page.evaluate((s) => {
      const g = rivalTest.game;
      for (let i = 0; i < Math.ceil(s * 120) && g.winner === null; i++)
        g.step(1 / 120, [{}, g.tutorial?.input() || {}]);
      rivalTest.refresh();
    }, s);
  const pos = async (x, y, id = 0) =>
    page.evaluate(
      ({ x, y, id }) => {
        const p = rivalTest.game.players[id];
        p.x = x;
        p.y = y;
      },
      { x, y, id },
    );
  async function close(id = 0) {
    if (await page.evaluate((id) => !!rivalTest.game.players[id].panel, id))
      await page.keyboard.press(id ? "KeyO" : "KeyI");
  }
  async function station(type, id = 0) {
    await close(id);
    const s = await page.evaluate(
      ({ type, id }) =>
        rivalTest.game.teams[id].stations.find((s) => s.type === type),
      { type, id },
    );
    await pos(s.approach.x, s.approach.y, id);
    await page.keyboard.press(id ? "Enter" : "KeyE");
    await tick(0.02);
  }
  async function guest(id = 0, vip = false) {
    await close(id);
    const target = await page.evaluate(
      ({ id, vip }) => {
        const g = rivalTest.game,
          o = vip
            ? g.vip
            : g.teams[id].customers.find(
                (c) => !c.departing && c.state !== "entering",
              );
        return (vip ? g.vipSeats[o.seat] : g.teams[id].seats[o.seat]).approach;
      },
      { id, vip },
    );
    await pos(target.x, target.y, id);
    await page.keyboard.press(id ? "Enter" : "KeyE");
    await tick(0.02);
  }
  async function assemble(id = 0) {
    await station("topping", id);
    const keys = await page.evaluate(
      (id) =>
        Kitchen.recipes[rivalTest.game.players[id].hand.recipe].items.filter(
          (k) => k !== "dough",
        ),
      id,
    );
    for (const k of keys)
      await page
        .locator(".player")
        .nth(id)
        .locator('[data-action="add"][data-key="' + k + '"]')
        .click();
    await page
      .locator(".player")
      .nth(id)
      .getByRole("button", { name: "Confirm assembly" })
      .click();
    await tick(0.02);
  }
  async function bake(id = 0) {
    await station("oven", id);
    await tick(3.1);
    await page.keyboard.press(id ? "Enter" : "KeyE");
    await tick(0.02);
  }
  async function playTutorial(failOnce = false) {
    await page.getByRole("button", { name: "Tutorial", exact: true }).click();
    let failed = false,
      guard = 0;
    while (await page.evaluate(() => !rivalTest.game.tutorial.done)) {
      assert(++guard < 70);
      const key = await page.evaluate(() => rivalTest.game.tutorial.step.key);
      switch (key) {
        case "move":
          await page.keyboard.down("KeyD");
          await page.waitForTimeout(650);
          await page.keyboard.up("KeyD");
          break;
        case "sign":
          await station("sign");
          await tick(0.4);
          await page.keyboard.press("KeyE");
          await tick(0.1);
          break;
        case "greet":
          await tick(8);
          await guest();
          break;
        case "terminal":
          await station("terminal");
          await page
            .getByRole("button", { name: "Select", exact: true })
            .first()
            .click();
          await tick(0.02);
          break;
        case "inventory":
          await page.locator('.player.blue [data-stock="cheese"]').click();
          await tick(0.02);
          break;
        case "buy":
          await station("supply");
          await page
            .locator('.player.blue [data-action="buy"][data-key="cheese"]')
            .click();
          await tick(0.02);
          break;
        case "dough":
          await station("dough");
          await tick(1.3);
          break;
        case "ingredients": {
          await station("topping");
          await page.screenshot({
            path: path.join(
              out,
              "tutorial-assembly-" + (await page.viewportSize()).width + ".png",
            ),
          });
          const sauce = page.locator(
              '.player.blue [data-action="add"][data-key="sauce"]',
            ),
            b = await sauce.boundingBox(),
            d = await page.locator(".player.blue .pizza-drop").boundingBox();
          await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
          await page.mouse.down();
          await page.mouse.move(2, 2, { steps: 8 });
          await page.mouse.up();
          assert(
            !(await page.evaluate(
              () => rivalTest.game.players[0].hand.added.length,
            )),
          );
          await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
          await page.mouse.down();
          await page.mouse.move(d.x + d.width / 2, d.y + d.height / 2, {
            steps: 8,
          });
          await page.mouse.up();
          await page.keyboard.press("KeyS");
          await page.keyboard.press("KeyE");
          await tick(0.02);
          break;
        }
        case "raw":
          await page.getByRole("button", { name: "Confirm assembly" }).click();
          await tick(0.02);
          break;
        case "oven":
          await station("oven");
          break;
        case "collect":
          if (failOnce && !failed) {
            await tick(16);
            assert.equal(
              await page.evaluate(() => rivalTest.game.teams[0].oven.stage),
              "burned",
            );
            await page
              .getByRole("button", { name: "Restart lesson", exact: true })
              .click();
            failed = true;
          } else {
            await tick(3.1);
            await page.keyboard.press("KeyE");
            await tick(0.02);
          }
          break;
        case "serve":
          await guest();
          break;
        case "waiter":
          await station("waiter");
          await tick(18);
          break;
        case "auto-order":
          await station("dough");
          await tick(1.3);
          break;
        case "auto-cook":
          await assemble();
          await bake();
          await guest();
          break;
        case "assistant":
          await station("assistant");
          await tick(45);
          break;
        case "banana":
          await station("banana");
          await pos(570, 610);
          await page.evaluate(() => {
            rivalTest.game.players[0].faceX = 1;
            rivalTest.game.players[0].faceY = 0;
          });
          await page.keyboard.press("KeyQ");
          await tick(3);
          break;
        case "flour":
          await station("flour");
          await pos(570, 610);
          await page.evaluate(() => {
            rivalTest.game.players[0].faceX = 1;
            rivalTest.game.players[0].faceY = 0;
          });
          await page.keyboard.press("KeyQ");
          await tick(0.5);
          break;
        case "sauce":
          await station("bottle");
          await pos(660, 695);
          await page.evaluate(() => {
            rivalTest.game.players[0].faceX = 0;
            rivalTest.game.players[0].faceY = 1;
          });
          await page.keyboard.press("KeyQ");
          await tick(0.02);
          break;
        case "clean":
          await page.keyboard.down("KeyE");
          await page.waitForTimeout(2750);
          await page.keyboard.up("KeyE");
          break;
        case "rats": {
          await pos(550, 270);
          let count = 0;
          while (
            !(await page.evaluate(() =>
              rivalTest.game.rats.some((r) => r.stolen),
            ))
          ) {
            assert(++count < 100);
            await tick(0.1);
          }
          const r = await page.evaluate(() =>
            rivalTest.game.rats.find((r) => r.stolen),
          );
          await pos(r.x + 35, r.y);
          await tick(0.02);
          const d = await page.evaluate(() =>
            rivalTest.game.drops.find((d) => d.item.kind === "ingredient"),
          );
          assert(d);
          await pos(d.x, d.y);
          await page.keyboard.press("KeyE");
          await tick(0.02);
          break;
        }
        case "vip":
          await guest(0, true);
          {
            const missing = await page.evaluate(() => {
              const g = rivalTest.game;
              return Kitchen.recipes[g.vip.recipe].items.filter(
                (k) => g.teams[0].stock[k] === 0,
              );
            });
            if (missing.length) {
              await station("supply");
              for (const k of missing)
                await page
                  .locator(
                    '.player.blue [data-action="buy"][data-key="' + k + '"]',
                  )
                  .click();
            }
          }
          await station("dough");
          await tick(1.3);
          await assemble();
          await bake();
          await guest(0, true);
          break;
        default:
          throw Error(key);
      }
      console.log("BROWSER LESSON", key);
    }
    assert(await page.evaluate(() => rivalTest.tutorialComplete));
  }
  await playTutorial(true);
  assert.equal(
    await page.evaluate(() => localStorage.getItem("pizza-tutorial-v1")),
    "complete",
  );
  await page.getByRole("button", { name: "Main menu", exact: true }).click();
  await page.reload();
  assert(
    !(await page
      .getByRole("button", { name: "Competitive Mode", exact: true })
      .isDisabled()),
  );
  await page.getByRole("button", { name: "Tutorial", exact: true }).click();
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  assert(
    !(await page
      .getByRole("button", { name: "Competitive Mode", exact: true })
      .isDisabled()),
  );
  await page
    .getByRole("button", { name: "Competitive Mode", exact: true })
    .click();
  const before = await page.evaluate(() => ({
    x: rivalTest.game.players[0].x,
    time: rivalTest.game.time,
    cash: rivalTest.game.teams[0].money,
  }));
  await page.keyboard.press("KeyE");
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(400);
  await page.keyboard.up("KeyD");
  assert.deepEqual(
    await page.evaluate(() => ({
      x: rivalTest.game.players[0].x,
      time: rivalTest.game.time,
      cash: rivalTest.game.teams[0].money,
    })),
    before,
  );
  await page.locator("#countdown").waitFor({ state: "hidden" });
  await tick(8);
  const xs = await page.evaluate(() => rivalTest.game.players.map((p) => p.x));
  await page.keyboard.down("KeyD");
  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(150);
  await page.keyboard.up("KeyD");
  await page.keyboard.up("ArrowLeft");
  assert(
    await page.evaluate(
      (xs) =>
        rivalTest.game.players[0].x > xs[0] &&
        rivalTest.game.players[1].x < xs[1],
      xs,
    ),
  );
  for (const id of [0, 1]) {
    await guest(id);
    await station("dough", id);
    await tick(1.3);
    await station("topping", id);
  }
  // Each keyboard owns its own assembly focus. A resize does not change pointer targeting.
  await page.setViewportSize({ width: 1920, height: 1080 });
  for (const [id, select, down] of [
    [0, "KeyE", "KeyS"],
    [1, "Enter", "ArrowDown"],
  ]) {
    await page.keyboard.press(select);
    await page.keyboard.press(down);
    await page.keyboard.press(select);
    for (let i = 0; i < 3; i++) await page.keyboard.press(down);
    await page.keyboard.press(select);
    assert.equal(
      await page.evaluate((id) => rivalTest.game.players[id].hand.stage, id),
      "raw",
    );
    await bake(id);
    await guest(id);
    assert.equal(
      await page.evaluate((id) => rivalTest.game.teams[id].rep, id),
      10,
    );
  }
  await page.screenshot({ path: path.join(out, "competitive-fullhd.png") });
  await station("flour", 0);
  await pos(950, 900, 0);
  await pos(1100, 900, 1);
  await page.evaluate(() => {
    const p = rivalTest.game.players[0];
    p.faceX = 1;
    p.faceY = 0;
  });
  await page.keyboard.press("KeyQ");
  await tick(0.4);
  assert(
    await page.evaluate(
      () =>
        rivalTest.game.players[1].flourTime > 0 &&
        rivalTest.game.players[0].flourTime === 0,
    ),
  );
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.screenshot({ path: path.join(out, "flour-local-viewport.png") });
  await page.evaluate(() => rivalTest.game.spawnVIP(4));
  await page.screenshot({ path: path.join(out, "vip-four-banner.png") });
  await page.keyboard.press("Escape");
  const time = await page.evaluate(() => rivalTest.game.time);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => rivalTest.game.time), time);
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  assert(await page.evaluate(() => rivalTest.game.countdown > 0));
  await tick(4);
  // Deterministic genuine bankruptcy: no available stock, paying work or affordable pack.
  await page.evaluate(() => {
    const g = rivalTest.game;
    g.teams[0].money = 0;
    Kitchen.stockKeys.forEach((k) => (g.teams[0].stock[k] = 0));
  });
  await page.getByRole("button", { name: "Rematch", exact: true }).click();
  assert(await page.evaluate(() => rivalTest.game.countdown > 0));
  assert.equal(await page.evaluate(() => rivalTest.game.teams[0].money), 60);
  // Session fallback with storage blocked uses the same complete practical tutorial.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Main menu", exact: true }).click();
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("storage disabled");
      },
      configurable: true,
    });
  });
  await page.reload();
  assert(
    await page
      .getByRole("button", { name: "Competitive Mode", exact: true })
      .isDisabled(),
  );
  await playTutorial(false);
  await page.getByRole("button", { name: "Main menu", exact: true }).click();
  assert(
    !(await page
      .getByRole("button", { name: "Competitive Mode", exact: true })
      .isDisabled()),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS browser: complete tutorial twice, real recovery, persisted and in-session unlock, audio, countdown, both cooking inputs, drag cancellation/drop, staff/gadgets/VIP tutorial, bankruptcy, rematch, pause, resize; no page errors.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
