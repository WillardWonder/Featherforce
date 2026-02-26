const touch={left:false,right:false,jump:false,fire:false};
['left','right','jump','fire'].forEach(id=>{const el=document.getElementById(id);const k=id;el.addEventListener('touchstart',e=>{touch[k]=true;e.preventDefault()},{passive:false});el.addEventListener('touchend',e=>{touch[k]=false;e.preventDefault()},{passive:false});el.addEventListener('mousedown',()=>touch[k]=true);el.addEventListener('mouseup',()=>touch[k]=false);});

class MainScene extends Phaser.Scene{
  constructor(){super('main');}
  create(){
    this.score=0; this.lives=3; this.canShoot=true;
    this.cameras.main.setBackgroundColor('#061022');

    // parallax bands
    this.bg1=this.add.tileSprite(0,0,2200,900,null).setOrigin(0).setTint(0x13284a).setAlpha(.9);
    this.bg2=this.add.tileSprite(0,280,2200,620,null).setOrigin(0).setTint(0x0d1d39).setAlpha(.95);

    this.ground=this.physics.add.staticGroup();
    const g=this.add.rectangle(1100,700,2200,220,0x1b2f58).setOrigin(.5);
    this.physics.add.existing(g,true); this.ground.add(g);

    // player bird commando (placeholder sprite art via graphics)
    this.player=this.physics.add.sprite(180,560,null).setSize(44,34).setOffset(0,0);
    this.player.body.setCollideWorldBounds(true);
    this.playerSpeed=240; this.jumpV=470;
    this.physics.add.collider(this.player,this.ground);

    // groups
    this.bullets=this.physics.add.group({classType:Phaser.Physics.Arcade.Image,maxSize:60,runChildUpdate:true});
    this.enemies=this.physics.add.group();

    this.physics.add.overlap(this.bullets,this.enemies,(b,e)=>{b.destroy();e.hp=(e.hp||2)-1;if(e.hp<=0){this.score+=100;this.updateHud();e.destroy();}},null,this);
    this.physics.add.overlap(this.player,this.enemies,()=>{if(this.invuln)return; this.lives--; this.updateHud(); this.invuln=true; this.player.setTint(0xff8888); this.time.delayedCall(900,()=>{this.invuln=false; this.player.clearTint();}); if(this.lives<=0){this.scene.restart();}},null,this);

    this.cursors=this.input.keyboard.createCursorKeys();
    this.keys=this.input.keyboard.addKeys('A,D,W,J,SPACE');

    this.physics.world.setBounds(0,0,999999,900);
    this.cameras.main.startFollow(this.player,true,.08,.08);
    this.cameras.main.setDeadzone(220,120);

    this.time.addEvent({delay:1200,loop:true,callback:()=>this.spawnEnemy()});
    this.updateHud();
  }

  updateHud(){document.getElementById('score').textContent='Score: '+this.score;document.getElementById('lives').textContent='Lives: '+this.lives;}

  spawnEnemy(){
    const ex=this.player.x+900+Math.random()*280;
    const ey=560;
    const e=this.physics.add.sprite(ex,ey,null).setSize(40,30);
    e.hp=2; e.vx=-120-(Math.random()*40); e.setCollideWorldBounds(false);
    this.physics.add.collider(e,this.ground);
    this.enemies.add(e);
  }

  fire(){
    if(!this.canShoot) return;
    this.canShoot=false;
    const b=this.physics.add.image(this.player.x+26,this.player.y-8,null).setSize(12,4);
    b.body.allowGravity=false; b.setVelocityX(520);
    this.bullets.add(b);
    this.time.delayedCall(140,()=>this.canShoot=true);
  }

  drawBird(x,y,isPlayer=true){
    const g=this.add.graphics();
    const c=0x49a4ff;
    g.fillStyle(c,1); g.fillEllipse(x,y,48,30);
    g.fillStyle(0x2f6fc0,1); g.fillTriangle(x-22,y-4,x-40,y-12,x-36,y+8);
    g.fillStyle(0xffd166,1); g.fillTriangle(x+20,y-7,x+35,y-4,x+20,y);
    g.fillStyle(0xffffff,1); g.fillCircle(x+12,y-9,4);
    g.fillStyle(0x111111,1); g.fillCircle(x+13,y-9,1.4);
    if(!isPlayer) g.tint=0xff5a67;
    this.time.delayedCall(16,()=>g.destroy());
  }

  preUpdate(){ }

  update(){
    // move
    const L=this.cursors.left.isDown||this.keys.A.isDown||touch.left;
    const R=this.cursors.right.isDown||this.keys.D.isDown||touch.right;
    const J=Phaser.Input.Keyboard.JustDown(this.cursors.up)||Phaser.Input.Keyboard.JustDown(this.keys.W)||touch.jump;
    const F=Phaser.Input.Keyboard.JustDown(this.keys.J)||Phaser.Input.Keyboard.JustDown(this.keys.SPACE)||touch.fire;

    if(L){this.player.setVelocityX(-this.playerSpeed); this.player.flipX=true;}
    else if(R){this.player.setVelocityX(this.playerSpeed); this.player.flipX=false;}
    else this.player.setVelocityX(0);

    if(J && this.player.body.blocked.down){this.player.setVelocityY(-this.jumpV);}    
    if(F) this.fire();

    // enemy AI
    this.enemies.children.iterate(e=>{if(!e) return; e.setVelocityX(e.vx); if(e.x<this.player.x-900) e.destroy();});
    this.bullets.children.iterate(b=>{if(!b) return; if(b.x>this.player.x+1200) b.destroy();});

    // parallax
    this.bg1.tilePositionX=this.cameras.main.scrollX*0.18;
    this.bg2.tilePositionX=this.cameras.main.scrollX*0.35;

    // sprite draw pass
    this.drawBird(this.player.x,this.player.y,true);
    this.enemies.children.iterate(e=>{if(!e)return; const g=this.add.graphics(); g.fillStyle(0xff5a67,1); g.fillEllipse(e.x,e.y,44,28); g.fillStyle(0x8e2a33,1); g.fillTriangle(e.x-20,e.y-3,e.x-36,e.y-10,e.x-32,e.y+8); g.fillStyle(0xffd166,1); g.fillTriangle(e.x+18,e.y-6,e.x+31,e.y-3,e.x+18,e.y+1); this.time.delayedCall(16,()=>g.destroy());});
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent:'game',
  width: 1280,
  height: 720,
  physics:{default:'arcade',arcade:{gravity:{y:980},debug:false}},
  scene:[MainScene],
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}
});