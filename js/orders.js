'use strict';

const PizzaOrders = (() => {
  const limit = 90;
  const bakeTime = 3;
  const stations = {
    oven: { x: 100, y: 290, label: 'OVEN' },
    counter: { x: 860, y: 290, label: 'PICKUP' }
  };
  const names = {
    pepperoni: 'Pepperoni', cheese: 'Cheese', tomato: 'Tomato',
    mushroom: 'Mushroom', olive: 'Olive'
  };
  const recipes = [
    { name: 'Pepperoni Classic', toppings: { cheese: 1, pepperoni: 1 } },
    { name: 'Garden Pizza', toppings: { tomato: 1, mushroom: 1, olive: 1 } },
    { name: 'Kitchen Special', toppings: { cheese: 1, pepperoni: 1, tomato: 1, mushroom: 1, olive: 1 } }
  ];

  class Orders {
    constructor() {
      this.delivered = 0;
      this.stage = 'collect';
      this.collected = {};
      this.bakeLeft = 0;
    }

    get recipe() {
      return recipes[this.delivered];
    }

    missing() {
      if (this.stage !== 'collect') return [];
      return Object.keys(this.recipe.toppings).filter(kind => !this.collected[kind]);
    }

    collect(kind) {
      if (this.stage !== 'collect' || !this.recipe.toppings[kind] || this.collected[kind]) return;
      this.collected[kind] = true;
      if (!this.missing().length) this.stage = 'oven';
    }

    step(dt, player) {
      const near = station => Math.hypot(station.x - player.x, station.y - player.y) < 40;
      if (this.stage === 'oven' && near(stations.oven)) {
        this.stage = 'baking';
        this.bakeLeft = bakeTime;
        return 'bake';
      }
      if (this.stage === 'baking') {
        this.bakeLeft = Math.max(0, this.bakeLeft - dt);
        if (!this.bakeLeft) {
          this.stage = 'ready';
          return 'ready';
        }
      }
      if (this.stage === 'ready' && near(stations.oven)) {
        this.stage = 'carry';
        return 'carry';
      }
      if (this.stage === 'carry' && near(stations.counter)) {
        this.delivered++;
        this.collected = {};
        this.stage = this.delivered === recipes.length ? 'won' : 'collect';
        return 'deliver';
      }
    }
  }

  return { Orders, limit, stations, names, total: recipes.length };
})();
