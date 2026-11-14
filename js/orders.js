"use strict";
const Kitchen = (() => {
  const recipes = [
    { name: "Margherita", price: 40, items: ["dough", "sauce", "cheese"] },
    {
      name: "Pepperoni",
      price: 50,
      items: ["dough", "sauce", "cheese", "pepperoni"],
    },
    {
      name: "Veggie",
      price: 55,
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
    [180, 420, 660].map((x, index) => ({
      type: "table",
      team: id,
      index,
      x: mirror(id, x),
      y: 810,
      w: 90,
      h: 64,
    }));
  const seats = (id) =>
    tables(id).flatMap((t) =>
      [-1, 1].map((side, i) => ({
        type: "seat",
        team: id,
        seat: t.index * 2 + i,
        table: t.index,
        x: t.x,
        y: t.y + side * 65,
        w: 32,
        h: 30,
        approach: { x: t.x + (id ? -65 : 65), y: t.y + side * 65 },
      })),
    );
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
    purchases: { banana: 25, rats: 80, waiter: 140 },
  };
})();
