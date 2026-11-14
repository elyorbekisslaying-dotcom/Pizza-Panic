"use strict";

const PizzaArt = (() => {
  const ink = "#452b37";

  function shape(ctx, color, trace, line = ink) {
    ctx.beginPath();
    trace();
    ctx.fillStyle = color;
    ctx.fill();
    if (line) {
      ctx.strokeStyle = line;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.stroke();
    }
  }

  function oval(ctx, x, y, rx, ry, color, line = null) {
    shape(ctx, color, () => ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2), line);
  }

  function box(ctx, x, y, w, h, radius, color, line = null) {
    shape(ctx, color, () => ctx.roundRect(x, y, w, h, radius), line);
  }

  function poly(ctx, points, color, line = ink) {
    shape(
      ctx,
      color,
      () => {
        points.forEach(([x, y], index) =>
          index ? ctx.lineTo(x, y) : ctx.moveTo(x, y),
        );
        ctx.closePath();
      },
      line,
    );
  }

  function kitchen(bounds, width, height) {
    const layer = document.createElement("canvas");
    layer.width = width;
    layer.height = height;
    const ctx = layer.getContext("2d");
    const { left, top, right, bottom } = bounds;
    ctx.fillStyle = "#382835";
    ctx.fillRect(0, 0, width, height);
    box(
      ctx,
      left - 7,
      top - 7,
      right - left + 14,
      bottom - top + 14,
      17,
      "#a85b49",
      ink,
    );
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(left, top, right - left, bottom - top, 10);
    ctx.clip();
    for (let y = top, row = 0; y < bottom; y += 46, row++) {
      for (let x = left, column = 0; x < right; x += 46, column++) {
        ctx.fillStyle = (row + column) % 2 ? "#f3caa1" : "#ffe6be";
        ctx.fillRect(x, y, 45, 45);
      }
    }
    ctx.restore();

    for (const y of [14, height - 51]) {
      for (let x = 51; x < width - 80; x += 96) {
        box(ctx, x, y, 88, 36, 7, "#bc785a", ink);
        box(ctx, x + 4, y + 4, 80, 25, 4, "#e4a77b");
        box(ctx, x + 33, y + 29, 22, 3, 1, ink);
      }
    }
    for (const x of [10, width - 43]) {
      for (let y = 74; y < height - 74; y += 74) {
        box(ctx, x, y, 33, 63, 6, "#74a99a", ink);
        box(ctx, x + 6, y + 9, 4, 45, 2, "#b1d4b8");
      }
    }
    for (const x of [78, 109, 750, 780]) {
      box(ctx, x - 11, 17, 24, 25, 5, "#6e6670");
      oval(ctx, x, 29, 8, 8, "#aaa4a7", ink);
      oval(ctx, x, 29, 4, 4, "#685760");
    }
    for (const x of [197, 370, 861]) {
      oval(ctx, x, height - 35, 16, 13, "#fcf2db", ink);
      oval(ctx, x, height - 35, 11, 9, "#a6c7bd");
    }
    box(ctx, 470, height - 49, 81, 31, 6, "#668b89", ink);
    box(ctx, 475, height - 45, 71, 23, 5, "#9ec2bd");
    box(ctx, 504, height - 50, 10, 13, 4, "#dad6ca", ink);
    return layer;
  }

  function chef(
    ctx,
    x,
    y,
    facing,
    stride,
    blink,
    uniform = "#dc4d52",
    holding = false,
  ) {
    oval(ctx, x, y + 15, 20, 8, "#754b4250");
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing, 1);
    ctx.globalAlpha = blink ? 0.36 : 1;
    for (const foot of [-1, 1]) {
      oval(ctx, foot * 8, 16 + foot * stride, 6, 5, "#514051", ink);
    }
    box(ctx, -15, -1, 30, 21, 9, uniform, ink);
    if (!holding) oval(ctx, -16, 7 - stride, 5, 6, "#efac7b", ink);
    if (!holding) oval(ctx, 16, 7 + stride, 5, 6, "#efac7b", ink);
    poly(
      ctx,
      [
        [-10, 8],
        [0, 12],
        [10, 8],
        [5, 17],
        [-5, 17],
      ],
      uniform,
    );
    oval(ctx, 1, -4, 13, 11, "#ffbe87", ink);
    oval(ctx, -3, -3, 1.6, 2.1, ink);
    oval(ctx, 7, -3, 1.6, 2.1, ink);
    oval(ctx, 2, 2, 2.5, 1.3, "#984550");
    oval(ctx, -7, 0, 2.8, 1.4, "#f28376");
    oval(ctx, 10, 0, 2.8, 1.4, "#f28376");
    shape(ctx, "#fff8e8", () => {
      ctx.moveTo(-14, -9);
      ctx.bezierCurveTo(-26, -19, -15, -28, -8, -24);
      ctx.bezierCurveTo(-6, -34, 8, -34, 12, -24);
      ctx.bezierCurveTo(24, -27, 28, -12, 15, -9);
      ctx.closePath();
    });
    box(ctx, -14, -14, 29, 7, 3, "#d7e5e3", ink);
    ctx.restore();
  }

  function item(ctx, object) {
    const { x, y, kind, angle = 0, hazard } = object;
    oval(ctx, x, y + 11, 15, 5, "#65453542");
    if (hazard) oval(ctx, x, y, 20, 20, "#b7304930", "#9f304e");
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    switch (kind) {
      case "pepperoni":
        oval(ctx, 0, 0, 14, 12, "#d54941", ink);
        oval(ctx, -1, -2, 10, 7, "#ee6b54");
        for (const [px, py] of [
          [-6, -4],
          [3, -5],
          [6, 2],
          [-4, 4],
          [0, 0],
        ]) {
          oval(ctx, px, py, 1.6, 1.3, "#ffcb9c");
        }
        break;
      case "cheese":
      case "spoiled":
        poly(
          ctx,
          [
            [-14, -3],
            [5, -13],
            [14, -3],
            [14, 7],
            [-13, 12],
          ],
          kind === "cheese" ? "#f9b52f" : "#a39b52",
        );
        poly(
          ctx,
          [
            [-14, -3],
            [5, -13],
            [14, -3],
            [-11, 4],
          ],
          kind === "cheese" ? "#ffe372" : "#c0c072",
        );
        for (const [px, py] of [
          [-6, 5],
          [4, 3],
          [8, -6],
        ]) {
          oval(ctx, px, py, 2.9, 2, kind === "cheese" ? "#d28623" : "#497853");
        }
        break;
      case "tomato":
      case "rotten":
        oval(ctx, 0, 2, 14, 12, kind === "tomato" ? "#ed5549" : "#864255", ink);
        oval(ctx, -5, -1, 4, 2, kind === "tomato" ? "#ffa276" : "#b76871");
        poly(
          ctx,
          [
            [0, -13],
            [2, -9],
            [10, -9],
            [5, -5],
            [7, -2],
            [0, -5],
            [-6, -2],
            [-5, -7],
            [-10, -9],
          ],
          "#66a45a",
          null,
        );
        if (kind === "rotten") {
          oval(ctx, 5, 5, 5, 3.5, "#6a9c62");
          oval(ctx, -4, 9, 2, 1.5, "#6a9c62");
        }
        break;
      case "mushroom":
        box(ctx, -5, 0, 10, 13, 4, "#ffe6bd", ink);
        shape(ctx, "#ce8b65", () => {
          ctx.moveTo(-14, 2);
          ctx.bezierCurveTo(-15, -16, 15, -16, 14, 2);
          ctx.quadraticCurveTo(0, 9, -14, 2);
          ctx.closePath();
        });
        oval(ctx, -5, -5, 4, 2, "#ffbd89");
        break;
      case "olive":
        oval(ctx, -4, 1, 10, 12, "#527344", ink);
        oval(ctx, 5, -2, 10, 11, "#8dad58", ink);
        oval(ctx, 6, -3, 5.5, 6, "#d0d989");
        oval(ctx, 6, -3, 3.1, 4, "#77463b");
        break;
      case "bomb":
        oval(ctx, -1, 2, 13, 13, "#393747", ink);
        oval(ctx, -5, -3, 4, 3, "#818398");
        box(ctx, 1, -12, 8, 5, 2, "#676272", ink);
        ctx.beginPath();
        ctx.moveTo(6, -11);
        ctx.quadraticCurveTo(8, -20, 14, -16);
        ctx.strokeStyle = "#f0bf65";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        poly(
          ctx,
          [
            [14, -22],
            [16, -18],
            [21, -18],
            [17, -15],
            [18, -11],
            [14, -13],
            [10, -12],
            [11, -16],
            [9, -19],
          ],
          "#ffbb45",
          null,
        );
        break;
    }
    ctx.restore();
  }

  function pizza(ctx, x, y, toppings, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    oval(ctx, 0, 0, 28, 24, "#e2964f", ink);
    oval(ctx, 0, 0, 23, 19, "#c94a3f");
    oval(ctx, 0, 0, 20, 16, "#ffd57a");
    const positions = [
      [-9, -7],
      [10, -6],
      [-11, 5],
      [10, 7],
      [0, 0],
    ];
    Object.keys(toppings).forEach((kind, index) => {
      const [px, py] = positions[index];
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(0.33, 0.33);
      item(ctx, { x: 0, y: 0, kind });
      ctx.restore();
    });
    ctx.restore();
  }

  function station(ctx, place, type, active, order) {
    const { x, y, label } = place;
    const oven = type === "oven";
    ctx.save();
    ctx.translate(x, y);
    if (active) oval(ctx, 0, 0, 39, 36, "#ffee9f", "#9a5238");
    box(ctx, -27, -26, 54, 48, 9, oven ? "#b4554c" : "#70a99b", ink);
    if (oven) {
      box(ctx, -21, -15, 42, 29, 9, "#51313b", ink);
      box(
        ctx,
        -17,
        -9,
        34,
        17,
        6,
        order.stage === "baking" ? "#ff8c4e" : "#76404a",
      );
      if (["oven", "baking", "ready"].includes(order.stage)) {
        pizza(ctx, 0, 0, order.collected, 0.58);
      }
    } else {
      box(ctx, -22, -21, 44, 35, 6, "#d3e4c2", ink);
      box(ctx, -15, -15, 30, 22, 5, "#eed2a3", ink);
      box(ctx, -5, -5, 10, 2, 1, "#98704e");
    }
    ctx.textAlign = "center";
    ctx.font = "900 12px system-ui";
    box(ctx, -29, 25, 58, 20, 5, "#492b3b");
    ctx.fillStyle = "#fff1d5";
    ctx.fillText(label, 0, 39);
    ctx.restore();
  }

  return { kitchen, chef, item, pizza, station, oval, box, poly };
})();

