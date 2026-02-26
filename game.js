(() => {
  const hud = {
    hp: document.getElementById('hp'), lvl: document.getElementById('lvl'), xp: document.getElementById('xp'),
    time: document.getElementById('time'), kills: document.getElementById('kills')
  };
  const levelUpEl = document.getElementById('levelup');
  const optsEl = document.getElementById('opts');

  const touch = { active:false, x:0, y:0, dash:false };
  const joy = document.getElementById('joy');
  const stick = document.getElementById('stick');
  const dashBtn = document.getElementById('dash');

  let joyCenter = {x:0,y:0};
  function setJoyCenter(){ const r=joy.getBoundingClientRect(); joyCenter={x:r.left+r.width/2,y:r.top+r.height/2}; }
  setJoyCenter(); window.addEventListener('resize', setJoyCenter);
  joy.addEventListener('touchstart',e=>{touch.active=true; handleJoy(e.touches[0]); e.preventDefault();},{passive:false});
  joy.addEventListener('touchmove',e=>{handleJoy(e.touches[0]); e.preventDefault();},{passive:false});
  joy.addEventListener('touchend',e=>{touch.active=false;touch.x=0;touch.y=0;stick.style.left='45px';stick.style.top='45px'; e.preventDefault();},{passive:false});
  dashBtn.addEventListener('touchstart',e=>{touch.dash=true; e.preventDefault();},{passive:false});
  dashBtn.addEventListener('touchend',e=>{touch.dash=false; e.preventDefault();},{passive:false});
  function handleJoy(t){
    const dx=t.clientX-joyCenter.x, dy=t.clientY-joyCenter.y; const r=42;
    const d=Math.hypot(dx,dy)||1, nx=dx/d, ny=dy/d, mag=Math.min(d,r);
    touch.x=nx*(mag/r); touch.y=ny*(mag/r);
    stick.style.left=(45+nx*mag)+'px'; stick.style.top=(45+ny*mag)+'px';
  }

  class Main extends Phaser.Scene {
    constructor(){ super('main'); }
    preload(){}
    create(){
      this.worldSize = 3600;
      this.physics.world.setBounds(-this.worldSize/2,-this.worldSize/2,this.worldSize,this.worldSize);
      this.cameras.main.setBackgroundColor('#070d1d');

      // subtle stars
      this.stars = this.add.group();
      for(let i=0;i<500;i++){
        const s=this.add.rectangle(Phaser.Math.Between(-1800,1800),Phaser.Math.Between(-1800,1800),Phaser.Math.Between(1,2),Phaser.Math.Between(1,2),0xffffff,0.6);
        this.stars.add(s);
      }

      this.player = this.physics.add.sprite(0,0,null).setCircle(16).setCollideWorldBounds(true);
      this.playerSpeed = 230;
      this.playerDashCd = 0;
      this.playerDamage = 16;
      this.fireRate = 350;
      this.bulletSpeed = 430;
      this.maxHp = 100;
      this.hp = 100;

      this.kills=0; this.level=1; this.xp=0; this.xpNeed=10;
      this.elapsed=0;
      this.pausedForLevel=false;

      this.enemies = this.physics.add.group();
      this.bullets = this.physics.add.group();
      this.gems = this.physics.add.group();

      this.physics.add.overlap(this.bullets,this.enemies,(b,e)=>{
        e.hp -= this.playerDamage;
        b.destroy();
        if(e.hp<=0){
          const g=this.physics.add.sprite(e.x,e.y,null).setCircle(5);
          g.value = 1;
          this.gems.add(g);
          e.destroy();
          this.kills++;
        }
      });

      this.physics.add.overlap(this.player,this.enemies,()=>{
        if(this.iframes>0) return;
        this.hp = Math.max(0,this.hp-12);
        this.iframes = 400;
        this.player.setTint(0xff7a8a);
        this.time.delayedCall(180,()=>this.player.clearTint());
        if(this.hp<=0) this.gameOver();
      });

      this.physics.add.overlap(this.player,this.gems,(p,g)=>{
        this.xp += g.value;
        g.destroy();
        if(this.xp >= this.xpNeed) this.levelUp();
      });

      this.cameras.main.startFollow(this.player,true,0.08,0.08);

      this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT');

      this.time.addEvent({delay:650,loop:true,callback:()=>this.spawnEnemy()});
      this.time.addEvent({delay:this.fireRate,loop:true,callback:()=>this.autoFire()});

      this.iframes=0;
      this.updateHud();
    }

    drawPlayer(){
      if(this.playerGraphic) this.playerGraphic.destroy();
      const g=this.add.graphics();
      g.x=this.player.x; g.y=this.player.y;
      // bluejay commando
      g.fillStyle(0x2f6fc0,1); g.fillTriangle(-18,-4,-31,-11,-28,7);
      g.fillStyle(0x49a4ff,1); g.fillEllipse(-2,0,38,24);
      g.fillStyle(0xeaf3ff,1); g.fillEllipse(2,4,14,9);
      g.fillStyle(0x1e4e8d,1); g.fillEllipse(-6,2,16,10);
      g.fillStyle(0x49a4ff,1); g.fillTriangle(0,-14,5,-22,10,-13);
      g.fillStyle(0xffffff,1); g.fillCircle(10,-7,3);
      g.fillStyle(0x111111,1); g.fillCircle(10.6,-7,1.2);
      g.fillStyle(0xffd166,1); g.fillTriangle(16,-6,28,-3,16,0);
      this.playerGraphic = g;
    }

    spawnEnemy(){
      if(this.pausedForLevel) return;
      const ang = Phaser.Math.FloatBetween(0, Math.PI*2);
      const dist = Phaser.Math.Between(520, 760);
      const ex = this.player.x + Math.cos(ang)*dist;
      const ey = this.player.y + Math.sin(ang)*dist;
      const e = this.physics.add.sprite(ex,ey,null).setCircle(14);
      e.hp = 28 + this.level*4;
      e.speed = 58 + this.level*2 + Phaser.Math.Between(0,28);
      this.enemies.add(e);
    }

    autoFire(){
      if(this.pausedForLevel) return;
      const nearest = this.getNearestEnemy();
      if(!nearest) return;
      const dx = nearest.x - this.player.x, dy = nearest.y - this.player.y;
      const ang = Math.atan2(dy,dx);
      const b = this.physics.add.sprite(this.player.x,this.player.y,null).setCircle(4);
      b.setVelocity(Math.cos(ang)*this.bulletSpeed, Math.sin(ang)*this.bulletSpeed);
      b.lifespan = 1200;
      this.bullets.add(b);
      this.time.delayedCall(1200,()=>b.active && b.destroy());
    }

    getNearestEnemy(){
      let best=null, bd=1e12;
      this.enemies.children.iterate(e=>{
        if(!e) return;
        const d=(e.x-this.player.x)**2 + (e.y-this.player.y)**2;
        if(d<bd){bd=d;best=e;}
      });
      return best;
    }

    levelUp(){
      this.level++;
      this.xp -= this.xpNeed;
      this.xpNeed = Math.floor(this.xpNeed*1.32 + 6);
      this.pausedForLevel = true;
      this.physics.world.pause();
      this.showChoices();
      this.updateHud();
    }

    showChoices(){
      const all = [
        {n:'+Fire Rate', d:'Shoot 18% faster', fn:()=>{this.fireRate=Math.max(90, Math.floor(this.fireRate*0.82)); this.time.removeAllEvents(); this.time.addEvent({delay:650,loop:true,callback:()=>this.spawnEnemy()}); this.time.addEvent({delay:this.fireRate,loop:true,callback:()=>this.autoFire()});}},
        {n:'+Damage', d:'Bullets hit harder', fn:()=>{this.playerDamage+=8;}},
        {n:'+Move Speed', d:'Faster movement', fn:()=>{this.playerSpeed+=28;}},
        {n:'+Max HP', d:'Heal and increase max HP', fn:()=>{this.maxHp+=20; this.hp=Math.min(this.maxHp, this.hp+24);}},
        {n:'+Bullet Speed', d:'Easier kiting', fn:()=>{this.bulletSpeed+=80;}},
        {n:'Magnet', d:'XP gems pull from farther', fn:()=>{this.magnet=(this.magnet||100)+70;}}
      ];
      const picks = Phaser.Utils.Array.Shuffle(all).slice(0,3);
      optsEl.innerHTML='';
      picks.forEach(ch=>{
        const div=document.createElement('div');
        div.className='opt';
        div.innerHTML=`<b>${ch.n}</b><div style="opacity:.86;margin-top:4px">${ch.d}</div>`;
        div.onclick=()=>{
          ch.fn();
          levelUpEl.style.display='none';
          this.physics.world.resume();
          this.pausedForLevel=false;
        };
        optsEl.appendChild(div);
      });
      levelUpEl.style.display='grid';
    }

    gameOver(){
      this.pausedForLevel=true;
      this.physics.world.pause();
      levelUpEl.style.display='grid';
      optsEl.innerHTML = `<div class="opt" style="cursor:default"><b>Run Over</b><div style="margin-top:6px">Time: ${Math.floor(this.elapsed)}s · Kills: ${this.kills} · Score: ${Math.floor(this.elapsed*12 + this.kills*25)}</div></div><div class="opt" id="again"><b>Play Again</b><div>Restart run</div></div>`;
      document.getElementById('again').onclick=()=>location.reload();
    }

    updateHud(){
      hud.hp.textContent=`HP: ${Math.max(0,Math.floor(this.hp))}`;
      hud.lvl.textContent=`Level: ${this.level}`;
      hud.xp.textContent=`XP: ${this.xp}/${this.xpNeed}`;
      hud.kills.textContent=`Kills: ${this.kills}`;
    }

    update(time,dt){
      const dts = dt/1000;
      if(!this.pausedForLevel) this.elapsed += dts;
      hud.time.textContent = `Time: ${Math.floor(this.elapsed)}s`;

      // movement
      const left = this.keys.A.isDown || this.keys.LEFT.isDown || (touch.active && touch.x<-0.15);
      const right= this.keys.D.isDown || this.keys.RIGHT.isDown || (touch.active && touch.x>0.15);
      const up   = this.keys.W.isDown || this.keys.UP.isDown || (touch.active && touch.y<-0.15);
      const down = this.keys.S.isDown || this.keys.DOWN.isDown || (touch.active && touch.y>0.15);

      let mx=(right?1:0)-(left?1:0), my=(down?1:0)-(up?1:0);
      const mag=Math.hypot(mx,my)||1; mx/=mag; my/=mag;
      this.player.setVelocity(mx*this.playerSpeed,my*this.playerSpeed);

      // dash
      this.playerDashCd -= dt;
      if((Phaser.Input.Keyboard.JustDown(this.keys.SHIFT) || touch.dash) && this.playerDashCd<=0){
        this.playerDashCd=1700;
        const vx = (mx||1)*620, vy=(my||0)*620;
        this.player.setVelocity(vx,vy);
      }

      // enemies chase
      this.enemies.children.iterate(e=>{
        if(!e) return;
        const dx=this.player.x-e.x, dy=this.player.y-e.y; const m=Math.hypot(dx,dy)||1;
        e.setVelocity(dx/m*e.speed, dy/m*e.speed);
      });

      // magnet
      const mr = this.magnet||100;
      this.gems.children.iterate(g=>{
        if(!g) return;
        const dx=this.player.x-g.x, dy=this.player.y-g.y; const d=Math.hypot(dx,dy)||1;
        if(d<mr){ g.setVelocity(dx/d*180, dy/d*180); }
      });

      // i-frames decay
      if(this.iframes>0){ this.iframes -= dt; }

      this.drawPlayer();
      this.updateHud();
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 1280,
    height: 720,
    backgroundColor: '#071024',
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
    scene: [Main],
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
  });
})();