(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const hud = {
    hp: document.getElementById('hp'), lvl: document.getElementById('lvl'), xp: document.getElementById('xp'),
    time: document.getElementById('time'), kills: document.getElementById('kills')
  };
  const levelUpEl = document.getElementById('levelup');
  const optsEl = document.getElementById('opts');

  const keys = {};
  const touch = {active:false,x:0,y:0,dash:false};
  const joy = document.getElementById('joy');
  const stick = document.getElementById('stick');
  const dashBtn = document.getElementById('dash');

  let joyCenter = {x:0,y:0};
  function setJoyCenter(){ const r=joy.getBoundingClientRect(); joyCenter={x:r.left+r.width/2,y:r.top+r.height/2}; }
  setJoyCenter(); window.addEventListener('resize', setJoyCenter);
  joy.addEventListener('touchstart',e=>{touch.active=true;handleJoy(e.touches[0]);e.preventDefault();},{passive:false});
  joy.addEventListener('touchmove',e=>{handleJoy(e.touches[0]);e.preventDefault();},{passive:false});
  joy.addEventListener('touchend',e=>{touch.active=false;touch.x=0;touch.y=0;stick.style.left='45px';stick.style.top='45px';e.preventDefault();},{passive:false});
  dashBtn.addEventListener('touchstart',e=>{touch.dash=true;e.preventDefault();},{passive:false});
  dashBtn.addEventListener('touchend',e=>{touch.dash=false;e.preventDefault();},{passive:false});
  function handleJoy(t){
    const dx=t.clientX-joyCenter.x,dy=t.clientY-joyCenter.y,r=42;
    const d=Math.hypot(dx,dy)||1,nx=dx/d,ny=dy/d,mag=Math.min(d,r);
    touch.x=nx*(mag/r); touch.y=ny*(mag/r);
    stick.style.left=(45+nx*mag)+'px'; stick.style.top=(45+ny*mag)+'px';
  }

  const S = {
    run:true,t:0,elapsed:0,
    p:{x:W/2,y:H/2,spd:3.3,hp:100,maxHp:100,dashCd:0,inv:0},
    bullets:[],enemies:[],gems:[],parts:[],
    score:0,kills:0,level:1,xp:0,xpNeed:10,
    fireCd:0,fireEvery:10,damage:16,bulletSpeed:7.4,magnet:100,
    spawnEvery:34,spawnTick:0
  };

  function updateHud(){
    hud.hp.textContent = `HP: ${Math.max(0,Math.floor(S.p.hp))}`;
    hud.lvl.textContent = `Level: ${S.level}`;
    hud.xp.textContent = `XP: ${S.xp}/${S.xpNeed}`;
    hud.time.textContent = `Time: ${Math.floor(S.elapsed)}s`;
    hud.kills.textContent = `Kills: ${S.kills}`;
  }

  function spawnEnemy(){
    const edge = (Math.random()*4)|0;
    let ex=0,ey=0;
    if(edge===0){ex=-20;ey=Math.random()*H}
    else if(edge===1){ex=W+20;ey=Math.random()*H}
    else if(edge===2){ex=Math.random()*W;ey=-20}
    else {ex=Math.random()*W;ey=H+20}
    S.enemies.push({x:ex,y:ey,hp:24+S.level*4,spd:1.05+Math.random()*1.1+S.level*0.04,r:12});
  }

  function nearestEnemy(){
    let best=null,bd=1e12;
    for(const e of S.enemies){const d=(e.x-S.p.x)**2+(e.y-S.p.y)**2; if(d<bd){bd=d;best=e;}}
    return best;
  }

  function fire(){
    if(S.fireCd>0) return;
    const n=nearestEnemy(); if(!n) return;
    const dx=n.x-S.p.x,dy=n.y-S.p.y,m=Math.hypot(dx,dy)||1;
    S.bullets.push({x:S.p.x,y:S.p.y,vx:dx/m*S.bulletSpeed,vy:dy/m*S.bulletSpeed,r:4});
    S.fireCd=S.fireEvery;
  }

  function burst(x,y,col='#ffd166'){
    for(let i=0;i<10;i++) S.parts.push({x,y,vx:(Math.random()*2-1)*2.8,vy:(Math.random()*2-1)*2.8,t:14+Math.random()*14,c:col});
  }

  function lvlUp(){
    S.level++; S.xp -= S.xpNeed; S.xpNeed = Math.floor(S.xpNeed*1.32+6);
    S.run=false;
    const opts=[
      {n:'+Damage',d:'Bullets hit harder',fn:()=>S.damage+=8},
      {n:'+Fire Rate',d:'Shoot faster',fn:()=>S.fireEvery=Math.max(4,Math.floor(S.fireEvery*0.82))},
      {n:'+Move Speed',d:'Move faster',fn:()=>S.p.spd+=0.45},
      {n:'+Max HP',d:'Heal and increase HP',fn:()=>{S.p.maxHp+=20;S.p.hp=Math.min(S.p.maxHp,S.p.hp+28)}},
      {n:'+Bullet Speed',d:'Projectiles travel faster',fn:()=>S.bulletSpeed+=1.1},
      {n:'+Magnet',d:'Pull XP from farther away',fn:()=>S.magnet+=55}
    ].sort(()=>Math.random()-0.5).slice(0,3);

    optsEl.innerHTML='';
    for(const ch of opts){
      const div=document.createElement('div'); div.className='opt';
      div.innerHTML=`<b>${ch.n}</b><div style="opacity:.85;margin-top:4px">${ch.d}</div>`;
      div.onclick=()=>{ch.fn(); levelUpEl.style.display='none'; S.run=true;};
      optsEl.appendChild(div);
    }
    levelUpEl.style.display='grid';
  }

  function gameOver(){
    S.run=false;
    optsEl.innerHTML=`<div class="opt" style="cursor:default"><b>Run Over</b><div style="margin-top:6px">Time: ${Math.floor(S.elapsed)}s · Kills: ${S.kills} · Level: ${S.level}</div></div><div class="opt" id="again"><b>Play Again</b><div>Restart run</div></div>`;
    levelUpEl.style.display='grid';
    document.getElementById('again').onclick=()=>location.reload();
  }

  function drawBird(x,y){
    ctx.save(); ctx.translate(x,y);
    // bluejay body
    ctx.fillStyle='#2f6fc0'; ctx.beginPath(); ctx.moveTo(-14,-2); ctx.lineTo(-26,-8); ctx.lineTo(-23,4); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#49a4ff'; ctx.beginPath(); ctx.ellipse(-1,0,18,12,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(240,248,255,.92)'; ctx.beginPath(); ctx.ellipse(1,4,8,5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#49a4ff'; ctx.beginPath(); ctx.moveTo(0,-11); ctx.lineTo(4,-18); ctx.lineTo(8,-11); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(8,-6,2.4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(8.6,-6,1,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ffd166'; ctx.beginPath(); ctx.moveTo(13,-5); ctx.lineTo(24,-2); ctx.lineTo(13,1); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  window.addEventListener('keydown',e=>keys[e.key]=true);
  window.addEventListener('keyup',e=>keys[e.key]=false);

  function tick(){
    S.t++;
    if(S.run){
      S.elapsed += 1/60;
      // player move
      const left = keys.a||keys.ArrowLeft||(touch.active&&touch.x<-0.15);
      const right= keys.d||keys.ArrowRight||(touch.active&&touch.x>0.15);
      const up   = keys.w||keys.ArrowUp||(touch.active&&touch.y<-0.15);
      const down = keys.s||keys.ArrowDown||(touch.active&&touch.y>0.15);
      let mx=(right?1:0)-(left?1:0), my=(down?1:0)-(up?1:0);
      const m=Math.hypot(mx,my)||1; mx/=m; my/=m;
      S.p.x=Math.max(20,Math.min(W-20,S.p.x+mx*S.p.spd));
      S.p.y=Math.max(20,Math.min(H-20,S.p.y+my*S.p.spd));

      if(touch.dash && S.p.dashCd<=0){ S.p.x=Math.max(20,Math.min(W-20,S.p.x+mx*70)); S.p.y=Math.max(20,Math.min(H-20,S.p.y+my*70)); S.p.dashCd=100; }
      if(S.p.dashCd>0) S.p.dashCd--;

      if(S.fireCd>0) S.fireCd--; fire();

      // spawn
      if(S.spawnTick--<=0){ spawnEnemy(); S.spawnTick=Math.max(10,S.spawnEvery - Math.floor(S.elapsed/20)); }

      // enemies chase
      for(const e of S.enemies){
        const dx=S.p.x-e.x,dy=S.p.y-e.y,m=Math.hypot(dx,dy)||1;
        e.x += dx/m*e.spd; e.y += dy/m*e.spd;
      }

      // bullets
      for(const b of S.bullets){ b.x+=b.vx; b.y+=b.vy; }
      S.bullets=S.bullets.filter(b=>b.x>-30&&b.x<W+30&&b.y>-30&&b.y<H+30);

      // bullet-enemy collisions
      for(const b of S.bullets){
        for(const e of S.enemies){
          const dx=e.x-b.x,dy=e.y-b.y;
          if(dx*dx+dy*dy<(e.r+b.r)*(e.r+b.r)){
            e.hp -= S.damage; b.dead=true;
            if(e.hp<=0){ e.dead=true; S.kills++; S.score += 25+S.level*2; S.gems.push({x:e.x,y:e.y,v:1}); burst(e.x,e.y); }
          }
        }
      }
      S.bullets=S.bullets.filter(b=>!b.dead);
      S.enemies=S.enemies.filter(e=>!e.dead);

      // enemy-player hits
      if(S.p.inv>0) S.p.inv--;
      for(const e of S.enemies){
        const dx=e.x-S.p.x,dy=e.y-S.p.y;
        if(dx*dx+dy*dy<(e.r+12)*(e.r+12) && S.p.inv<=0){
          S.p.hp=Math.max(0,S.p.hp-10); S.p.inv=32; burst(S.p.x,S.p.y,'#ff6b7a');
          if(S.p.hp<=0){ gameOver(); break; }
        }
      }

      // gems & magnet
      for(const g of S.gems){
        const dx=S.p.x-g.x,dy=S.p.y-g.y,d=Math.hypot(dx,dy)||1;
        if(d<S.magnet){ g.x += dx/d*2.8; g.y += dy/d*2.8; }
        if(d<14){ S.xp += g.v; g.take=true; }
      }
      S.gems=S.gems.filter(g=>!g.take);

      if(S.xp>=S.xpNeed) lvlUp();
      S.score += 0.08;
    }

    for(const p of S.parts){ p.x+=p.vx; p.y+=p.vy; p.t--; }
    S.parts=S.parts.filter(p=>p.t>0);

    // draw
    const grad=ctx.createLinearGradient(0,0,0,H); grad.addColorStop(0,'#152a52'); grad.addColorStop(.6,'#0b1730'); grad.addColorStop(1,'#07101f');
    ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(255,255,255,.2)'; ctx.font='600 16px system-ui'; ctx.fillText('Feather Rift Survivors active',14,24);

    for(let i=0;i<70;i++){ const sx=(i*157+S.t*1.4)%W, sy=(i*89)%H; ctx.fillStyle='rgba(255,255,255,.45)'; ctx.fillRect(sx,sy,2,2); }

    for(const g of S.gems){ ctx.fillStyle='#34d399'; ctx.beginPath(); ctx.arc(g.x,g.y,5,0,Math.PI*2); ctx.fill(); }
    for(const b of S.bullets){ ctx.fillStyle='#ffd166'; ctx.fillRect(b.x-3,b.y-2,6,4); }
    for(const e of S.enemies){ ctx.fillStyle='#ff5a67'; ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,Math.PI*2); ctx.fill(); }
    drawBird(S.p.x,S.p.y);
    for(const p of S.parts){ ctx.globalAlpha=Math.max(0,p.t/28); ctx.fillStyle=p.c; ctx.fillRect(p.x,p.y,3,3); ctx.globalAlpha=1; }

    updateHud();
    requestAnimationFrame(tick);
  }

  updateHud();
  requestAnimationFrame(tick);
})();