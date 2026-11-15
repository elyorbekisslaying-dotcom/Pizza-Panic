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
    assistant: "Cook · 180",
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
      text(c, t.open ? "OPEN" : "CLOSED", 0, 0, 16, "#f3f6f8");
      c.restore();
      return;
    }
    if (type === "assistant") {
      box(c, x - 38, y - 30, 76, 60, 8, "#72a994", ink);
      box(c, x - 33, y - 24, 66, 42, 5, "#dce5df", ink);
      GameIcons.draw(c, "pin", x, y);
      box(c, x - 72, y + 34, 144, 24, 5, "#31464b");
      text(c, "Cooks " + t.cooks.length + "/4 · 180", x, y + 51, 12, "#f4f6f7");
      return;
    }

    if (type === "topping") {
      box(c, x - s.w / 2, y - 30, s.w, 60, 9, Kitchen.colors[t.id], ink);
      box(c, x - s.w / 2 + 5, y - 26, s.w - 10, 48, 5, "#d9b788", ink);
      s.workPoints.forEach((point, i) => {
        const px = point.x;
        box(c, px - 30, y - 18, 60, 36, 4, "#f2dfba", "#aa875f");
        GameIcons.draw(
          c,
          ["sauce", "cheese", "vegetables", "dough"][i],
          px,
          y,
          0.65,
        );
      });
      return;
    }
    if (type === "oven") {
      box(c, x - s.w / 2, y - s.h / 2, s.w, s.h, 12, "#9c5252", ink);
      s.slots.forEach((slot, index) => {
        const f = t.ovens[index];
        box(
          c,
          slot.x - 39,
          slot.y - 25,
          78,
          50,
          7,
          f?.stage === "burned" ? "#251e25" : "#493740",
          "#c7b6a7",
        );
        text(c, String(index + 1), slot.x - 28, slot.y - 8, 11, "#f9dfb8");
        if (f) {
          food(c, f, slot.x, slot.y, 0.7);
          bar(
            c,
            slot.x - 31,
            slot.y + 18,
            62,
            f.stage === "baking"
              ? 1 - f.timer / 3
              : f.stage === "ready"
                ? f.timer / 12
                : 0,
            f.stage === "ready" ? "#74c99b" : "#e6a856",
          );
        }
      });
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
      t.pickup
        .slice(0, 4)
        .forEach((f, i) =>
          food(
            c,
            f,
            x - 18 + (i % 2) * 30,
            y - 9 + Math.floor(i / 2) * 18,
            0.45,
          ),
        );
      text(c, String(t.pickup.length), x + 29, y - 23, 16, "#fff6d3");
    }
    if (["banana", "flour", "bottle"].includes(type))
      GameIcons.draw(c, type, x, y);
    if (type === "rats") rat(c, { x, y, phase: "in" }, 0);
    if (type === "waiter") person(c, x, y - 5, "#9272a1");
    if (!["banana", "flour", "bottle", "rats", "waiter"].includes(type)) return;
    const labelY = y + (type === "serving" ? -56 : 34);
    box(c, x - 66, labelY, 132, 24, 5, "#483141");
    text(
      c,
      type === "waiter" && t.waiter ? "Waiter hired" : labels[type],
      x,
      labelY + 17,
      13,
      "#f3f6f8",
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
    if (p.hidden || (p.immune > 0 && Math.floor(time * 10) % 2 === 1)) return;
    c.save();
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
      // The threshold is the same physical opening used by every arrival/exit path.
      const door = t.door;
      box(c, door.x - 70, door.y - 20, 140, 40, 3, "#52626a", ink);
      box(c, door.x - 65, door.y - 14, 130, 28, 2, "#a7bab9");
      for (const dx of [-73, 73])
        box(c, door.x + dx - 5, door.y - 30, 10, 60, 3, "#d5dfe0", ink);
      c.save();
      c.translate(door.x - 62, door.y);
      c.rotate(-door.open * Math.PI * 0.45);
      box(c, 0, -10, 124, 20, 4, "#658d96", ink);
      box(c, 12, -6, 67, 12, 3, "#b9e0df", ink);
      oval(c, 108, 0, 4, 4, "#e7eceb", ink);
      c.restore();
      text(c, "ENTRANCE", door.x, door.y + 55, 12, "#33404a");
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
        tableStains(c, table);
        if (table.dirty) {
          box(
            c,
            table.x - 75,
            table.y + table.h / 2 + 3,
            150,
            20,
            4,
            "#33404a",
          );
          text(
            c,
            "DIRTY · hold E / Enter",
            table.x,
            table.y + table.h / 2 + 17,
            11,
            "#f5f7f8",
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
      for (const a of t.cooks) {
        PizzaArt.chef(
          c,
          a.x,
          a.y,
          a.faceX < 0 ? -1 : 1,
          Math.sin(a.walk) * 3,
          false,
          "#78aa8b",
          !!a.food,
        );
        if (a.food)
          food(
            c,
            a.food,
            a.x + (a.faceX || 1) * 22,
            a.y + (a.faceY || 0) * 18 + 8,
            0.65,
          );
        if (a.phase === "prep")
          bar(c, a.x - 30, a.y - 43, 60, 1 - a.job.left / 9);
        text(c, a.state, a.x, a.y - 52, 10, "#243f44");
      }
      if (t.waiter) {
        if (t.waiter.service > 0)
          bar(c, t.waiter.x - 20, t.waiter.y - 40, 40, t.waiter.service / 0.9);
        person(c, t.waiter.x, t.waiter.y, "#9272a1");
        if (t.waiter.pizza)
          food(c, t.waiter.pizza, t.waiter.x + 18, t.waiter.y + 8, 0.6);
      }
    }
    for (const id of [0, 1]) {
      box(c, 865, id ? 1090 : 140, 270, 32, 7, Kitchen.colors[id], ink);
      text(
        c,
        (id ? "RED" : "BLUE") + " GADGET MARKET",
        1000,
        id ? 1112 : 162,
        16,
        "#23323e",
      );
    }
    box(c, 930, 568, 140, 64, 10, "#aab4d6", ink);
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
  function tableStains(c, table) {
    if (!table.dirty || !table.stains) return;
    c.save();
    c.beginPath();
    c.roundRect(
      table.x - table.w / 2 + 4,
      table.y - table.h / 2 + 4,
      table.w - 8,
      table.h - 8,
      7,
    );
    c.clip();
    c.globalAlpha = 1 - (table.cleanProgress || 0);
    for (const dot of table.stains) {
      c.save();
      c.translate(table.x + dot.x, table.y + dot.y);
      c.rotate(dot.angle);
      oval(
        c,
        0,
        0,
        dot.rx,
        dot.ry,
        dot.tone < 0.35 ? "#9e352e" : dot.tone < 0.7 ? "#bf4939" : "#d75c43",
      );
      c.restore();
    }
    c.restore();
  }
  function flourMask(c, w, h, left) {
    if (left <= 0) return;
    const age = 2.6 - left,
      fade = age < 0.85 ? 1 : Math.max(0, (2.6 - age) / 1.75);
    c.save();
    c.globalAlpha = 0.99 * Math.min(1, age / 0.06) * fade;
    const fall = Math.max(0, age - 0.85) * h * 0.16,
      shrink = 1 - Math.max(0, age - 1.5) * 0.1;
    c.beginPath();
    for (let i = 0; i < 96; i++) {
      const a = (i * Math.PI * 2) / 96,
        r = 1 + 0.035 * Math.sin(7 * a) + 0.025 * Math.cos(13 * a);
      const x = w * 0.5 + Math.cos(a) * w * 0.51 * r * shrink,
        y = h * 0.49 + Math.sin(a) * h * 0.51 * r * shrink + fall;
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.closePath();
    c.fillStyle = "#f3f1eb";
    c.fill();
    for (let i = 0; i < 22; i++) {
      const a = i * 2.39996;
      oval(
        c,
        w * 0.5 + Math.cos(a) * w * 0.49,
        h * 0.49 + Math.sin(a) * h * 0.49 + fall,
        w * (0.009 + (i % 3) * 0.004),
        h * (0.012 + (i % 4) * 0.005),
        "#f3f1eb",
      );
    }
    c.restore();
  }
  function route(c, g, camera, w, h) {
    const guide = g.tutorial?.guide,
      p = g.players[0];
    if (!guide?.goal || !guide.path.length) return;
    let nearest = 0,
      best = Infinity;
    guide.path.forEach((q, i) => {
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d < best) {
        nearest = i;
        best = d;
      }
    });
    let lead = nearest;
    for (let i = nearest; i < Math.min(guide.path.length, nearest + 4); i++)
      if (g.lineClear(p, guide.path[i])) lead = i;
    const points = guide.path.slice(lead);
    if (!points.length || !g.lineClear(p, points[0])) return;
    c.save();
    c.translate(-camera.x, -camera.y);
    c.lineJoin = "round";
    c.lineCap = "round";
    const trace = () => {
      c.beginPath();
      c.moveTo(p.x, p.y);
      points.forEach((q) => c.lineTo(q.x, q.y));
    };
    trace();
    c.strokeStyle = "#193d48";
    c.lineWidth = 8;
    c.stroke();
    c.setLineDash([13, 9]);
    c.lineDashOffset = -g.time * 28;
    trace();
    c.strokeStyle = "#66e7e5";
    c.lineWidth = 4;
    c.stroke();
    c.setLineDash([]);
    const last = points.at(-1),
      prev = points.at(-2) || p,
      angle = Math.atan2(last.y - prev.y, last.x - prev.x);
    c.translate(last.x, last.y);
    c.rotate(angle);
    poly(
      c,
      [
        [13, 0],
        [-9, -9],
        [-5, 0],
        [-9, 9],
      ],
      "#66e7e5",
      "#193d48",
    );
    c.restore();
    const goal = guide.goal,
      x = goal.x - camera.x,
      y = goal.y - camera.y;
    if (x < 25 || x > w - 25 || y < 25 || y > h - 25) {
      const dx = x - w / 2,
        dy = y - h / 2,
        scale = Math.min(
          (w / 2 - 28) / Math.max(1, Math.abs(dx)),
          (h / 2 - 58) / Math.max(1, Math.abs(dy)),
        ),
        px = w / 2 + dx * scale,
        py = h / 2 + dy * scale;
      c.save();
      c.translate(px, py);
      c.rotate(Math.atan2(dy, dx));
      poly(
        c,
        [
          [13, 0],
          [-10, -10],
          [-6, 0],
          [-10, 10],
        ],
        "#66e7e5",
        "#193d48",
      );
      c.restore();
    }
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
      if (s.type === "oven") {
        const slot = g.teams[id].stations.find((place) => place.type === "oven")
          .slots[s.slot];
        c.strokeStyle = Kitchen.colors[id];
        c.lineWidth = 4;
        c.strokeRect(slot.x - 40, slot.y - 26, 80, 52);
      }
      box(c, p.x - 90, p.y - 77, 180, 25, 5, "#edf2f4");
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
                : s.type === "oven"
                  ? "Oven slot " +
                    (s.slot + 1) +
                    " · " +
                    (g.teams[p.id].ovens[s.slot]?.stage || "empty")
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
        "#6ee4e6",
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
        "#bbc8e5",
        ink,
      );
      text(c, g.vips.length + " VIP GUESTS · Personal service", w / 2, 78, 16);
      text(c, "Meet them in the central courtyard", w / 2, 97, 12);
    }
    if (id === 0) route(c, g, camera, w, h);
    flourMask(c, w, h, p.flourTime);
    if (p.flourTime > 0)
      text(c, "FLOUR! Keep moving", w / 2, h - 65, 16, "#34424b");
    return camera;
  }
  return { render, food, tableStains, flourMask };
})();
