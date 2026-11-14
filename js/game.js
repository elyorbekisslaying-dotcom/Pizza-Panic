'use strict';

const RivalGame = (() => {
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const countdowns = ['stun','immune','punchCD','punchFX','dashCD','dashTime','trapCD','messageTime'];

  class Game {
    constructor(random = Math.random) {
      this.random = random;
      this.reset();
    }

    reset() {
      this.time = 0;
      this.nextId = 1;
      this.winner = null;
      this.rats = [];
      this.traps = [];
      this.drops = [];
      this.effects = [];
      this.sounds = [];
      this.notice = 'First to FIVE STARS wins. Select a table order, then cook!';
      this.noticeTime = 8;
      this.nextVIP = 35;
      this.nextRats = 38;
      this.nextFire = 65;
      this.vip = null;
      this.vipTable = {type:'vip',x:600,y:420,w:100,h:70};
      this.teams = [0,1].map(id => ({
        id, money:100, rep:0, stock:Object.fromEntries(Kitchen.stockKeys.map(k=>[k,4])),
        stations:Kitchen.stations(id), tables:Kitchen.tables(id), customers:[],
        nextCustomer:0, oven:null, fire:false, ratCD:0, waiter:false, assistant:false,
        waiterJob:null, assistantJob:null, assistantPizza:null, served:0, vipServed:0,
        spent:0, lost:0
      }));
      this.players = [0,1].map(id => ({
        id,x:id ? 940:260,y:370,faceX:id ? -1:1,faceY:0,walk:0,
        hand:null,selected:null,prep:null,bananas:0,
        stun:0,immune:0,punchCD:0,punchFX:0,dashCD:0,dashTime:0,trapCD:0,
        message:'Select an order at a table',messageTime:5,knockX:0,knockY:0
      }));
      this.obstacles = this.teams.flatMap(t=>[...t.stations,...t.tables]).concat([this.vipTable,
        {x:510,y:155,w:16,h:290},{x:690,y:155,w:16,h:290},
        {x:510,y:635,w:16,h:150},{x:690,y:635,w:16,h:150}]);
      for(const table of [...this.teams.flatMap(t=>t.tables),this.vipTable]){
        for(const offset of [-44,45]){
          this.obstacles.push({type:'chair',x:table.x,y:table.y+offset,w:34,h:29});
        }
      }
      this.teams.forEach(t=>this.addCustomer(t));
    }

    say(player,text) { player.message=text; player.messageTime=3; }
    announce(text,sound='event') { this.notice=text; this.noticeTime=5; this.sounds.push(sound); }
    order(id) {
      return [...this.teams.flatMap(t=>t.customers),this.vip].find(o=>o && o.id===id && !o.departing);
    }
    addCustomer(team) {
      const occupied = team.customers.map(c=>c.seat);
      const seat = [0,1].find(s=>!occupied.includes(s));
      if (seat===undefined) return;
      const index = team.served + team.lost + team.customers.length;
      team.customers.push({id:this.nextId++,team:team.id,seat,recipe:index%3,patience:65,maxPatience:65,age:0,leaving:0});
      team.nextCustomer = this.time + 20;
    }
    pizzaExists(id, owner = null) {
      return this.players.some(p=>(owner===null || p.id===owner) && (p.hand?.order===id || p.prep?.order===id)) ||
        this.teams.some(t=>(owner===null || t.id===owner) && (t.oven?.order===id || t.waiterJob?.pizza.order===id ||
          t.assistantJob?.order===id || t.assistantPizza?.order===id)) ||
        this.drops.some(d=>(owner===null || d.owner===owner) && d.pizza.order===id);
    }
    canUse(p,order) { return order && (order.team===p.id || order.team===-1); }
    nearest(p) {
      return [...this.teams[p.id].stations,...this.teams[p.id].tables,this.vipTable]
        .filter(s=>distance(p,s)<85).sort((a,b)=>distance(p,a)-distance(p,b))[0];
    }
    blocked(x,y,ignorePlayer) {
      if(x<24 || x>1176 || y<52 || y>696) return true;
      if(this.obstacles.some(o=>Math.hypot(x-clamp(x,o.x-o.w/2,o.x+o.w/2),
        y-clamp(y,o.y-o.h/2,o.y+o.h/2))<17)) return true;
      if(this.players.some(p=>p.id!==ignorePlayer && Math.hypot(p.x-x,p.y-y)<34)) return true;
      return this.teams.some(t=>{
        if(!t.fire)return false;
        const center={x:t.stations[2].x,y:195};
        const next=distance({x,y},center);
        return next<36 && next<distance(this.players[ignorePlayer],center);
      });
    }
    move(p,dx,dy) {
      const count=Math.max(1,Math.ceil(Math.hypot(dx,dy)/7));
      for(let i=0;i<count;i++){
        if(!this.blocked(p.x+dx/count,p.y,p.id)) p.x+=dx/count;
        if(!this.blocked(p.x,p.y+dy/count,p.id)) p.y+=dy/count;
      }
    }
    spend(team,amount) {
      if(team.money<amount) return false;
      team.money-=amount; team.spent+=amount; return true;
    }
    deliver(pizza,team) {
      const order=this.order(pizza.order);
      if(!order || pizza.owner!==team.id || pizza.recipe!==order.recipe || pizza.stage!=='ready' || (order.team!==team.id && order.team!==-1)) return false;
      if(order.team===-1 && pizza.owner!==team.id) return false;
      const vip=order.team===-1;
      const oldStars=Math.floor(team.rep/25);
      team.money+=(vip?120:Kitchen.recipes[order.recipe].price)+Math.floor(order.patience/10);
      team.rep=Math.min(100,team.rep+(vip?20:10));
      team.served++;
      if(vip){team.vipServed++;this.vip=null;this.nextVIP=this.time+48;}
      else {order.leaving=2;order.departing=true;team.nextCustomer=this.time+10;}
      this.sounds.push('serve');
      if(Math.floor(team.rep/25)>oldStars) this.announce((team.id?'RED':'BLUE')+' earned a STAR!','star');
      this.effects.push({x:team.id?970:230,y:420,text:vip?'+20 REPUTATION':' +10 REPUTATION',life:2});
      if(team.rep>=100){this.winner=team.id;this.announce((team.id?'RED':'BLUE')+' RESTAURANT WINS!','win');}
      return true;
    }

    interact(p) {
      if(p.stun || p.prep || this.winner!==null) return;
      const drop=this.drops.find(d=>d.owner===p.id && d.unlock<=this.time && distance(p,d)<48);
      if(!p.hand && drop){p.hand=drop.pizza;this.drops.splice(this.drops.indexOf(drop),1);return;}
      const s=this.nearest(p);
      if(!s){this.say(p,'Move closer to a station or table');return;}
      const t=this.teams[p.id];
      const order=this.order(p.selected);
      if(s.type==='table' || s.type==='vip'){
        const customer=s.type==='vip'?this.vip:t.customers.find(c=>c.seat===s.seat&&!c.leaving);
        if(!customer){this.say(p,'Waiting for a customer');return;}
        if(p.hand?.order===customer.id && this.deliver(p.hand,t)){p.hand=null;return;}
        p.selected=customer.id;
        this.say(p,'Selected '+Kitchen.recipes[customer.recipe].name);
        return;
      }
      if(s.type==='supply'){
        if(this.spend(t,30)){
          Kitchen.stockKeys.forEach(k=>t.stock[k]+=4);this.say(p,'Restocked +4 of everything');
        } else {
          const missing=Kitchen.stockKeys.some(k=>t.stock[k]<1);
          if(missing){Kitchen.stockKeys.forEach(k=>t.stock[k]=Math.max(1,t.stock[k]));this.say(p,'Emergency supplies: one recipe');}
          else this.say(p,'Pack costs $30. You still have supplies.');
        }
      } else if(s.type==='extinguisher'){
        if(t.fire){t.fire=false;this.sounds.push('event');this.say(p,'Fire extinguished!');}
        else if(p.hand){p.hand=null;this.say(p,'Carried pizza discarded');}
        else this.say(p,'No fire. Also discards carried food.');
      } else if(Kitchen.purchases[s.type]){
        const kind=s.type;
        if((kind==='waiter'||kind==='assistant')&&t[kind]){this.say(p,'Already hired');return;}
        if(kind==='rats'&&t.ratCD>0){this.say(p,'Rats ready in '+Math.ceil(t.ratCD)+'s');return;}
        if(kind==='banana'&&p.bananas>=3){this.say(p,'Carry at most 3 traps');return;}
        if(!this.spend(t,Kitchen.purchases[kind])){this.say(p,'Not enough money');return;}
        if(kind==='banana')p.bananas++;
        else if(kind==='rats'){t.ratCD=45;this.invade(1-p.id);}
        else t[kind]=true;
        this.say(p,kind+' purchased');
      } else if(s.type==='dough'){
        if(p.hand){this.say(p,'Hands full');return;}
        if(t.assistantPizza){p.hand=t.assistantPizza;t.assistantPizza=null;this.say(p,'Assistant pizza collected');return;}
        if(!this.canUse(p,order)){this.say(p,'Select an order at its table first');return;}
        if(this.pizzaExists(order.id,p.id)){this.say(p,'This pizza is already being prepared');return;}
        if(t.stock.dough<1){this.say(p,'Buy supplies first');return;}
        t.stock.dough--;
        p.prep={order:order.id,recipe:order.recipe,owner:p.id,stage:'dough',left:1.2};
      } else if(s.type==='topping'){
        if(p.hand?.stage!=='dough'){this.say(p,'Prepare dough first');return;}
        const items=Kitchen.recipes[p.hand.recipe].items.filter(k=>k!=='dough');
        if(items.some(k=>t.stock[k]<1)){this.say(p,'Missing ingredients: visit supplies');return;}
        items.forEach(k=>t.stock[k]--);
        p.prep={...p.hand,stage:'raw',left:1.2};p.hand=null;
      } else if(s.type==='oven'){
        if(t.fire){this.say(p,'Use your extinguisher first!');return;}
        if(t.oven){
          if(t.oven.stage==='burned'){t.oven=null;this.say(p,'Burned pizza discarded');}
          else if(t.oven.stage==='ready'&&!p.hand){p.hand=t.oven;t.oven=null;}
          else this.say(p,'Oven busy / hands full');
        } else if(p.hand?.stage==='raw'){
          t.oven={...p.hand,stage:'baking',timer:3};p.hand=null;
        } else this.say(p,'Bring an assembled raw pizza');
      } else if(s.type==='serving'){
        if(!t.waiter){this.say(p,'Hire a waiter or serve at the table');return;}
        const target=this.order(p.hand?.order);
        if(p.hand?.stage!=='ready'||target?.team!==p.id){this.say(p,'Waiter accepts your regular orders only');return;}
        if(t.waiterJob){this.say(p,'Waiter is delivering');return;}
        t.waiterJob={pizza:p.hand,left:2.5,total:2.5,seat:target.seat};p.hand=null;
      }
    }

    drop(p) {
      if(p.hand){this.drops.push({x:p.x,y:p.y,pizza:p.hand,owner:p.id,unlock:this.time+.6,life:30});p.hand=null;}
    }
    hit(victim,dx,dy) {
      if(victim.immune>0)return;
      this.drop(victim);
      victim.stun=.5;victim.immune=2.5;
      const length=Math.hypot(dx,dy)||1;
      victim.knockX=dx/length*320;victim.knockY=dy/length*320;
      this.sounds.push('punch');
    }
    punch(p) {
      if(p.stun||p.punchCD)return;
      p.punchCD=2;p.punchFX=.22;this.sounds.push('punch');
      const other=this.players[1-p.id];
      const inFront=o=>(o.x-p.x)*p.faceX+(o.y-p.y)*p.faceY>-12;
      if(distance(p,other)<76 && inFront(other))this.hit(other,other.x-p.x,other.y-p.y);
      this.rats=this.rats.filter(r=>!(distance(p,r)<90&&inFront(r)));
    }
    trap(p) {
      if(p.stun||p.trapCD||!p.bananas)return;
      p.bananas--;p.trapCD=1;
      this.traps.push({x:p.x,y:p.y,owner:p.id,arm:this.time+1.2,life:35});
      this.say(p,'Trap arms in 1.2s');
    }
    dash(p) {
      if(p.stun||p.dashCD||p.prep)return;
      p.dashCD=5;p.dashTime=.22;this.sounds.push('dash');
    }
    invade(team) {
      if(this.rats.filter(r=>r.team===team).length>=2)return;
      this.rats.push({team,x:team?1180:20,y:360,phase:'in',age:0,stolen:false});
      this.announce((team?'RED':'BLUE')+' kitchen: RAT INVASION!');
    }

    step(dt,inputs=[{},{}]) {
      if(this.winner!==null)return;
      this.time+=dt;
      this.noticeTime=Math.max(0,this.noticeTime-dt);
      this.effects=this.effects.filter(e=>(e.life-=dt)>0);
      // Remove every reference to a canceled order before it can be acted on.
      for(const t of this.teams){
        for(const c of t.customers){
          c.age+=dt;
          if(c.departing){c.leaving-=dt;continue;}
          c.patience-=dt;
          if(c.patience<=0){c.leaving=2;c.departing=true;t.rep=Math.max(0,t.rep-5);t.lost++;t.nextCustomer=this.time+10;}
        }
        t.customers=t.customers.filter(c=>c.departing ? c.leaving>0 : c.patience>0);
        if(t.customers.length<2 && this.time>=t.nextCustomer)this.addCustomer(t);
        t.ratCD=Math.max(0,t.ratCD-dt);
        for(const key of ['oven','assistantPizza','assistantJob']){
          if(t[key]&&!this.order(t[key].order))t[key]=null;
        }
        if(t.waiterJob&&!this.order(t.waiterJob.pizza.order))t.waiterJob=null;
        if(t.oven){
          t.oven.timer-=dt;
          if(t.oven.stage==='baking'&&t.oven.timer<=0){
            t.oven.stage='ready';t.oven.timer=8;this.sounds.push('ready');
          } else if(t.oven.stage==='ready'&&t.oven.timer<=0){
            t.oven.stage='burned';this.sounds.push('burn');
          }
        }
        if(t.waiterJob){
          t.waiterJob.left-=dt;
          if(t.waiterJob.left<=0){this.deliver(t.waiterJob.pizza,t);t.waiterJob=null;if(this.winner!==null)return;}
        }
        if(t.assistantJob){
          t.assistantJob.left-=dt;
          if(t.assistantJob.left<=0){t.assistantPizza={...t.assistantJob,stage:'raw'};t.assistantJob=null;}
        } else if(t.assistant&&!t.assistantPizza){
          const target=t.customers.find(c=>!c.leaving && !this.pizzaExists(c.id) &&
            Kitchen.recipes[c.recipe].items.every(k=>t.stock[k]>0));
          if(target){
            Kitchen.recipes[target.recipe].items.forEach(k=>t.stock[k]--);
            t.assistantJob={order:target.id,owner:t.id,recipe:target.recipe,left:4};
          }
        }
      }
      if(this.vip){
        this.vip.patience-=dt;this.vip.age+=dt;
        if(this.vip.patience<=0){this.vip=null;this.nextVIP=this.time+40;}
      } else if(this.time>=this.nextVIP){
        this.vip={id:this.nextId++,team:-1,recipe:Math.floor(this.random()*3),patience:45,maxPatience:45,age:0};
        this.announce('VIP CUSTOMER HAS ARRIVED! $120 +20 REP','vip');
      }
      for(const p of this.players){
        countdowns.forEach(k=>p[k]=Math.max(0,p[k]-dt));
        for(const key of ['hand','prep'])if(p[key]&&!this.order(p[key].order))p[key]=null;
        if(p.prep){
          p.prep.left-=dt;
          if(p.prep.left<=0){p.hand=p.prep;p.prep=null;}
        }
        const input=inputs[p.id]||{};
        let x=input.x||0,y=input.y||0;
        const length=Math.hypot(x,y);
        if(p.stun){this.move(p,p.knockX*dt,p.knockY*dt);continue;}
        if(length && !p.prep){
          x/=length;y/=length;p.faceX=x;p.faceY=y;p.walk+=dt*20;
          const speed=p.dashTime>0?610:210;
          this.move(p,x*speed*dt,y*speed*dt);
        }
      }
      for(const trap of this.traps){
        trap.life-=dt;
        const victim=this.players[1-trap.owner];
        if(trap.arm<=this.time && distance(trap,victim)<28 && !victim.immune){
          this.hit(victim,victim.faceX,victim.faceY);trap.life=0;this.sounds.push('slip');
        }
      }
      this.traps=this.traps.filter(t=>t.life>0);
      this.drops=this.drops.filter(d=>(d.life-=dt)>0 && this.order(d.pizza.order) &&
        !this.teams.some(t=>t.fire&&distance(d,{x:t.stations[2].x,y:195})<40));
      if(this.time>=this.nextRats){this.invade(0);this.invade(1);this.nextRats=this.time+50;}
      for(const rat of this.rats){
        rat.age+=dt;
        if(this.players.some(p=>distance(p,rat)<48))rat.phase='out';
        const edge=rat.team?1180:20;
        const target=rat.phase==='in'?{x:edge,y:280}:{x:edge,y:720};
        const d=distance(rat,target);
        if(d<8 && rat.phase==='in'){
          const team=this.teams[rat.team];
          const keys=Kitchen.stockKeys.filter(k=>team.stock[k]>0);
          if(keys.length){const key=keys[Math.floor(this.random()*keys.length)];team.stock[key]--;rat.stolen=true;}
          rat.phase='out';
        } else if(d>0){rat.x+=(target.x-rat.x)/d*85*dt;rat.y+=(target.y-rat.y)/d*85*dt;}
      }
      this.rats=this.rats.filter(r=>r.age<12 && r.y<710);
      if(this.time>=this.nextFire){
        const t=this.teams[Math.floor(this.random()*2)];t.fire=true;
        this.announce((t.id?'RED':'BLUE')+' oven fire! Use the extinguisher.');
        this.nextFire=this.time+65;
      }
    }
  }
  return {Game,distance};
})();
