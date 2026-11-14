"use strict";
const RivalRenderer = (() => {
  const { box, oval, poly } = PizzaArt,
    ink = "#452b37";
  const text = (c, s, x, y, size = 14, color = ink) => {
    c.font = "bold " + size + "px system-ui";
    c.textAlign = "center";
    c.fillStyle = color;
    c.fillText(s, x, y);
  };
  function bar(c, x, y, w, v, color = "#69b584") {
    box(c, x, y, w, 6, 3, "#503b43");
    box(c, x, y, w * Math.max(0, Math.min(1, v)), 6, 3, color);
  }
  function food(c, item, x, y, scale = 1) {
    if (!item) return;
    if (["banana", "flour", "bottle"].includes(item.kind)) {
      GameIcons.draw(c, item.kind, x, y, scale);
      return;
    }
    if (item.kind === "ingredient") {
      GameIcons.draw(c, item.key, x, y, scale);
      return;
    }
    c.save();
    c.translate(x, y);
    c.scale(scale, scale);
    oval(c, 0, 0, 25, 20, item.stage === "ready" ? "#d18a45" : "#efd398", ink);
    const added = item.added || [];
    if (added.includes("sauce")) oval(c, 0, 0, 21, 16, "#c84e40");
    if (added.includes("cheese")) oval(c, 0, 0, 18, 13, "#ffd979");
    if (added.includes("pepperoni"))
      for (const [x, y] of [
        [-9, -4],
        [9, -4],
        [0, 7],
      ])
        GameIcons.draw(c, "pepperoni", x, y, 0.35);
    if (added.includes("vegetables"))
      for (const [x, y] of [
        [-9, -4],
        [9, -4],
        [0, 7],
      ])
        GameIcons.draw(c, "vegetables", x, y, 0.35);
    if (item.stage === "burned") oval(c, 0, 0, 22, 17, "#45343b");
    c.restore();
  }
  function person(c, x, y, color, vip = false) {
    oval(c, x, y + 18, 17, 6, "#38283533");
    box(c, x - 12, y, 24, 21, 8, color, ink);
    oval(c, x, y - 6, 11, 12, "#efb18a", ink);
    oval(c, x - 4, y - 7, 1.5, 2, ink);
    oval(c, x + 4, y - 7, 1.5, 2, ink);
    box(c, x - 12, y - 18, 24, 7, 4, "#5d3d40");
    if (vip)
      poly(
        c,
        [
          [x - 12, y - 21],
          [x - 14, y - 33],
          [x - 5, y - 27],
          [x, y - 37],
          [x + 6, y - 27],
          [x + 14, y - 33],
          [x + 12, y - 21],
        ],
        "#ffd05f",
      );
  }
  const labels = {
    dough: "Dough",
    topping: "Toppings",
    oven: "Oven",
    supply: "Supplies",
    serving: "Waiter pickup",
    bin: "Bin",
    storage: "Storage",
    terminal: "Orders",
    banana: "Banana · 12",
    flour: "Flour · 18",
    bottle: "Sabotage sauce · 15",
    assistant: "Assistant · 180",
    sign: "Entrance sign",
    rats: "Rat wave · 45",
    waiter: "Waiter · 100",
  };
  function station(c, s, t) {
    const { x, y, type } = s;
    if (type === "sign") {
      box(c, x - 4, y - 28, 8, 60, 3, "#9c7057", ink);
      c.save();
      c.translate(x, y);
      c.rotate(t.signFX > 0 ? Math.sin(t.signFX * 20) * 0.15 : 0);
      box(c, -38, -26, 76, 42, 6, t.open ? "#4e9976" : "#aa555c", ink);
      text(c, t.open ? "OPEN" : "CLOSED", 0, 0, 16, "#fff2d6");
      c.restore();
      return;
    }
    if (type === "assistant") {
      PizzaArt.chef(
        c,
        x,
        y - 25,
        1,
        t.assistant?.job ? Math.sin(t.assistant.job.left * 12) * 3 : 0,
        false,
        "#78aa8b",
      );
      box(c, x - 38, y, 76, 30, 6, "#dec4a0", ink);
      if (t.assistantOutput) food(c, t.assistantOutput, x, y + 10, 0.7);
      if (t.assistant?.job)
        bar(c, x - 35, y + 20, 70, 1 - t.assistant.job.left / 9);
      text(
        c,
        t.assistant ? t.assistant.state : "Assistant · 180",
        x,
        y + 52,
        11,
      );
      return;
    }

    oval(c, x, y + 29, 43, 10, "#452b3730");
    box(c, x - 38, y - 30, 76, 60, 8, Kitchen.colors[t.id], ink);
    box(c, x - 34, y - 26, 68, 45, 6, "#f1d6b1", ink);
    if (type === "dough") GameIcons.draw(c, "dough", x, y);
    if (type === "topping")
      ["sauce", "cheese", "vegetables"].forEach((k, i) =>
        GameIcons.draw(c, k, x - 23 + i * 23, y, 0.65),
      );
    if (type === "oven") {
      box(c, x - 29, y - 20, 58, 36, 8, "#4c333a", ink);
      box(c, x - 27, y - 25, 54, 5, 2, "#b9bec0");
      if (t.oven) {
        food(c, t.oven, x, y, 0.85);
        bar(
          c,
          x - 30,
          y + 22,
          60,
          t.oven.stage === "baking" ? 1 - t.oven.timer / 3 : t.oven.timer / 12,
        );
        text(c, t.oven.stage, x, y - 40, 13);
      }
    }
    if (type === "terminal") {
      box(c, x - 26, y - 21, 52, 34, 4, "#483b4e", ink);
      box(c, x - 22, y - 17, 44, 26, 2, "#add7bd");
      GameIcons.draw(c, "order", x, y - 3, 0.6);
      box(c, x - 13, y + 14, 26, 5, 2, ink);
    }
    if (type === "storage" || type === "supply") {
      for (let i = 0; i < 3; i++) {
        box(c, x - 29 + i * 20, y - 15, 18, 30, 3, "#b38966", ink);
        GameIcons.draw(c, Kitchen.stockKeys[i], x - 20 + i * 20, y, 0.55);
      }
    }
    if (type === "bin") {
      box(c, x - 16, y - 17, 32, 35, 5, "#8b9a97", ink);
      box(c, x - 19, y - 20, 38, 7, 3, "#bdccc2", ink);
      for (let i = -1; i <= 1; i++)
        box(c, x + i * 8 - 1, y - 8, 2, 20, 1, "#526762");
    }
    if (type === "serving") {
      oval(c, x, y, 28, 17, "#fff1d2", ink);
      if (t.pickup) food(c, t.pickup, x, y, 0.75);
    }
    if (["banana", "flour", "bottle"].includes(type))
      GameIcons.draw(c, type, x, y);
    if (type === "rats") rat(c, { x, y, phase: "in" }, 0);
    if (type === "waiter") person(c, x, y - 5, "#9272a1");
    box(c, x - 66, y + 34, 132, 24, 5, "#483141");
    text(
      c,
      type === "waiter" && t.waiter ? "Waiter hired" : labels[type],
      x,
      y + 51,
      13,
      "#fff2da",
    );
  }
  function rat(c, r, time) {
    c.save();
    c.translate(r.x, r.y);
    c.scale(r.phase === "out" ? -1 : 1, 1);
    c.strokeStyle = "#b98b91";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-14, 4);
    c.quadraticCurveTo(-32, -14, -28 + Math.sin(time * 12) * 4, 10);
    c.stroke();
    oval(c, 0, 0, 16, 10, "#858492", ink);
    oval(c, 12, -1, 9, 8, "#a29ca7", ink);
    oval(c, 8, -9, 5, 6, "#d8a2a1", ink);
    oval(c, 20, 1, 3, 2, "#e6a4a5");
    oval(c, 15, -3, 1.5, 2, ink);
    if (r.stolen) GameIcons.draw(c, r.stolen, 16, 12, 0.5);
    c.restore();
  }
  function chef(c, p, time) {
    if (p.hidden) return;
    c.save();
    if (p.immune) c.globalAlpha = Math.floor(time * 5) % 2 ? 0.58 : 1;
    if (p.immune) {
      c.strokeStyle = "#fff8c8";
      c.lineWidth = 4;
      c.beginPath();
      c.ellipse(p.x, p.y, 28, 35, 0, 0, Math.PI * 2);
      c.stroke();
    }
    const hold = () => {
      const x = p.x + p.faceX * 23,
        y = p.y + p.faceY * 21 + 5;
      oval(c, x - 9, y + 3, 5, 5, "#efac7b", ink);
      oval(c, x + 9, y + 3, 5, 5, "#efac7b", ink);
      food(c, p.hand, x, y, 0.7);
    };
    if (p.hand && p.faceY < -0.4) hold();
    PizzaArt.chef(
      c,
      p.x,
      p.y,
      p.faceX < 0 ? -1 : 1,
      Math.sin(p.walk) * 3.5,
      false,
      Kitchen.colors[p.id],
      !!p.hand,
    );
    if (p.hand && p.faceY >= -0.4) hold();
    if (p.flourTime > 0) {
      for (let i = 0; i < 5; i++)
        oval(
          c,
          p.x + Math.sin(i * 4) * 20,
          p.y - 15 + Math.cos(i * 3) * 12,
          8,
          5,
          "#f0eddf",
        );
    }
    if (p.attack) {
      const a = p.attack,
        angle =
          Math.atan2(a.y, a.x) +
          (a.age < 0.12 ? -0.8 * (1 - a.age / 0.12) : a.age > 0.26 ? 0.4 : 0);
      c.save();
      c.translate(p.x, p.y);
      c.rotate(angle);
      oval(c, 21, 0, 6, 5, "#efac7b", ink);
      GameIcons.draw(c, "pin", 37, 0, 0.8);
      c.restore();
    }
    if (p.prep) bar(c, p.x - 25, p.y - 45, 50, 1 - p.prep.left / 1.2);
    if (p.cleaning) bar(c, p.x - 28, p.y - 50, 56, 1 - p.cleaning.left / 2.5);
    c.restore();
  }
  function world(c, g) {
    for (let y = 40; y < 1170; y += 40)
      for (let x = 40; x < 1970; x += 40) {
        c.fillStyle =
          (x / 40 + y / 40) % 2
            ? "#f7e3c4"
            : x < 840
              ? "#c1d4c8"
              : x > 1160
                ? "#e8c6bd"
                : "#d9bf92";
        c.fillRect(x, y, 39, 39);
      }
    for (const w of g.walls) {
      box(c, w.x - w.w / 2, w.y - w.h / 2, w.w, w.h, 4, "#78525d", ink);
      box(c, w.x - w.w / 2 + 3, w.y - w.h / 2 + 2, w.w - 6, 6, 2, "#b98278");
    }
    for (const t of g.teams) {
      text(
        c,
        t.id ? "SLICE & DICE" : "THE ROLLING PIN",
        Kitchen.mirror(t.id, 420),
        70,
        24,
      );
      text(c, "DINING ROOM", Kitchen.mirror(t.id, 420), 690, 16, "#997e69");
      box(c, t.entrance.x - 65, 1115, 130, 44, 8, Kitchen.colors[t.id] + "88");
      text(c, "GUEST ENTRANCE", t.entrance.x, 1144, 13);
      oval(c, t.hole.x, t.hole.y, 25, 18, "#624a47", ink);
      oval(c, t.hole.x, t.hole.y + 4, 18, 12, "#2c2630");
      text(c, "Rat burrow", t.hole.x, t.hole.y + 36, 11);
      t.stations.forEach((s) => station(c, s, t));
      for (const s of t.seats)
        box(c, s.x - 16, s.y - 15, 32, 30, 6, "#b58966", ink);
      for (const table of t.tables) {
        box(
          c,
          table.x - table.w / 2,
          table.y - 32,
          table.w,
          64,
          10,
          "#f0c799",
          ink,
        );
        if (table.dirty) {
          for (let i = 0; i < 7; i++)
            oval(
              c,
              table.x + Math.sin(i * 8) * table.w * 0.35,
              table.y + Math.cos(i * 3) * 20,
              15 + (i % 3) * 4,
              9,
              "#b8493c",
              ink,
            );
          text(
            c,
            "DIRTY · hold E / Enter",
            table.x,
            table.y + 5,
            11,
            "#fff2d4",
          );
        }
        oval(c, table.x, table.y, 22, 17, "#fff1d5", ink);
        text(c, "T" + (table.index + 1), table.x, table.y + 5, 13);
      }
      for (const guest of t.customers) {
        const seated = ["waiting", "accepted"].includes(guest.state),
          seat = t.seats[guest.seat],
          x = seated ? seat.x : guest.x,
          y = seated ? seat.y : guest.y;
        c.save();
        c.translate(x, y);
        const look = guest.look || 0;
        c.scale(
          look === 2 || look === 5 ? 0.75 : look === 1 ? 1.12 : 1,
          look === 2 || look === 5 ? 0.8 : look === 4 ? 1.12 : 1,
        );
        person(
          c,
          0,
          0,
          ["#91ac7a", "#c48469", "#91ac7a", "#8c9ab8", "#9d81aa", "#8c9ab8"][
            look
          ],
        );
        if (look === 1 || look === 4) {
          oval(c, -4, -7, 4, 3, null, "#513d40");
          oval(c, 4, -7, 4, 3, null, "#513d40");
        }
        if (look === 3) oval(c, -11, -10, 6, 10, "#b98051", ink);
        c.restore();
        if (guest.departing)
          text(
            c,
            guest.patience <= 0 ? "Too slow!" : "Thank you!",
            x,
            y - 40,
            12,
            guest.patience <= 0 ? "#aa3e44" : "#507d53",
          );
        if (seated) {
          box(c, x - 31, y - 65, 62, 27, 5, "#fff6df", ink);
          text(
            c,
            (guest.state === "waiting" ? "? " : "Food ") +
              Math.ceil(guest.patience) +
              "s",
            x,
            y - 47,
            11,
          );
          bar(
            c,
            x - 27,
            y - 35,
            54,
            guest.patience / guest.maxPatience,
            guest.patience < 10 ? "#e57565" : "#64ad8e",
          );
          text(c, "T" + (seat.table + 1) + " / " + seat.place, x, y + 39, 11);
        }
      }
      if (t.waiter) {
        if (t.waiter.service > 0)
          bar(c, t.waiter.x - 20, t.waiter.y - 40, 40, t.waiter.service / 0.65);
        person(c, t.waiter.x, t.waiter.y, "#9272a1");
        if (t.waiter.pizza)
          food(c, t.waiter.pizza, t.waiter.x + 18, t.waiter.y + 8, 0.6);
      }
    }
    box(c, 930, 568, 140, 64, 10, "#e3bd65", ink);
    text(c, "VIP", 1000, 606, 18);
    for (const seat of g.vipSeats) {
      box(c, seat.x - 15, seat.y - 14, 30, 28, 5, "#c7a261", ink);
      const guest = g.vips.find((v) => v.seat === seat.seat);
      if (guest) {
        person(c, seat.x, seat.y, "#9572ae", true);
        text(
          c,
          (guest.accepted.length ? "Order " : "? ") +
            Math.ceil(guest.patience) +
            "s",
          seat.x,
          seat.y - 48,
          12,
        );
        bar(
          c,
          seat.x - 30,
          seat.y - 42,
          60,
          guest.patience / guest.maxPatience,
        );
      }
    }
    for (const ball of g.projectiles)
      GameIcons.draw(c, "flour", ball.x, ball.y, 0.7);
    for (const t of g.traps) {
      c.save();
      c.globalAlpha = t.arm > g.time ? 0.4 : 1;
      GameIcons.draw(c, "banana", t.x, t.y);
      if (t.arm > g.time) {
        c.strokeStyle = "#e59454";
        c.beginPath();
        c.arc(t.x, t.y, 26, 0, Math.PI * 2);
        c.stroke();
      }
      c.restore();
    }
    g.drops.forEach((d) => {
      food(c, d.item, d.x, d.y, 0.7);
      oval(c, d.x, d.y + 22, 6, 3, Kitchen.colors[d.owner]);
    });
    g.rats.filter((r) => r.delay <= 0).forEach((r) => rat(c, r, g.time));
    g.players
      .slice()
      .sort((a, b) => a.y - b.y)
      .forEach((p) => chef(c, p, g.time));
  }
  function render(c, g, id) {
    const canvas = c.canvas,
      w = canvas.width,
      h = canvas.height,
      p = g.players[id],
      zoom = 1;
    const camera = {
      x: Math.max(0, Math.min(Kitchen.width - w / zoom, p.x - w / zoom / 2)),
      y: Math.max(0, Math.min(Kitchen.height - h / zoom, p.y - h / zoom / 2)),
    };
    c.fillStyle = "#382835";
    c.fillRect(0, 0, w, h);
    c.save();
    c.scale(zoom, zoom);
    c.translate(-camera.x, -camera.y);
    world(c, g);
    const target = g.tutorial?.target;
    if (target) {
      c.strokeStyle = "#f2ac3b";
      c.lineWidth = 5;
      c.beginPath();
      c.ellipse(
        target.x,
        target.y,
        52 + Math.sin(g.time * 4) * 4,
        42,
        0,
        0,
        Math.PI * 2,
      );
      c.stroke();
    }

    const s = g.nearest(p);
    if (s && !p.panel) {
      box(c, p.x - 90, p.y - 77, 180, 25, 5, "#fff2d9");
      text(
        c,
        (id ? "Enter" : "E") +
          " · " +
          (s.type === "seat"
            ? "Greet / serve"
            : s.type === "vip"
              ? "VIP"
              : s.type === "table"
                ? "Hold to clean"
                : labels[s.type]),
        p.x,
        p.y - 60,
        12,
      );
    }
    c.restore();
    const vx = 1000 - p.x,
      vy = 665 - p.y;
    if (g.vips.length) {
      text(
        c,
        "VIP " +
          (vx < 0 ? "←" : "→") +
          " " +
          Math.round(Math.hypot(vx, vy) / 40) +
          " m",
        w - 85,
        28,
        14,
        "#ffd775",
      );
    }
    if (g.vipBanner > 0) {
      box(
        c,
        Math.max(8, w / 2 - 190),
        55,
        Math.min(380, w - 16),
        52,
        10,
        "#e6bc63",
        ink,
      );
      text(c, g.vips.length + " VIP GUESTS · Personal service", w / 2, 78, 16);
      text(c, "Meet them in the central courtyard", w / 2, 97, 12);
    }
    if (g.tutorial?.target) {
      const target = g.tutorial.target,
        dx = target.x - p.x,
        dy = target.y - p.y;
      text(
        c,
        "LESSON TARGET " +
          (Math.abs(dx) > Math.abs(dy)
            ? dx < 0
              ? "←"
              : "→"
            : dy < 0
              ? "↑"
              : "↓") +
          " · " +
          Math.round(Math.hypot(dx, dy) / 40) +
          " m",
        w / 2,
        28,
        15,
        "#f9cd71",
      );
    }
    if (p.flourTime > 0) {
      c.save();
      c.globalAlpha = Math.min(0.9, p.flourTime / 1.2);
      const fall = (2.6 - p.flourTime) * h * 0.12;
      for (let i = 0; i < 15; i++)
        oval(
          c,
          w * 0.5 + Math.sin(i * 7) * w * 0.27,
          h * 0.43 + Math.cos(i * 4) * h * 0.24 + fall,
          w * (i % 3 === 0 ? 0.14 : 0.07),
          h * 0.1,
          "#f2eee2",
        );
      c.restore();
      text(c, "FLOUR! Keep moving", w / 2, h - 35, 16, "#6c5c59");
    }
    return camera;
  }
  return { render, food };
})();
