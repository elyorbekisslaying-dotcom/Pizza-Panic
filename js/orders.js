'use strict';

const Kitchen = (() => {
  const recipes = [
    { name: 'Margherita', price: 40, items: ['dough', 'sauce', 'cheese'] },
    { name: 'Pepperoni', price: 50, items: ['dough', 'sauce', 'cheese', 'pepperoni'] },
    { name: 'Veggie', price: 55, items: ['dough', 'sauce', 'cheese', 'vegetables'] }
  ];
  const stockKeys = ['dough', 'sauce', 'cheese', 'pepperoni', 'vegetables'];
  const colors = ['#429fea', '#ed6a74'];
  const controls = [
    { up:'KeyW', down:'KeyS', left:'KeyA', right:'KeyD', interact:'KeyE', punch:'KeyF', trap:'KeyQ', dash:'ShiftLeft' },
    { up:'ArrowUp', down:'ArrowDown', left:'ArrowLeft', right:'ArrowRight', interact:'Enter', punch:'Slash', trap:'Period', dash:'ShiftRight' }
  ];
  const purchases = { banana:25, rats:80, waiter:140, assistant:240 };
  function stations(team) {
    const mirror = x => team ? 1200 - x : x;
    return [
      ['dough',80,130], ['topping',220,130], ['oven',360,130],
      ['supply',80,280], ['serving',220,280], ['extinguisher',360,280],
      ['banana',80,650], ['rats',180,650], ['waiter',280,650], ['assistant',380,650]
    ].map(([type,x,y]) => ({type,team,x:mirror(x),y,w:70,h:52}));
  }
  function tables(team) {
    return [150,350].map((x,seat) => ({type:'table',team,seat,x:team ? 1200-x:x,y:480,w:82,h:58}));
  }
  return { recipes, stockKeys, colors, controls, purchases, stations, tables };
})();
