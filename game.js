(() => {
  const c = document.getElementById('game');
  const x = c.getContext('2d');
  const W = c.width, H = c.height;
  const ui = {
    state: document.getElementById('state'), score: document.getElementById('score'),
    combo: document.getElementById('combo'), hp: document.getElementById('hp'),
    bird: document.getElementById('bird'), menu: document.getElementById('menu')
  };

  const keys = {}, touch = {left:false,right:false,boost:false,fire:false};
  const S = {
    run:false,t:0,score:0,combo:1,comboTick:0,hp:5,bird:'jay',
    player:null, bullets:[], enemies:[], particles:[], stars:[], bgClouds:[],
    fireCd:0,spawnCd:0,boss:null,bossTimer:0
  };

  for (let i=0;i<190;i++) S.stars.push({x:Math.random()*W,y:Math.random()*H,s:Math.random()*2+1,v:.3+Math.random()*1.1});
  for (let i=0;i<8;i++) S.bgClouds.push({x:Math.random()*W,y:50+Math.random()*280,w:120+Math.random()*140,v:.2+Math.random()*.5});

  function reset() {
    S.run = true; S.t = 0; S.score = 0; S.combo = 1; S.comboTick=0; S.hp = 5;
    S.bird = ui.bird.value;
    S.player = {x:180,y:350,vx:0,vy:0,dir:1,boost:0};
    S.bullets = []; S.enemies = []; S.particles=[]; S.fireCd=0; S.spawnCd=60; S.boss=null; S.bossTimer=1800;
    ui.menu.classList.add('hidden'); updateHud(); beep(440,.04,.03);
  }

  function updateHud(){
    ui.state.textContent = S.run ? 'In Run' : 'Ready';
    ui.score.textContent = 'Score: ' + Math.floor(S.score);
    ui.combo.textContent = 'Combo: x' + S.combo;
    ui.hp.textContent = 'HP: ' + S.hp;
  }

  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function rnd(a,b){ return Math.random()*(b-a)+a; }
  function hit(a,b,r){ const dx=a.x-b.x,dy=a.y-b.y; return dx*dx+dy*dy <= r*r; }

  // tiny synth SFX
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  function beep(freq=.0, dur=.05, gain=.03){
    try {
      const o=ac.createOscillator(), g=ac.createGain();
      o.type='square'; o.frequency.value=freq||440; g.gain.value=gain;
      o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+dur);
    } catch(_){}
  }

  function drawBird(p, enemy=false){
    const jay = !enemy && S.bird==='jay';
    const base = enemy? '#ff5a67' : (jay ? '#49a4ff' : '#ff5a67');
    const dark = enemy? '#8e2934' : (jay ? '#2f6fc0' : '#b93d47');

    x.save(); x.translate(p.x,p.y); x.scale(p.dir||1,1);
    x.fillStyle = dark; x.beginPath(); x.moveTo(-22,-4); x.lineTo(-40,-12); x.lineTo(-35,-2); x.lineTo(-40,8); x.closePath(); x.fill();
    x.fillStyle = base; x.beginPath(); x.ellipse(-2,0,24,15,0,0,Math.PI*2); x.fill();
    x.fillStyle = 'rgba(240,248,255,.92)'; x.beginPath(); x.ellipse(3,4,10,7,0,0,Math.PI*2); x.fill();
    x.fillStyle = dark; x.beginPath(); x.ellipse(-7,2,12,7,-.35,0,Math.PI*2); x.fill();
    x.fillStyle = base; x.beginPath(); if (jay){x.moveTo(0,-16);x.lineTo(6,-26);x.lineTo(11,-14);} else {x.moveTo(2,-14);x.lineTo(8,-21);x.lineTo(12,-12);} x.closePath(); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(14,-8.5,3.2,0,Math.PI*2); x.fill();
    x.fillStyle = '#111'; x.beginPath(); x.arc(14.6,-8.5,1.2,0,Math.PI*2); x.fill();
    x.fillStyle = '#ffd166'; x.beginPath(); x.moveTo(20,-7); x.lineTo(34,-4); x.lineTo(20,0); x.closePath(); x.fill();
    x.restore();
  }

  function spawnEnemy(){
    const lane = [190,260,330,400,470][(Math.random()*5)|0];
    const typeRoll = Math.random();
    if (typeRoll < .75) {
      S.enemies.push({type:'grunt',x:W+40,y:lane,vx:rnd(2.4,4.2),hp:2,dir:-1,r:18,shootCd:rnd(40,90)});
    } else {
      S.enemies.push({type:'drone',x:W+50,y:lane+rnd(-40,40),vx:rnd(3.8,5.2),hp:1,dir:-1,r:14,shootCd:9999});
    }
  }

  function spawnBoss(){
    S.boss = {x:W+180,y:300,vx:1.2,hp:120,phase:0,shot:0};
    beep(120,.12,.05);
  }

  function fire(){
    if (S.fireCd>0 || !S.run) return;
    S.fireCd = 6;
    S.bullets.push({x:S.player.x+26,y:S.player.y-6,vx:10,vy:0,team:'p',r:4});
    beep(760,.03,.02);
  }

  function burst(px,py,color='#ffd166'){
    for(let i=0;i<12;i++) S.particles.push({x:px,y:py,vx:rnd(-2.8,2.8),vy:rnd(-2.8,2.8),t:rnd(16,28),c:color});
  }

  function damage(n=1){
    if (!S.run) return;
    S.hp -= n; burst(S.player.x,S.player.y,'#ff6b7a'); beep(180,.06,.04);
    if (S.hp<=0){ S.run=false; ui.menu.classList.remove('hidden'); ui.state.textContent='Down'; }
    updateHud();
  }

  function update(){
    if (!S.run) return;
    S.t++;

    const L = keys.a || keys.ArrowLeft || touch.left;
    const R = keys.d || keys.ArrowRight || touch.right;
    const B = keys.w || keys.ArrowUp || touch.boost;
    const F = keys.j || keys[' '] || touch.fire;

    S.player.vx = ((R?1:0)-(L?1:0)) * (B?5.2:3.6);
    S.player.vy = Math.sin(S.t*0.15) * 0.35;
    S.player.x = clamp(S.player.x + S.player.vx, 60, W-160);
    S.player.y = clamp(S.player.y + S.player.vy + (B?-1.0:0), 120, H-80);
    if (S.player.vx!==0) S.player.dir = S.player.vx>0?1:-1;

    if (F) fire();
    if (S.fireCd>0) S.fireCd--;

    if (S.spawnCd--<=0 && !S.boss){ spawnEnemy(); S.spawnCd = rnd(20,48); }
    if (S.bossTimer--<=0 && !S.boss) spawnBoss();

    // enemy update
    for (const e of S.enemies){
      e.x -= e.vx;
      if (e.type==='grunt') e.y += Math.sin((S.t+e.x)*0.04)*0.8;
      if (--e.shootCd<=0 && e.type==='grunt'){
        S.bullets.push({x:e.x-20,y:e.y-6,vx:-6.2,vy:rnd(-.5,.5),team:'e',r:3});
        e.shootCd = rnd(45,95);
      }
      if (e.x < -80) e.dead=true;
    }

    // boss update
    if (S.boss){
      const b=S.boss; b.x -= b.vx;
      if (b.x>W-220) b.x-=1.2;
      b.y = 300 + Math.sin(S.t*0.03)*120;
      if (++b.shot%24===0){
        const ang=Math.atan2(S.player.y-b.y,S.player.x-b.x);
        S.bullets.push({x:b.x-30,y:b.y,vx:Math.cos(ang)*-5.4,vy:Math.sin(ang)*5.4,team:'e',r:4});
      }
      if (b.hp<=0){
        S.score += 5000; burst(b.x,b.y,'#8ef9ff'); S.boss=null; S.bossTimer=2200; S.combo=Math.min(9,S.combo+1); updateHud();
      }
    }

    // bullets
    for(const b of S.bullets){ b.x += b.vx; b.y += b.vy; if (b.x<-100||b.x>W+100||b.y<-50||b.y>H+50) b.dead=true; }

    // collisions
    for(const b of S.bullets){
      if (b.dead) continue;
      if (b.team==='p'){
        for(const e of S.enemies){ if (!e.dead && hit(b,e,e.r+4)){ b.dead=true; e.hp--; if(e.hp<=0){e.dead=true; S.score += 100*S.combo; S.comboTick=120; burst(e.x,e.y); beep(320,.03,.03);} } }
        if (S.boss && hit(b,S.boss,80)){ b.dead=true; S.boss.hp--; if(S.boss.hp%10===0) beep(220,.02,.02); }
      } else {
        if (hit(b,S.player,20)){ b.dead=true; damage(1); }
      }
    }

    for(const e of S.enemies){ if(!e.dead && hit(e,S.player,26)){ e.dead=true; damage(1); } }

    S.enemies = S.enemies.filter(e=>!e.dead);
    S.bullets = S.bullets.filter(b=>!b.dead);

    for(const p of S.particles){ p.x+=p.vx; p.y+=p.vy; p.t--; }
    S.particles = S.particles.filter(p=>p.t>0);

    if (S.comboTick>0) S.comboTick--; else S.combo=1;
    S.score += 0.2; // survival score drip
    updateHud();
  }

  function draw(){
    const g=x.createLinearGradient(0,0,0,H); g.addColorStop(0,'#152a52'); g.addColorStop(.58,'#0b1730'); g.addColorStop(1,'#07101f'); x.fillStyle=g; x.fillRect(0,0,W,H);
    x.fillStyle='rgba(255,255,255,.24)'; x.font='600 16px system-ui'; x.fillText('Featherforce active',16,24);

    for(const s of S.stars){ s.x-=s.v; if(s.x<0)s.x=W; x.fillStyle='rgba(255,255,255,.8)'; x.fillRect(s.x,s.y,s.s,s.s); }
    for(const cl of S.bgClouds){ cl.x-=cl.v; if(cl.x<-cl.w) cl.x=W+40; x.fillStyle='rgba(180,210,255,.08)'; x.beginPath(); x.ellipse(cl.x,cl.y,cl.w,38,0,0,Math.PI*2); x.fill(); }

    x.fillStyle='#15305d'; x.fillRect(0,H-120,W,120); x.fillStyle='#2a4a85'; x.fillRect(0,H-124,W,10);

    for(const b of S.bullets){ x.fillStyle=b.team==='p'?'#ffd166':'#ff86a0'; x.fillRect(b.x-4,b.y-2,8,4); }
    for(const e of S.enemies) drawBird(e,true);
    if (S.boss){ x.fillStyle='#7c3aed'; x.beginPath(); x.ellipse(S.boss.x,S.boss.y,82,54,0,0,Math.PI*2); x.fill(); x.fillStyle='#f5d0ff'; x.fillRect(S.boss.x-32,S.boss.y-8,64,8); x.fillStyle='#111'; x.fillRect(S.boss.x-60,40,120,8); x.fillStyle='#ff4d6d'; x.fillRect(S.boss.x-60,40,(S.boss.hp/120)*120,8); }
    drawBird(S.player,false);

    for(const p of S.particles){ x.fillStyle=p.c; x.globalAlpha=Math.max(0,p.t/28); x.fillRect(p.x,p.y,3,3); x.globalAlpha=1; }

    if(!S.run){ x.fillStyle='rgba(0,0,0,.6)'; x.fillRect(0,0,W,H); x.fillStyle='#fff'; x.font='700 56px system-ui'; x.fillText('RUN OVER',W/2-150,H/2); x.font='500 22px system-ui'; x.fillText('Tap Start Run to go again',W/2-110,H/2+40); }
  }

  function loop(){ update(); draw(); requestAnimationFrame(loop); }

  window.addEventListener('keydown',e=>keys[e.key]=true);
  window.addEventListener('keyup',e=>keys[e.key]=false);

  function bind(id,key){
    const el=document.getElementById(id);
    const on=e=>{touch[key]=true;e.preventDefault();};
    const off=e=>{touch[key]=false;e.preventDefault();};
    el.addEventListener('touchstart',on,{passive:false}); el.addEventListener('touchend',off,{passive:false});
    el.addEventListener('mousedown',()=>touch[key]=true); window.addEventListener('mouseup',()=>touch[key]=false);
  }
  bind('left','left'); bind('right','right'); bind('boost','boost'); bind('fire','fire');

  function startRun(){
    reset();
  }

  document.getElementById('startBtn').addEventListener('click',startRun);
  document.getElementById('playNow').addEventListener('click',startRun);

  reset();
  loop();
})();