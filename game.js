(() => {
  const c=document.getElementById('game'),x=c.getContext('2d');
  const W=c.width,H=c.height;
  const up=document.getElementById('up'),opts=document.getElementById('opts');
  const hud={wave:id('wave'),time:id('time'),hp:id('hp'),lvl:id('lvl'),xp:id('xp'),kills:id('kills')};
  const keys={},touch={active:false,x:0,y:0,dash:false};

  function id(i){return document.getElementById(i)}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  function rnd(a,b){return Math.random()*(b-a)+a}

  // touch joystick
  const joy=id('joy'),stick=id('stick'),dash=id('dash');
  let jc={x:0,y:0};
  function setJoy(){const r=joy.getBoundingClientRect();jc={x:r.left+r.width/2,y:r.top+r.height/2};}
  setJoy(); window.addEventListener('resize',setJoy);
  joy.addEventListener('touchstart',e=>{touch.active=true;moveJoy(e.touches[0]);e.preventDefault()},{passive:false});
  joy.addEventListener('touchmove',e=>{moveJoy(e.touches[0]);e.preventDefault()},{passive:false});
  joy.addEventListener('touchend',e=>{touch.active=false;touch.x=0;touch.y=0;stick.style.left='45px';stick.style.top='45px';e.preventDefault()},{passive:false});
  dash.addEventListener('touchstart',e=>{touch.dash=true;e.preventDefault()},{passive:false});
  dash.addEventListener('touchend',e=>{touch.dash=false;e.preventDefault()},{passive:false});
  function moveJoy(t){const dx=t.clientX-jc.x,dy=t.clientY-jc.y,r=42;const d=Math.hypot(dx,dy)||1,nx=dx/d,ny=dy/d,m=Math.min(d,r);touch.x=nx*(m/r);touch.y=ny*(m/r);stick.style.left=(45+nx*m)+'px';stick.style.top=(45+ny*m)+'px';}

  const S={};
  function reset(){
    S.run=true;S.t=0;S.wave=1;S.waveTime=30;S.waveClock=0;
    S.hp=100;S.maxHp=100;S.kills=0;S.level=1;S.xp=0;S.need=12;
    S.spawn=0;S.p={x:W/2,y:H/2,spd:3.6,dashCd:0,inv:0};
    S.damage=16;S.fireEvery=10;S.fireCd=0;S.bulletSpd=8.4;S.magnet=90;S.multi=1;
    S.en=[];S.b=[];S.g=[];S.fx=[];
    up.style.display='none';
    updateHud();
  }

  function updateHud(){
    hud.wave.textContent='Wave: '+S.wave;
    hud.time.textContent='Time: '+Math.floor(S.t/60)+'s';
    hud.hp.textContent='HP: '+Math.max(0,Math.floor(S.hp));
    hud.lvl.textContent='Lvl: '+S.level;
    hud.xp.textContent='XP: '+S.xp+'/'+S.need;
    hud.kills.textContent='Kills: '+S.kills;
  }

  function spawnEnemy(){
    const side=(Math.random()*4)|0;
    let ex=0,ey=0;
    if(side===0){ex=-20;ey=rnd(0,H)} else if(side===1){ex=W+20;ey=rnd(0,H)} else if(side===2){ex=rnd(0,W);ey=-20} else {ex=rnd(0,W);ey=H+20}
    const hp=18+S.wave*4+rnd(0,8), spd=1.05+S.wave*0.05+rnd(0,.6), r=11+rnd(0,4);
    S.en.push({x:ex,y:ey,hp,spd,r});
  }

  function nearest(){let best=null,bd=1e12;for(const e of S.en){const d=(e.x-S.p.x)**2+(e.y-S.p.y)**2;if(d<bd){bd=d;best=e}}return best}
  function fire(){if(S.fireCd>0||!S.run)return;const n=nearest();if(!n)return;for(let i=0;i<S.multi;i++){
      const dx=n.x-S.p.x,dy=n.y-S.p.y,m=Math.hypot(dx,dy)||1,spread=(i-(S.multi-1)/2)*0.14;
      const cs=Math.cos(spread),sn=Math.sin(spread); const vx=(dx/m*cs - dy/m*sn)*S.bulletSpd, vy=(dx/m*sn + dy/m*cs)*S.bulletSpd;
      S.b.push({x:S.p.x,y:S.p.y,vx,vy,r:3});
    } S.fireCd=S.fireEvery; }

  function levelUp(){
    S.level++; S.xp-=S.need; S.need=Math.floor(S.need*1.35+6); S.run=false;
    const all=[
      {n:'+Damage',d:'Bullets hit harder',fn:()=>S.damage+=8},
      {n:'+Fire Rate',d:'Shoot faster',fn:()=>S.fireEvery=Math.max(4,Math.floor(S.fireEvery*0.82))},
      {n:'+Move Speed',d:'Move faster',fn:()=>S.p.spd+=0.35},
      {n:'+Max HP',d:'Heal + tank',fn:()=>{S.maxHp+=18;S.hp=Math.min(S.maxHp,S.hp+24)}},
      {n:'+Bullet Speed',d:'Cleaner kiting',fn:()=>S.bulletSpd+=1.2},
      {n:'+Magnet',d:'Faster XP pickup',fn:()=>S.magnet+=55},
      {n:'+Multishot',d:'+1 projectile',fn:()=>S.multi=Math.min(5,S.multi+1)}
    ].sort(()=>Math.random()-0.5).slice(0,3);
    opts.innerHTML='';
    for(const ch of all){const d=document.createElement('div');d.className='opt';d.innerHTML=`<b>${ch.n}</b><div style="opacity:.86;margin-top:4px">${ch.d}</div>`;d.onclick=()=>{ch.fn();up.style.display='none';S.run=true;};opts.appendChild(d)}
    up.style.display='grid'; updateHud();
  }

  function gameOver(){
    S.run=false; up.style.display='grid';
    opts.innerHTML=`<div class="opt" style="cursor:default"><b>Run Over</b><div style="margin-top:6px">Wave ${S.wave} · Kills ${S.kills} · Time ${Math.floor(S.t/60)}s</div></div><div class="opt" id="again"><b>Play Again</b></div>`;
    id('again').onclick=reset;
  }

  function step(){
    S.t++;
    if(S.run){
      // wave logic
      S.waveClock++; if(S.waveClock>=S.waveTime*60){S.wave++;S.waveClock=0;S.spawn=0;}

      const l=keys.a||keys.ArrowLeft||(touch.active&&touch.x<-0.15), r=keys.d||keys.ArrowRight||(touch.active&&touch.x>0.15), u=keys.w||keys.ArrowUp||(touch.active&&touch.y<-0.15), d=keys.s||keys.ArrowDown||(touch.active&&touch.y>0.15);
      let mx=(r?1:0)-(l?1:0), my=(d?1:0)-(u?1:0); const m=Math.hypot(mx,my)||1; mx/=m; my/=m;
      S.p.x=clamp(S.p.x+mx*S.p.spd,18,W-18); S.p.y=clamp(S.p.y+my*S.p.spd,18,H-18);

      if(touch.dash && S.p.dashCd<=0){S.p.x=clamp(S.p.x+mx*76,18,W-18); S.p.y=clamp(S.p.y+my*76,18,H-18); S.p.dashCd=90;}
      if(S.p.dashCd>0)S.p.dashCd--; if(S.p.inv>0)S.p.inv--;

      if(S.fireCd>0)S.fireCd--; fire();

      // spawn scaling
      if(S.spawn--<=0){spawnEnemy(); S.spawn=Math.max(8, 34-Math.floor(S.wave*2.1));}

      // move enemies
      for(const e of S.en){const dx=S.p.x-e.x,dy=S.p.y-e.y,mm=Math.hypot(dx,dy)||1; e.x+=dx/mm*e.spd; e.y+=dy/mm*e.spd;}

      // move bullets
      for(const b of S.b){b.x+=b.vx; b.y+=b.vy;}
      S.b=S.b.filter(b=>b.x>-40&&b.x<W+40&&b.y>-40&&b.y<H+40&&!b.dead);

      // collisions bullet->enemy
      for(const b of S.b){
        for(const e of S.en){const dx=e.x-b.x,dy=e.y-b.y; if(dx*dx+dy*dy<(e.r+b.r)*(e.r+b.r)){e.hp-=S.damage; b.dead=true; if(e.hp<=0){e.dead=true;S.kills++;S.g.push({x:e.x,y:e.y,v:1}); for(let i=0;i<8;i++)S.fx.push({x:e.x,y:e.y,vx:rnd(-2.5,2.5),vy:rnd(-2.5,2.5),t:14+rnd(0,10),c:'#ffd166'});}}}
      }
      S.en=S.en.filter(e=>!e.dead);

      // collisions enemy->player
      for(const e of S.en){const dx=e.x-S.p.x,dy=e.y-S.p.y; if(dx*dx+dy*dy<(e.r+12)*(e.r+12) && S.p.inv<=0){S.hp=Math.max(0,S.hp-9); S.p.inv=28; for(let i=0;i<10;i++)S.fx.push({x:S.p.x,y:S.p.y,vx:rnd(-3,3),vy:rnd(-3,3),t:16,c:'#ff6b7a'}); if(S.hp<=0){gameOver();break;}}}

      // gems magnet
      for(const g of S.g){const dx=S.p.x-g.x,dy=S.p.y-g.y,mm=Math.hypot(dx,dy)||1;if(mm<S.magnet){g.x+=dx/mm*2.5;g.y+=dy/mm*2.5;} if(mm<12){g.take=true;S.xp+=g.v;}}
      S.g=S.g.filter(g=>!g.take);
      if(S.xp>=S.need) levelUp();

      for(const p of S.fx){p.x+=p.vx; p.y+=p.vy; p.t--;}
      S.fx=S.fx.filter(p=>p.t>0);
    }

    // draw
    const g=x.createLinearGradient(0,0,0,H); g.addColorStop(0,'#152a52'); g.addColorStop(.65,'#0b1730'); g.addColorStop(1,'#07101f'); x.fillStyle=g; x.fillRect(0,0,W,H);
    for(let i=0;i<90;i++){const sx=(i*137+S.t*1.1)%W, sy=(i*73)%H; x.fillStyle='rgba(255,255,255,.36)'; x.fillRect(sx,sy,2,2);}

    // entities
    for(const gg of S.g){x.fillStyle='#34d399';x.beginPath();x.arc(gg.x,gg.y,4.5,0,Math.PI*2);x.fill();}
    for(const b of S.b){x.fillStyle='#ffd166';x.fillRect(b.x-2.5,b.y-1.5,5,3);}    
    for(const e of S.en){x.fillStyle='#ff5a67';x.beginPath();x.arc(e.x,e.y,e.r,0,Math.PI*2);x.fill();}

    // player (bluejay orb style)
    x.fillStyle='#2f6fc0';x.beginPath();x.moveTo(S.p.x-12,S.p.y-2);x.lineTo(S.p.x-22,S.p.y-8);x.lineTo(S.p.x-19,S.p.y+5);x.closePath();x.fill();
    x.fillStyle='#49a4ff';x.beginPath();x.ellipse(S.p.x,S.p.y,16,11,0,0,Math.PI*2);x.fill();
    x.fillStyle='#fff';x.beginPath();x.arc(S.p.x+7,S.p.y-5,2.2,0,Math.PI*2);x.fill();
    x.fillStyle='#111';x.beginPath();x.arc(S.p.x+7.6,S.p.y-5,1,0,Math.PI*2);x.fill();
    x.fillStyle='#ffd166';x.beginPath();x.moveTo(S.p.x+11,S.p.y-4);x.lineTo(S.p.x+21,S.p.y-2);x.lineTo(S.p.x+11,S.p.y+1);x.closePath();x.fill();

    for(const p of S.fx){x.globalAlpha=Math.max(0,p.t/24);x.fillStyle=p.c;x.fillRect(p.x,p.y,3,3);x.globalAlpha=1;}

    updateHud();
    requestAnimationFrame(step);
  }

  window.addEventListener('keydown',e=>keys[e.key]=true);
  window.addEventListener('keyup',e=>keys[e.key]=false);
  id('restart').onclick=reset;

  reset();
  requestAnimationFrame(step);
})();