// One drawing source for world items, inventory, recipes and shops.
const GameIcons = (() => {
  const { oval, box, poly, item } = PizzaArt,
    ink = "#452b37",
    cache = {};
  function draw(c, key, x = 0, y = 0, scale = 1) {
    c.save();
    c.translate(x, y);
    c.scale(scale, scale);
    switch (key) {
      case "dough":
        oval(c, 0, 2, 19, 14, "#f4d79c", ink);
        oval(c, -5, -2, 7, 3, "#fff0c5");
        break;
      case "sauce":
        box(c, -12, -14, 24, 31, 5, "#ca5343", ink);
        box(c, -13, -18, 26, 6, 2, "#92ae81", ink);
        box(c, -9, -4, 18, 13, 2, "#fff0cb");
        oval(c, 0, 2, 5, 5, "#df5a43");
        break;
      case "vegetables":
        item(c, { kind: "mushroom", x: -7, y: 0 });
        item(c, { kind: "olive", x: 7, y: 5 });
        break;
      case "banana":
        poly(
          c,
          [
            [-3, -15],
            [4, -12],
            [7, 2],
            [20, 12],
            [6, 11],
            [0, 5],
            [-9, 14],
            [-21, 9],
            [-8, 2],
          ],
          "#f6cc52",
        );
        poly(
          c,
          [
            [0, -10],
            [0, 5],
            [6, 11],
            [10, 10],
            [4, 1],
          ],
          "#fff0a3",
          null,
        );
        break;
      case "coin":
        oval(c, 0, 0, 15, 17, "#f4be4e", ink);
        oval(c, 0, 0, 10, 12, "#ffe18b", "#ad7840");
        box(c, -2, -7, 4, 14, 1, "#ad7840");
        break;
      case "order":
        box(c, -13, -17, 26, 34, 4, "#fff3da", ink);
        for (let i = 0; i < 3; i++) box(c, -7, -8 + i * 8, 14, 3, 1, "#9d8571");
        break;
      case "pin":
        box(c, -22, -3, 44, 6, 3, "#a96840", ink);
        box(c, -13, -7, 26, 14, 5, "#e5b67c", ink);
        break;
      case "dash":
        poly(
          c,
          [
            [3, -18],
            [-14, 3],
            [-2, 3],
            [-8, 18],
            [16, -5],
            [3, -5],
          ],
          "#ffe28a",
        );
        break;
      case "star": {
        const pts = [];
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI) / 5 - Math.PI / 2,
            r = i % 2 ? 8 : 18;
          pts.push([Math.cos(a) * r, Math.sin(a) * r]);
        }
        poly(c, pts, "#ffd36c");
        break;
      }
      default:
        item(c, { kind: key, x: 0, y: 0 });
    }
    c.restore();
  }
  function url(key) {
    if (!cache[key]) {
      const el = document.createElement("canvas");
      el.width = 64;
      el.height = 64;
      draw(el.getContext("2d"), key, 32, 32, 1.3);
      cache[key] = el.toDataURL();
    }
    return cache[key];
  }
  return { draw, url };
})();
