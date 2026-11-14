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
      punch: "KeyF",
      trap: "KeyQ",
      dash: "ShiftLeft",
      panel: "KeyI",
    },
    {
      up: "ArrowUp",
      down: "ArrowDown",
      left: "ArrowLeft",
      right: "ArrowRight",
      interact: "Enter",
      punch: "Slash",
      trap: "Period",
      dash: "ShiftRight",
      panel: "KeyO",
    },
  ];
  const mirror = (id, x) => (id ? 2000 - x : x);
  const stations = (id) =>
    [
      ["dough", 140, 140],
      ["topping", 340, 140],
      ["oven", 540, 140],
      ["terminal", 140, 330],
      ["serving", 340, 330],
      ["bin", 540, 330],
      ["storage", 740, 300],
      ["assistant", 740, 140],
      ["flour", 140, 600],
      ["bottle", 340, 600],
      ["sign", 650, 1060],
      ["supply", 140, 1040],
      ["banana", 340, 1040],
      ["rats", 540, 1040],
      ["waiter", 740, 1040],
    ].map(([type, x, y]) => ({
      type,
      team: id,
      x: mirror(id, x),
      y,
      w: 76,
      h: 60,
    }));
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
