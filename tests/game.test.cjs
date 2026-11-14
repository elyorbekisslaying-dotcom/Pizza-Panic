const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const sandbox = vm.createContext({});
for (const file of ['orders.js','game.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file),'utf8'),sandbox);
}
const {Game} = vm.runInContext('RivalGame',sandbox);
const K = vm.runInContext('Kitchen',sandbox);
let checks=0;
function check(name, fn) {
  fn(); checks++; console.log('PASS',name);
}
function tick(g, seconds, inputs) {
  for(let i=0;i<Math.round(seconds*120);i++)g.step(1/120,inputs);
}
function station(g,id,type) {
  const p=g.players[id],s=g.teams[id].stations.find(s=>s.type===type);
  p.x=s.x;p.y=s.y+55;
  g.interact(p);
}
function select(g,id,order) {
  const p=g.players[id],s=order.team===-1?g.vipTable:g.teams[id].tables[order.seat];
  p.x=s.x+65;p.y=s.y;g.interact(p);
  assert.equal(p.selected,order.id);
}
function cook(g,id,order) {
  const p=g.players[id];
  select(g,id,order);
  station(g,id,'dough');tick(g,1.3);
  assert.equal(p.hand.stage,'dough');
  station(g,id,'topping');tick(g,1.3);
  assert.equal(p.hand.stage,'raw');
  station(g,id,'oven');tick(g,3.1);
  station(g,id,'oven');assert.equal(p.hand.stage,'ready');
}
check('both teams cook and receive independent rewards; no duplicate or wrong-owner delivery',()=>{
  const g=new Game();
  for(const id of [0,1]){
    const t=g.teams[id],o=t.customers[0];
    cook(g,id,o);
    const pizza=g.players[id].hand;
    assert.equal(g.deliver(pizza,g.teams[1-id]),false);
    select(g,id,o);
    assert.equal(g.players[id].hand,null);
    assert.equal(t.rep,10);assert.ok(t.money>=140);
    assert.equal(g.deliver(pizza,t),false);
  }
  tick(g,2.1);
  assert.ok(g.teams.every(t=>t.customers.every(c=>!c.departing)));
});
check('VIP accepts competing preparations, exactly one claim, clears losing pizza',()=>{
  const g=new Game();
  g.vip={id:999,team:-1,recipe:1,patience:45,maxPatience:45,age:0};
  const order=g.vip;
  cook(g,0,order);cook(g,1,order);
  assert.ok(g.deliver(g.players[0].hand,g.teams[0]));
  assert.equal(g.deliver(g.players[1].hand,g.teams[1]),false);
  tick(g,.1);
  assert.equal(g.players[1].hand,null);
  assert.equal(g.teams[0].rep,20);assert.equal(g.teams[1].rep,0);
});
check('normalized simultaneous movement, walls, collision, dash cooldown',()=>{
  const g=new Game();
  tick(g,.3,[{x:1,y:1},{x:-1,y:1}]);
  assert.ok(g.players[0].x>260 && g.players[1].x<940);
  assert.ok(Math.abs(Math.hypot(g.players[0].x-260,g.players[0].y-370)-63)<.01);
  const p=g.players[0];p.x=475;p.y=150;
  g.dash(p);tick(g,.3,[{x:1},{}]);
  assert.ok(p.x<=485);assert.ok(p.dashCD>4);
  g.dash(p);assert.equal(p.dashTime,0);
});
check('purchase affordability, own station only, emergency ingredients, paid rat cooldown',()=>{
  const g=new Game(),t=g.teams[0],p=g.players[0];
  station(g,0,'banana');assert.equal(p.bananas,1);assert.equal(t.money,75);
  station(g,0,'rats');assert.equal(g.rats.length,0);
  t.money=100;station(g,0,'rats');assert.equal(g.rats[0].team,1);assert.equal(t.money,20);
  station(g,0,'rats');assert.equal(g.rats.length,1);
  t.money=0;K.stockKeys.forEach(k=>t.stock[k]=0);
  station(g,0,'supply');assert.ok(K.stockKeys.every(k=>t.stock[k]===1));
  t.money=30;station(g,0,'supply');assert.equal(t.stock.dough,5);assert.equal(t.money,0);
  p.x=1120;p.y=335;g.interact(p);assert.equal(g.teams[1].money,100);
});
check('punch knocks back, drops recoverably, grants immunity and cannot hit customers',()=>{
  const g=new Game(),p=g.players[0],q=g.players[1];
  p.x=560;p.y=330;q.x=610;q.y=330;
  q.hand={owner:1,order:g.teams[1].customers[0].id,recipe:0,stage:'ready'};
  p.faceX=1;p.faceY=0;
  g.punch(p);assert.equal(q.hand,null);assert.equal(g.drops.length,1);assert.ok(q.stun);
  const immune=q.immune;g.hit(q,1,0);assert.equal(q.immune,immune);
  tick(g,.7);assert.ok(q.x>610);
  q.x=g.drops[0].x;q.y=g.drops[0].y;g.interact(q);assert.ok(q.hand);assert.equal(g.drops.length,0);
  assert.ok(g.teams[0].customers[0].patience>64);
});
check('banana arms with warning, slips opponent once, expires',()=>{
  const g=new Game(),p=g.players[0],q=g.players[1];
  p.x=550;p.y=330;q.x=600;q.y=330;p.bananas=1;
  g.trap(p);q.x=550;p.x=500;tick(g,.6);assert.equal(q.stun,0);
  tick(g,.7);assert.ok(q.immune>0);assert.equal(g.traps.length,0);
});
check('random rats steal limited real stock, are scared or punched, and fire extinguishes',()=>{
  const g=new Game();g.nextRats=0;tick(g,.01);assert.equal(g.rats.length,2);
  const before=Object.values(g.teams[0].stock).reduce((a,b)=>a+b);
  tick(g,2);assert.equal(Object.values(g.teams[0].stock).reduce((a,b)=>a+b),before-1);
  g.rats=[];g.invade(0);g.players[0].x=30;g.players[0].y=355;tick(g,.01);
  assert.equal(g.rats[0].phase,'out');
  g.punch(g.players[0]);assert.equal(g.rats.length,0);
  g.nextFire=0;tick(g,.01);const t=g.teams.find(t=>t.fire);
  station(g,t.id,'extinguisher');assert.equal(t.fire,false);
});
check('waiter only delivers matching own order with delay; assistant consumes stock once',()=>{
  const g=new Game(),t=g.teams[0],p=g.players[0];
  t.money=500;station(g,0,'waiter');assert.equal(t.waiter,true);
  const o=t.customers[0];cook(g,0,o);station(g,0,'serving');
  assert.ok(t.waiterJob);assert.equal(t.rep,0);tick(g,2.6);assert.equal(t.rep,10);
  g.vip={id:999,team:-1,recipe:0,patience:45,maxPatience:45,age:0};
  p.hand={order:999,owner:0,recipe:0,stage:'ready'};station(g,0,'serving');
  assert.equal(t.waiterJob,null);assert.ok(p.hand);
  p.hand=null;tick(g,11);station(g,0,'assistant');assert.ok(t.assistant);
  tick(g,.1);const dough=t.stock.dough;assert.ok(t.assistantJob);
  tick(g,4.1);assert.equal(t.stock.dough,dough);assert.ok(t.assistantPizza);
  station(g,0,'dough');assert.equal(p.hand.stage,'raw');
});
check('expired orders clear hand, staff and oven; burned pizzas discard cleanly',()=>{
  const g=new Game(),t=g.teams[0],p=g.players[0],o=t.customers[0];
  cook(g,0,o);p.hand.stage='raw';station(g,0,'oven');tick(g,12);
  assert.equal(t.oven.stage,'burned');station(g,0,'oven');assert.equal(t.oven,null);
  p.hand={owner:0,order:o.id,recipe:0,stage:'ready'};o.patience=.01;
  tick(g,.1);assert.equal(p.hand,null);assert.equal(t.lost,1);assert.equal(t.rep,0);
});
check('five stars freezes game and reset clears all events and staff',()=>{
  const g=new Game(),t=g.teams[0],o=t.customers[0];
  t.rep=90;g.deliver({order:o.id,recipe:o.recipe,owner:0,stage:'ready'},t);
  assert.equal(g.winner,0);const time=g.time;tick(g,1);assert.equal(g.time,time);
  g.reset();assert.equal(g.winner,null);assert.equal(g.teams[0].rep,0);assert.equal(g.rats.length,0);
});
check('frame-rate independent movement and kitchen access for rivals',()=>{
  const a=new Game(),b=new Game();
  for(let i=0;i<30;i++)a.step(1/30,[{x:1},{}]);
  for(let i=0;i<144;i++)b.step(1/144,[{x:1},{}]);
  assert.ok(Math.abs(a.players[0].x-b.players[0].x)<.01);
  const p=a.players[0];p.x=490;p.y=330;
  for(let i=0;i<200;i++)a.step(1/120,[{x:1},{}]);
  assert.ok(p.x>700);
});
console.log(checks+' regression groups passed');
