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
    if (item.kind === "banana") {
      GameIcons.draw(c, "banana", x, y, scale);
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
    banana: "Banana · 25",
    rats: "Rat wave · 80",
    waiter: "Waiter · 140",
  };
  function station(c, s, t) {
    const { x, y, type } = s;
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
    if (type === "banana") GameIcons.draw(c, "banana", x, y);
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
        box(c, table.x - 45, table.y - 32, 90, 64, 10, "#f0c799", ink);
        oval(c, table.x, table.y, 22, 17, "#fff1d5", ink);
        text(c, "T" + (table.index + 1), table.x, table.y + 5, 13);
      }
      for (const guest of t.customers) {
        const seated = ["waiting", "accepted"].includes(guest.state),
          seat = t.seats[guest.seat],
          x = seated ? seat.x : guest.x,
          y = seated ? seat.y : guest.y;
        person(c, x, y, Kitchen.colors[t.id]);
        if (seated) {
          box(c, x - 42, y - 65, 84, 27, 5, "#fff6df", ink);
          text(
            c,
            (guest.state === "waiting" ? "? " : "Order ") +
              Math.ceil(guest.patience) +
              "s",
            x,
            y - 47,
            12,
          );
          bar(
            c,
            x - 35,
            y - 35,
            70,
            guest.patience / guest.maxPatience,
            guest.patience < 25 ? "#e57565" : "#64ad8e",
          );
          text(
            c,
            "T" + (seat.table + 1) + " / " + ((guest.seat % 2) + 1),
            x,
            y + 39,
            11,
          );
        }
      }
      if (t.waiter) {
        person(c, t.waiter.x, t.waiter.y, "#9272a1");
        if (t.waiter.pizza)
          food(c, t.waiter.pizza, t.waiter.x + 18, t.waiter.y + 8, 0.6);
      }
    }
    box(c, 955, 568, 90, 64, 10, "#e3bd65", ink);
    text(c, "VIP", 1000, 606, 18);
    if (g.vip) {
      person(c, 1000, 665, "#9572ae", true);
      text(
        c,
        (g.vip.accepted.length ? "VIP order" : "Waiting for service") +
          " · " +
          Math.ceil(g.vip.patience) +
          "s",
        1000,
        716,
        14,
      );
      bar(c, 955, 728, 90, g.vip.patience / g.vip.maxPatience);
    }
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
              : labels[s.type]),
        p.x,
        p.y - 60,
        12,
      );
    }
    c.restore();
    const vx = 1000 - p.x,
      vy = 665 - p.y;
    if (g.vip) {
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
    return camera;
  }
  return { render, food };
})();
