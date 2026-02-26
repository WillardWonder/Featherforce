(() => {
  const c=document.getElementById('game'),x=c.getContext('2d');
  const W=c.width,H=c.height;
  const ui={status:Q('status'),score:Q('score'),heat:Q('heat'),cargo:Q('cargo'),bird:Q('bird')};
  const keys={},touch={l:false,r:false,a:false,b:false};
  const lanes=[170,260,350,440];
  const cargoTypes=['Meteor Noodles','Quantum Seeds','Neon Soup','Boss Biscuit'];
  const S={run:false,t:0,lane:1,x:220,score:0,heat:0,cargo:'None',combo:0,bg:[],stars:[],obs:[],pickups:[],msg:'',msgT:0,bird:'jay'};

  for(let i=0;i<140;i++)S.stars.push({x:Math.random()*W,y:Math.random()*H,s:Math.random()*2+1,v:.3+Math.random()*1.4});
  for(let i=0;i<12;i++)S.bg.push({x:Math.random()*W,y:80+Math.random()*360,w:80+Math.random()*220,v:.2+Math.random()*.8});

  function Q(id){return document.getElementById(id)}
  function rnd(a,b){return Math.random()*(b-a)+a}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  function beep(f=440,d=.03,g=.02){try{const ac=beep.ac||(beep.ac=new (window.AudioContext||window.webkitAudioContext)());const o=ac.createOscillator(),ga=ac.createGain();o.type='triangle';o.frequency.value=f;ga.gain.value=g;o.connect(ga);ga.connect(ac.destination);o.start();o.stop(ac.currentTime+d);}catch(e){}}

  function start(){
    S.run=true;S.t=0;S.lane=1;S.score=0;S.heat=0;S.cargo='None';S.combo=0;S.obs=[];S.pickups=[];S.msg='';S.msgT=0;S.bird=ui.bird.value;
    ui.status.textContent='Running';sync();beep(520,.06,.03);
  }

  function sync(){ui.score.textContent='Rep: '+Math.floor(S.score);ui.heat.textContent='Heat: '+Math.floor(S.heat)+'%';ui.cargo.textContent='Cargo: '+S.cargo;}
  function say(m,t=120){S.msg=m;S.msgT=t}

  function spawn(){
    const r=Math.random();
    if(r<.55){ // hazard
      S.obs.push({x:W+40,lane:(Math.random()*4)|0,type:Math.random()<.5?'drone':'fork',v:rnd(4.8,7.2)});
    } else if(r<.88){
      S.pickups.push({x:W+40,lane:(Math.random()*4)|0,type:'cargo',name:cargoTypes[(Math.random()*cargoTypes.length)|0],v:rnd(4.2,6.5)});
    } else {
      S.pickups.push({x:W+40,lane:(Math.random()*4)|0,type:'coolant',name:'Coolant Can',v:rnd(5,6.8)});
    }
  }

  function playerY(){return lanes[S.lane]}

  function drawBird(){
    const y=playerY(),c1=S.bird==='jay'?'#49a4ff':'#ff5a67',c2=S.bird==='jay'?'#2f6fc0':'#b93d47';
    x.save();x.translate(S.x,y);
    x.fillStyle=c2;x.beginPath();x.moveTo(-20,-4);x.lineTo(-36,-12);x.lineTo(-32,-2);x.lineTo(-36,8);x.closePath();x.fill();
    x.fillStyle=c1;x.beginPath();x.ellipse(-2,0,22,14,0,0,Math.PI*2);x.fill();
    x.fillStyle='rgba(255,255,255,.9)';x.beginPath();x.ellipse(2,4,9,6,0,0,Math.PI*2);x.fill();
    x.fillStyle='#ffd166';x.beginPath();x.moveTo(18,-6);x.lineTo(32,-3);x.lineTo(18,1);x.closePath();x.fill();
    x.fillStyle='#fff';x.beginPath();x.arc(12,-8,3,0,Math.PI*2);x.fill();x.fillStyle='#111';x.beginPath();x.arc(12.6,-8,1.1,0,Math.PI*2);x.fill();
    x.restore();
  }

  function update(){
    if(!S.run) return;
    S.t++;
    if(S.t%24===0) spawn();

    const L=keys.ArrowLeft||keys.a||touch.l;
    const R=keys.ArrowRight||keys.d||touch.r;
    const A=(keys.j||keys[' ']||touch.a);
    const B=(keys.k||keys.w||touch.b);

    if(L&&S.lane>0){S.lane--;touch.l=false;beep(330,.02,.02)}
    if(R&&S.lane<3){S.lane++;touch.r=false;beep(350,.02,.02)}

    for(const o of S.obs) o.x-=o.v;
    for(const p of S.pickups) p.x-=p.v;

    // collisions
    for(const o of S.obs){
      if(Math.abs(o.x-S.x)<28 && o.lane===S.lane){
        o.hit=true; S.heat=clamp(S.heat+18,0,100); S.combo=0; say('HIT! Kitchen stability dropping',90); beep(140,.08,.04);
      }
    }
    for(const p of S.pickups){
      if(Math.abs(p.x-S.x)<28 && p.lane===S.lane){
        p.take=true;
        if(p.type==='cargo'){S.cargo=p.name; S.score+=30; S.combo++; say('Cargo acquired: '+p.name,80); beep(640,.03,.03)}
        else {S.heat=clamp(S.heat-20,0,100); S.score+=10; say('Cooling system stabilized',70); beep(510,.03,.03)}
      }
    }

    // actions
    if(A){touch.a=false; if(S.cargo!=='None'){S.score += 90 + S.combo*20; say('Served '+S.cargo+' successfully!',70); S.cargo='None'; S.combo++; beep(760,.04,.03);} else {say('No cargo to serve',45);} }
    if(B){touch.b=false; S.score += 8; S.heat=clamp(S.heat+4,0,100); say('JAM mode: speed at cost of heat',35); }

    // difficulty + decay
    S.score += 0.4 + S.combo*0.03;
    S.heat = clamp(S.heat + 0.04 + Math.max(0,S.combo-2)*0.02, 0, 100);

    S.obs=S.obs.filter(o=>o.x>-60&&!o.hit);
    S.pickups=S.pickups.filter(p=>p.x>-60&&!p.take);

    if(S.msgT>0) S.msgT--; else S.msg='';
    if(S.heat>=100){S.run=false; ui.status.textContent='Meltdown'; say('VOID OVEN MELTDOWN — run ended',999); beep(90,.2,.05)}

    sync();
  }

  function draw(){
    const g=x.createLinearGradient(0,0,0,H); g.addColorStop(0,'#152a52'); g.addColorStop(.6,'#0b1730'); g.addColorStop(1,'#070f1f'); x.fillStyle=g; x.fillRect(0,0,W,H);
    for(const s of S.stars){s.x-=s.v; if(s.x<0)s.x=W; x.fillStyle='rgba(255,255,255,.75)'; x.fillRect(s.x,s.y,s.s,s.s)}
    for(const b of S.bg){b.x-=b.v; if(b.x<-b.w)b.x=W+30; x.fillStyle='rgba(161,196,255,.08)'; x.beginPath(); x.ellipse(b.x,b.y,b.w,28,0,0,Math.PI*2); x.fill();}

    // lanes
    for(let i=0;i<lanes.length;i++){x.strokeStyle='rgba(120,160,240,.25)';x.lineWidth=2;x.beginPath();x.moveTo(80,lanes[i]+20);x.lineTo(W-40,lanes[i]+20);x.stroke();}

    // entities
    for(const o of S.obs){
      const y=lanes[o.lane];
      if(o.type==='drone'){x.fillStyle='#8b5cf6';x.beginPath();x.arc(o.x,y,18,0,Math.PI*2);x.fill();x.fillStyle='#d8b4fe';x.fillRect(o.x-7,y-2,14,4);} 
      else {x.fillStyle='#ef4444';x.fillRect(o.x-14,y-12,28,24);x.fillStyle='#fff';x.fillRect(o.x-2,y-12,4,24);} 
    }
    for(const p of S.pickups){
      const y=lanes[p.lane];
      if(p.type==='cargo'){x.fillStyle='#22c55e';x.fillRect(p.x-12,y-12,24,24);x.fillStyle='#dcfce7';x.fillRect(p.x-6,y-2,12,4);} else {x.fillStyle='#38bdf8';x.beginPath();x.arc(p.x,y,12,0,Math.PI*2);x.fill();}
    }

    drawBird();

    // message bar
    if(S.msg){x.fillStyle='rgba(0,0,0,.45)';x.fillRect(130,24,W-260,40);x.fillStyle='#fff';x.font='600 18px system-ui';x.fillText(S.msg,150,50)}

    if(!S.run){
      x.fillStyle='rgba(0,0,0,.6)';x.fillRect(0,0,W,H);
      x.fillStyle='#fff';x.font='800 50px system-ui';x.fillText(S.heat>=100?'MELTDOWN':'VOID KITCHEN PROTOCOL',W/2-250,H/2-20);
      x.font='600 24px system-ui';x.fillText('Tap Start Run to redeploy',W/2-150,H/2+24);
    }
  }

  function loop(){ update(); draw(); requestAnimationFrame(loop); }
  document.getElementById('start').addEventListener('click',start);
  window.addEventListener('keydown',e=>keys[e.key]=true);
  window.addEventListener('keyup',e=>keys[e.key]=false);

  function bind(id,k){const el=Q(id);const on=e=>{touch[k]=true;e.preventDefault();};const off=e=>{touch[k]=false;e.preventDefault();};el.addEventListener('touchstart',on,{passive:false});el.addEventListener('touchend',off,{passive:false});el.addEventListener('mousedown',()=>touch[k]=true);window.addEventListener('mouseup',()=>touch[k]=false);}
  bind('l','l'); bind('r','r'); bind('a','a'); bind('b','b');

  start();
  loop();
})();