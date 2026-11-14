'use strict';

(() => {
  const game = new RivalGame.Game();
  const canvas=document.getElementById('kitchen');
  const ctx=canvas.getContext('2d');
  const overlay=document.getElementById('overlay');
  const keys=new Set();
  let state='menu', audio, muted=false, previous=null, accumulator=0, uiClock=0;
  const keyCodes=new Set(Kitchen.controls.flatMap(c=>Object.values(c)).concat(['Space']));
  function sound(type){
    if(muted||!audio||audio.state!=='running')return;
    const frequencies={serve:650,punch:110,slip:270,event:180,ready:880,burn:90,vip:740,star:990,win:1200,dash:300};
    const osc=audio.createOscillator(), gain=audio.createGain(),now=audio.currentTime;
    osc.type=['punch','burn'].includes(type)?'triangle':'sine';
    osc.frequency.setValueAtTime(frequencies[type]||440,now);
    osc.frequency.exponentialRampToValueAtTime((frequencies[type]||440)*1.4,now+.13);
    gain.gain.setValueAtTime(.06,now);gain.gain.exponentialRampToValueAtTime(.001,now+.2);
    osc.connect(gain).connect(audio.destination);osc.start(now);osc.stop(now+.21);
  }
  function unlock(){
    try{audio??=new AudioContext();audio.resume().catch(()=>{});}catch{}
  }
  function menuButtons(buttons){
    document.getElementById('actions').replaceChildren(...buttons.map(([label,handler])=>{
      const b=document.createElement('button');b.textContent=label;b.onclick=handler;return b;
    }));
    document.getElementById('actions').firstChild?.focus();
  }
  function show(next){
    state=next;keys.clear();accumulator=0;
    overlay.hidden=state==='play';
    document.getElementById('pause').disabled=state!=='play'&&state!=='pause';
    if(state==='play'){document.activeElement?.blur();return;}
    const title=document.getElementById('title'),description=document.getElementById('description');
    if(state==='menu'){
      title.textContent='Pizza Panic — Kitchen Rivals';
      description.innerHTML='<p>Build a five-star restaurant before your rival does.</p><p>Cook, serve, race for VIPs — and throw a little trouble into the other kitchen.</p><p><b>Two people · One keyboard · First to 100 reputation</b></p>';
      menuButtons([['Start rivalry',start],['How to play',()=>show('help')]]);
    }else if(state==='help'){
      title.textContent='Your first pizza';
      description.innerHTML='<ol><li>Walk to your customer’s table and press <b>E / Enter</b> to select the order.</li><li>Visit <b>Dough → Toppings → Oven</b>. Press your interact key at each station.</li><li>Bake for <b>3 seconds</b>. Collect before the next 8 seconds pass, or it burns!</li><li>Return to the matching customer and interact to serve. Each delivery earns <b>10 reputation</b>.</li></ol><p>VIP orders at the center award <b>$120 +20 reputation</b>. Either chef can select the VIP.</p><p>Buy supplies and gadgets at your own labeled counters. Punch rats and rivals, deploy purchased banana traps, and dash. Use the extinguisher for fires or to discard food.</p><p>A hired waiter takes regular pizzas from the pickup counter. An assistant prepares raw pizzas at Dough. Expired orders clear automatically. Unpaid emergency supplies prevent bankruptcy traps.</p><p><b>Blue</b> WASD · E interact · F punch · Q trap · Left Shift dash<br><b>Red</b> Arrows · Enter interact · / punch · . trap · Right Shift dash<br>Esc pauses · M mutes. Purchases happen immediately on interaction.</p>';
      menuButtons([['Start rivalry',start],['Main menu',()=>show('menu')]]);
    }else if(state==='pause'){
      title.textContent='Kitchen break';
      description.textContent='Both restaurants are paused.';
      menuButtons([['Resume',()=>show('play')],['Restart',start],['Main menu',()=>show('menu')]]);
    }else{
      title.textContent=(game.winner?'RED':'BLUE')+' wins — five stars!';
      description.innerHTML=game.teams.map(t=>'<p><b>'+(t.id?'RED':'BLUE')+'</b> · '+t.rep+' reputation · '+t.served+' served ('+t.vipServed+' VIP) · $'+t.money+' remaining · '+t.lost+' unhappy</p>').join('')+
        '<p>Match length '+Math.floor(game.time/60)+'m '+Math.floor(game.time%60)+'s</p>';
      menuButtons([['Rematch',start],['Main menu',()=>show('menu')]]);
    }
  }
  function start(){unlock();game.reset();show('play');hud();}
  function pause(){if(state==='play')show('pause');else if(state==='pause')show('play');}
  function mute(){muted=!muted;document.getElementById('mute').textContent=muted?'Muted [M]':'Sound on [M]';}
  document.getElementById('pause').onclick=pause;
  document.getElementById('mute').onclick=mute;
  window.addEventListener('keydown',event=>{
    if(state==='play' && keyCodes.has(event.code))event.preventDefault();
    if(event.repeat)return;
    if(event.code==='Escape'){pause();return;}
    if(event.code==='KeyM'){mute();return;}
    if(state!=='play')return;
    keys.add(event.code);
    Kitchen.controls.forEach((controls,id)=>{
      const p=game.players[id];
      if(event.code===controls.interact)game.interact(p);
      if(event.code===controls.punch)game.punch(p);
      if(event.code===controls.trap)game.trap(p);
      if(event.code===controls.dash)game.dash(p);
    });
    if(game.winner!==null)show('win');
  });
  window.addEventListener('keyup',event=>keys.delete(event.code));
  window.addEventListener('blur',()=>{keys.clear();if(state==='play')show('pause');});
  function hud(){
    game.teams.forEach((t,id)=>{
      const p=game.players[id],o=game.order(p.selected),stars=1+Math.floor(t.rep/25);
      const stock=Kitchen.stockKeys.map(k=>(k==='vegetables'?'veg':k)+':'+t.stock[k]).join(' · ');
      const hand=p.hand?Kitchen.recipes[p.hand.recipe].name+' ('+p.hand.stage+')':p.prep?'Preparing…':'Empty hands';
      document.getElementById(id?'red':'blue').innerHTML='<h2>'+(id?'RED RESTAURANT':'BLUE RESTAURANT')+' · $'+t.money+'</h2>'+
        '<span class="stars">'+'★'.repeat(stars)+'☆'.repeat(5-stars)+'</span> <progress max="25" value="'+(t.rep===100?25:t.rep%25)+'"></progress> '+t.rep+'/100'+
        '<p>'+t.customers.filter(c=>!c.departing).length+'/2 tables · '+(o?Kitchen.recipes[o.recipe].name+(o.team===-1?' [VIP]':' [T'+(o.seat+1)+']'):'Select a table order')+'</p>'+
        '<p>'+stock+'</p><p>'+hand+'</p><p>Bananas '+p.bananas+' · Punch '+Math.ceil(p.punchCD)+'s · Dash '+Math.ceil(p.dashCD)+'s</p>';
    });
    document.getElementById('event').textContent=game.noticeTime>0?game.notice:game.vip?
      'VIP: '+Kitchen.recipes[game.vip.recipe].name+' · '+Math.ceil(game.vip.patience)+'s':'Next VIP in '+Math.ceil(game.nextVIP-game.time)+'s';
  }
  function frame(now){
    const dt=previous===null?0:Math.min(.1,(now-previous)/1000);previous=now;
    if(state==='play'){
      accumulator+=dt;
      const inputs=Kitchen.controls.map(c=>({x:Number(keys.has(c.right))-Number(keys.has(c.left)),y:Number(keys.has(c.down))-Number(keys.has(c.up))}));
      while(accumulator>=1/120){game.step(1/120,inputs);accumulator-=1/120;if(game.winner!==null){show('win');break;}}
      game.sounds.splice(0).forEach(sound);
    }
    uiClock+=dt;
    if(uiClock>.1){hud();uiClock=0;}
    RivalRenderer.render(ctx,game);
    requestAnimationFrame(frame);
  }
  // Explicit opt-in hook for repeatable browser regression tests, absent in ordinary play.
  if(location.search.includes('test=1'))window.rivalTest={game,start,show,get state(){return state;}};
  show('menu');hud();requestAnimationFrame(frame);
})();
