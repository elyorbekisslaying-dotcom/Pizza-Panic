'use strict';

const RivalRenderer = (() => {
  const {box,oval,poly}=PizzaArt;
  const ink='#452b37';
  const labels={dough:'DOUGH',topping:'TOPPINGS',oven:'OVEN',supply:'SUPPLIES $30',
    serving:'WAITER PICKUP',extinguisher:'EXTINGUISH / BIN',banana:'BANANA $25',rats:'RATS $80',waiter:'WAITER $140',assistant:'ASSISTANT $240'};
  const toppingArt=[{cheese:true,tomato:true},{cheese:true,pepperoni:true},{tomato:true,mushroom:true,olive:true}];
  function text(c,words,x,y,size=14,color=ink,align='center'){
    c.font='800 '+size+'px system-ui';c.textAlign=align;c.fillStyle=color;c.fillText(words,x,y);
  }
  function bar(c,x,y,w,ratio,color){
    box(c,x,y,w,6,3,'#563e48');box(c,x,y,w*Math.max(0,Math.min(1,ratio)),6,3,color);
  }
  function food(c,pizza,x,y,scale=1){
    if(!pizza)return;
    c.save();c.translate(x,y);c.scale(scale,scale);
    if(pizza.stage==='dough')oval(c,0,0,21,17,'#f1cf91',ink);
    else {
      PizzaArt.pizza(c,0,0,toppingArt[pizza.recipe],.85);
      if(pizza.stage==='raw'){oval(c,-18,-7,4,3,'#fff1cc');}
      if(pizza.stage==='burned'){oval(c,0,0,19,14,'#3a2b32');text(c,'×',0,5,20,'#a77b65');}
    }
    c.restore();
  }
  function person(c,x,y,color,vip=false){
    oval(c,x,y+17,15,5,'#37273733');
    box(c,x-12,y,24,20,8,color,ink);
    oval(c,x,y-5,11,12,'#edb186',ink);
    oval(c,x-4,y-6,1.5,2,ink);oval(c,x+4,y-6,1.5,2,ink);
    box(c,x-12,y-16,24,7,4,'#5d3d40');
    if(vip)poly(c,[[x-12,y-18],[x-14,y-29],[x-5,y-23],[x,y-33],[x+5,y-23],[x+14,y-29],[x+12,y-18]],'#ffd05f');
  }
  function table(c,table,customer,time){
    const {x,y}=table;
    box(c,x-17,y+31,34,29,7,'#ae775d',ink);
    box(c,x-17,y-58,34,29,7,'#ae775d',ink);
    box(c,x-table.w/2,y-table.h/2,table.w,table.h,11,table.type==='vip'?'#edc976':'#f1d2a6',ink);
    oval(c,x,y,19,15,'#fff2d2',ink);
    oval(c,x,y,13,10,'#b7d1bd');
    if(!customer){text(c,table.type==='vip'?'VIP':'TABLE '+(table.seat+1),x,y-3,12);return;}
    const travel=customer.departing?1-customer.leaving/2:Math.min(1,customer.age/1.5);
    const offset=(1-travel)*80;
    person(c,x,y+43+offset,customer.team===-1?'#9367b3':Kitchen.colors[customer.team],customer.team===-1);
    if(customer.departing){text(c,customer.patience>0?'Thanks!':'Too slow!',x,y+95,12);return;}
    const recipe=Kitchen.recipes[customer.recipe];
    box(c,x-88,y-122,176,61,8,'#fff3d9',ink);
    text(c,recipe.name+'  $'+(customer.team===-1?120:recipe.price),x,y-101,13);
    text(c,recipe.items.map(k=>k==='vegetables'?'veg':k).join(' · '),x,y-84,10);
    bar(c,x-77,y-74,154,customer.patience/customer.maxPatience,'#69a574');
  }
  function station(c,s,t,time){
    const {x,y,type}=s;
    oval(c,x,y+25,39,11,'#452b3733');
    box(c,x-35,y-26,70,52,8,type==='oven'?'#ae6258':Kitchen.colors[t.id],ink);
    box(c,x-30,y-23,60,39,6,'#f0d5b3',ink);
    switch(type){
      case 'dough':
        oval(c,x,y-3,19,13,'#f4d596',ink);
        box(c,x-24,y+10,48,5,2,'#9e6b48',ink);
        if(t.assistantPizza)food(c,t.assistantPizza,x,y);
        if(t.assistantJob)bar(c,x-28,y+20,56,1-t.assistantJob.left/4,'#fff19e');
        if(t.assistant)PizzaArt.chef(c,x+36,y-35,t.id?-1:1,Math.sin(time*15),false,'#7bbf98');
        break;
      case 'topping':
        ['tomato','cheese','pepperoni'].forEach((kind,i)=>PizzaArt.item(c,{kind,x:x-21+i*21,y,angle:0}));
        break;
      case 'oven':
        box(c,x-27,y-17,54,34,10,'#50313b',ink);
        if(t.oven){
          food(c,t.oven,x,y,.8);
          bar(c,x-30,y+20,60,t.oven.stage==='baking'?1-t.oven.timer/3:t.oven.timer/8,t.oven.stage==='baking'?'#f3a65b':'#89c976');
          text(c,t.oven.stage.toUpperCase(),x,y-36,11);
        }
        break;
      case 'supply':
        for(let i=0;i<3;i++)box(c,x-24+i*17,y-12,14,27,3,['#ce6354','#e5bc69','#92b46d'][i],ink);
        break;
      case 'extinguisher':
        box(c,x-8,y-17,17,34,5,'#db4c4e',ink);box(c,x-4,y-23,15,7,2,ink);
        box(c,x-5,y-5,11,10,2,'#fff2d6');break;
      case 'serving':
        box(c,x-24,y-12,48,27,4,'#b3cfb7',ink);
        if(t.waiterJob)food(c,t.waiterJob.pizza,x,y,.7);
        break;
      case 'banana': banana(c,x,y);break;
      case 'rats': rat(c,{x,y,stolen:false},time);break;
      case 'waiter': person(c,x,y-5,'#8c679f');break;
      case 'assistant': PizzaArt.chef(c,x,y,1,0,false,'#7bbf98');break;
    }
    box(c,x-62,y+30,124,21,5,'#483141');
    let label=labels[type];
    if((type==='waiter'||type==='assistant')&&t[type])label='HIRED';
    if(type==='rats'&&t.ratCD>0)label='RATS '+Math.ceil(t.ratCD)+'s';
    text(c,label,x,y+45,10,'#fff0d8');
  }
  function banana(c,x,y){
    c.save();c.translate(x,y);
    poly(c,[[-3,-14],[4,-12],[7,2],[20,12],[6,11],[0,5],[-9,14],[-21,9],[-8,2]],'#f6cc52');
    poly(c,[[0,-10],[0,5],[6,11],[10,10],[4,1]],'#fff0a3',null);
    c.restore();
  }
  function rat(c,r,time){
    const {x,y}=r;
    c.save();c.translate(x,y);
    c.strokeStyle='#b98b91';c.lineWidth=3;c.beginPath();c.moveTo(-14,4);
    c.quadraticCurveTo(-32,-14,-28+Math.sin(time*12)*4,10);c.stroke();
    oval(c,0,0,16,10,'#858492',ink);
    oval(c,12,-1,9,8,'#a29ca7',ink);
    oval(c,8,-9,5,6,'#d8a2a1',ink);
    oval(c,20,1,3,2,'#e6a4a5');oval(c,15,-3,1.5,2,ink);
    if(r.stolen)PizzaArt.item(c,{x:14,y:10,kind:'cheese'});
    c.restore();
  }
  function render(c,g){
    const time=g.time;
    c.clearRect(0,0,1200,720);
    c.fillStyle='#49303d';c.fillRect(0,0,1200,720);
    for(let y=40,row=0;y<710;y+=40,row++){
      for(let x=10,col=0;x<1190;x+=40,col++){
        c.fillStyle=(row+col)%2?(x<510?'#bfd4cc':x>690?'#e8c5bc':'#dfc69f'):'#f5e2c2';
        c.fillRect(x,y,39,39);
      }
    }
    text(c,'BLUE • THE ROLLING PIN',250,28,17,'#94cefa');
    text(c,'RED • SLICE & DICE',950,28,17,'#ffa3a6');
    text(c,'KITCHEN RIVALS',600,28,17,'#ffd57a');
    for(const wall of g.obstacles.filter(o=>!o.type)){
      box(c,wall.x-wall.w/2,wall.y-wall.h/2,wall.w,wall.h,4,'#75515b',ink);
    }
    for(const t of g.teams){
      t.stations.forEach(s=>station(c,s,t,time));
      t.tables.forEach(s=>table(c,s,t.customers.find(o=>o.seat===s.seat),time));
      if(t.fire){
        const x=t.stations[2].x;
        for(let i=0;i<3;i++)poly(c,[[x-28+i*18,215],[x-23+i*18,178-Math.sin(time*8+i)*9],[x-7+i*18,215]],i%2?'#ffcf65':'#f47843');
        text(c,'FIRE!',x,237,12,'#922e40');
      }
      if(t.waiter){
        const job=t.waiterJob;
        const source=t.stations[4],target=t.tables[job?.seat||0];
        const progress=job?1-job.left/job.total:0;
        const x=source.x+(target.x-source.x)*progress;
        const y=source.y+50+(target.y+45-source.y-50)*progress;
        person(c,x,y,'#886c9e');
        if(job)food(c,job.pizza,x+17,y+12,.5);
      }
    }
    table(c,g.vipTable,g.vip,time);
    for(const t of g.traps){
      c.save();c.globalAlpha=t.arm>time?.45:1;banana(c,t.x,t.y);c.restore();
    }
    g.drops.forEach(d=>{food(c,d.pizza,d.x,d.y,.7);text(c,d.owner?'RED':'BLUE',d.x,d.y+26,10);});
    g.rats.forEach(r=>rat(c,r,time));
    for(const p of g.players){
      if(p.dashTime>0)oval(c,p.x-p.faceX*20,p.y-p.faceY*20,27,15,Kitchen.colors[p.id]+'77');
      c.save();c.translate(p.x,p.y);
      if(p.stun)c.rotate(Math.sin(time*30)*.5);
      PizzaArt.chef(c,0,0,p.faceX<0?-1:1,Math.sin(p.walk)*3.5,p.immune>0&&Math.floor(time*12)%2===0,Kitchen.colors[p.id]);
      c.restore();
      if(p.hand)food(c,p.hand,p.x+20,p.y+10,.55);
      if(p.punchFX>0){
        const gx=p.x+p.faceX*38,gy=p.y+p.faceY*38;
        box(c,gx-12,gy-10,24,21,9,Kitchen.colors[p.id],ink);oval(c,gx-10,gy+6,7,6,Kitchen.colors[p.id],ink);
      }
      if(p.prep)bar(c,p.x-25,p.y-45,50,1-p.prep.left/1.2,'#ffe292');
      const s=g.nearest(p);
      if(s && !p.stun){
        const key=p.id?'Enter':'E';
        text(c,'['+key+'] '+(s.type==='table'?'Select / Serve':s.type==='vip'?'VIP Select / Serve':s.type.toUpperCase()),p.x,p.y-40,11,'#422a38');
      }

    }
    for(const e of g.effects){
      text(c,'★ '+e.text+' ★',e.x,e.y-(2-e.life)*35,20,'#a86616');
    }
  }
  return {render};
})();
