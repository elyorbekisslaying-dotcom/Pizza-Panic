"use strict";
const Kitchen = (() => {
  const recipes = [
    { name: "Margherita", price: 16, items: ["dough", "sauce", "cheese"] },
    {
      name: "Pepperoni",
      price: 20,
      items: ["dough", "sauce", "cheese", "pepperoni"],
    },
    {
      name: "Veggie",
      price: 22,
      items: ["dough", "sauce", "cheese", "vegetables"],
    },
  ];
  const stockKeys = ["dough", "sauce", "cheese", "pepperoni", "vegetables"];
  const controls = [
    {
      up: "KeyW",
      down: "KeyS",
      left: "KeyA",
      right: "KeyD",
      interact: "KeyE",
      trap: "KeyQ",
      panel: "KeyI",
    },
    {
      up: "ArrowUp",
      down: "ArrowDown",
      left: "ArrowLeft",
      right: "ArrowRight",
      interact: "Enter",
      trap: "Period",
      panel: "KeyO",
    },
  ];
  const mirror = (id, x) => (id ? 2000 - x : x);
  const stations = (id) => {
    const edge = [
      ["dough", 190, 100, 190, 170],
      ["topping", 480, 100, 480, 170],
      ["oven", 430, 295, 382, 205],
      ["assistant", 730, 100, 730, 170],
      ["terminal", 70, 190, 150, 190],
      ["serving", 70, 330, 150, 330],
      ["waiter", 70, 410, 150, 410],
      ["storage", 740, 270, 670, 270],
      ["bin", 740, 410, 670, 410],
      ["supply", 70, 550, 150, 550],
      ["sign", 530, 1080, 530, 1010],
    ].map(([type, x, y, ax, ay]) => ({
      type,
      team: id,
      x: mirror(id, x),
      y,
      w: type === "topping" ? 380 : type === "oven" ? 180 : 76,
      h: type === "oven" ? 120 : 60,
      approach: { x: mirror(id, ax), y: ay },
    }));
    const oven = edge.find((s) => s.type === "oven");
    oven.slots = [0, 1, 2, 3].map((i) => ({
      x: mirror(id, 430 + (i % 2 ? 46 : -46)),
      y: 295 + (i < 2 ? -30 : 30),
      approach: {
        x: mirror(id, 430 + (i % 2 ? 48 : -48)),
        y: i < 2 ? 205 : 385,
      },
    }));
    edge.find((s) => s.type === "topping").workPoints = [
      330, 430, 530, 630,
    ].map((x) => ({ x: mirror(id, x), y: 170 }));
    // A half-turn maps the upper Blue stalls onto the lower Red stalls.
    const gadgets = [
      ["banana", 900, 220],
      ["flour", 1100, 220],
      ["bottle", 900, 370],
      ["rats", 1100, 370],
    ].map(([type, x, y]) => ({
      type,
      team: id,
      x: id ? 2000 - x : x,
      y: id ? 1200 - y : y,
      w: 76,
      h: 60,
      approach: { x: id ? 2000 - x : x, y: id ? 1200 - y - 70 : y + 70 },
      zone: "gadgets",
    }));
    return [...edge, ...gadgets];
  };
  const tables = (id) =>
    [2, 4, 6].map((capacity, index) => ({
      type: "table",
      team: id,
      index,
      capacity,
      x: mirror(id, [140, 370, 660][index]),
      y: 810,
      w: capacity * 35 + 20,
      h: 64,
      dirty: false,
      protectedUntil: 0,
    }));
  const seats = (id) => {
    let number = 0;
    return tables(id).flatMap((t) =>
      [-1, 1].flatMap((side) =>
        Array.from({ length: t.capacity / 2 }, (_, i) => {
          const x = t.x + (i - (t.capacity / 2 - 1) / 2) * 70;
          return {
            type: "seat",
            team: id,
            seat: number++,
            table: t.index,
            place: (side === -1 ? 0 : t.capacity / 2) + i + 1,
            x,
            y: t.y + side * 65,
            w: 32,
            h: 30,
            approach: { x, y: t.y + side * 115 },
          };
        }),
      ),
    );
  };
  return {
    recipes,
    stockKeys,
    controls,
    stations,
    tables,
    seats,
    mirror,
    colors: ["#429fea", "#ed6a74"],
    width: 2000,
    height: 1200,
    prices: { dough: 8, sauce: 8, cheese: 10, pepperoni: 12, vegetables: 12 },
    purchases: {
      banana: 12,
      flour: 18,
      bottle: 15,
      rats: 45,
      waiter: 100,
      assistant: 180,
    },
  };
})();
