(() => {
  const ASSETS = [
    {k:'saffron', n:'Saffron Oil'},
    {k:'water', n:'Skywater Futures'},
    {k:'steel', n:'Rail Steel'},
    {k:'ether', n:'Ether Credits'}
  ];

  const state = {
    day: 1, maxDay: 14, cash: 1200, influence: 10, heat: 0,
    prices: { saffron: 48, water: 32, steel: 40, ether: 55 },
    holdings: { saffron: 0, water: 0, steel: 0, ether: 0 },
    selected: 'saffron',
    gameOver: false,
    feed: []
  };

  const el = {
    market: q('market'), feed: q('feed'),
    day: q('dayChip'), cash: q('cashChip'), inf: q('infChip'), heat: q('heatChip'), net: q('netChip'),
    hype: q('hype'), smear: q('smear'), bribe: q('bribe'), ally: q('ally'), next: q('nextDay'), reset: q('newRun')
  };

  function q(id){return document.getElementById(id)}
  function rnd(a,b){return Math.random()*(b-a)+a}
  function ri(a,b){return Math.floor(rnd(a,b+1))}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}

  function netWorth(){
    let v = state.cash;
    for(const a of ASSETS) v += state.holdings[a.k]*state.prices[a.k];
    return Math.round(v);
  }

  function log(msg,cls=''){ state.feed.unshift({msg,cls}); state.feed = state.feed.slice(0,80); renderFeed(); }

  function renderFeed(){
    el.feed.innerHTML = state.feed.map(i=>`<div class="item ${i.cls||''}">${i.msg}</div>`).join('');
  }

  function renderHud(){
    el.day.textContent = `Day: ${state.day}/${state.maxDay}`;
    el.cash.textContent = `Cash: $${Math.round(state.cash)}`;
    el.inf.textContent = `Influence: ${Math.round(state.influence)}`;
    el.heat.textContent = `Heat: ${Math.round(state.heat)}`;
    el.net.textContent = `Net Worth: $${netWorth()}`;
  }

  function trade(asset, dir){
    if(state.gameOver) return;
    const p = state.prices[asset];
    if(dir==='buy'){
      if(state.cash >= p){
        state.cash -= p; state.holdings[asset]++; log(`Bought 1 ${nameOf(asset)} @ $${Math.round(p)}`);
      } else log('Not enough cash to buy', 'warn');
    } else {
      if(state.holdings[asset] > 0){
        state.holdings[asset]--; state.cash += p; log(`Sold 1 ${nameOf(asset)} @ $${Math.round(p)}`);
      } else log('No holdings to sell', 'warn');
    }
    render();
  }

  function nameOf(k){return ASSETS.find(a=>a.k===k).n}

  function renderMarket(){
    el.market.innerHTML = '';
    for(const a of ASSETS){
      const wrap = document.createElement('div');
      wrap.className = 'asset';
      wrap.innerHTML = `
        <div class="name">${a.n}</div>
        <div class="row"><span>Price</span><span>$${Math.round(state.prices[a.k])}</span></div>
        <div class="row"><span>Holdings</span><span>${state.holdings[a.k]}</span></div>
        <div class="btns">
          <button data-k="${a.k}" data-d="buy">Buy</button>
          <button class="ghost" data-k="${a.k}" data-d="sell">Sell</button>
          <button class="ghost" data-k="${a.k}" data-d="focus">Focus</button>
        </div>`;
      el.market.appendChild(wrap);
    }

    el.market.querySelectorAll('button').forEach(b=>{
      b.onclick = () => {
        const k = b.dataset.k, d = b.dataset.d;
        if(d==='focus'){ state.selected = k; log(`Focus moved to ${nameOf(k)}`,'warn'); render(); }
        else trade(k,d);
      };
    });
  }

  function resolveRandomEvents(){
    // baseline drift
    for(const a of ASSETS){
      const drift = rnd(-0.09,0.12);
      state.prices[a.k] = Math.max(5, state.prices[a.k] * (1 + drift));
    }

    // special event chance
    if(Math.random() < 0.65){
      const a = ASSETS[ri(0,ASSETS.length-1)].k;
      const up = Math.random() < 0.5;
      const mag = rnd(0.12,0.32);
      state.prices[a] *= (up ? 1+mag : 1-mag);
      log(`${nameOf(a)} ${up?'surges':'crashes'} on street rumors (${Math.round(mag*100)}%)`, up?'up':'down');
    }

    // heat pressure
    if(state.heat > 65 && Math.random()<0.5){
      const fine = ri(120,300);
      state.cash = Math.max(0, state.cash - fine);
      log(`Regulators fined your desk $${fine}`, 'down');
    }

    state.heat = clamp(state.heat + rnd(1,4), 0, 120);
    state.influence = clamp(state.influence + rnd(-1.5,1.5), 0, 100);
  }

  function actionHype(){
    if(state.gameOver) return;
    const k = state.selected;
    const bump = rnd(0.09,0.21) + state.influence/800;
    state.prices[k] *= (1+bump);
    state.heat = clamp(state.heat + rnd(7,14), 0, 120);
    state.influence = clamp(state.influence + rnd(1,3), 0, 100);
    log(`You pumped ${nameOf(k)}. Market bites hard.`, 'up');
    render();
  }

  function actionSmear(){
    if(state.gameOver) return;
    const k = state.selected;
    const drop = rnd(0.08,0.2);
    state.prices[k] *= (1-drop);
    state.heat = clamp(state.heat + rnd(8,15), 0, 120);
    state.influence = clamp(state.influence + rnd(0.5,2), 0, 100);
    log(`You smeared ${nameOf(k)}. Panic sells hit.`, 'down');
    render();
  }

  function actionBribe(){
    if(state.gameOver) return;
    const cost = 180;
    if(state.cash < cost) return log('Too broke to bribe today', 'warn');
    state.cash -= cost;
    state.heat = clamp(state.heat - rnd(16,28), 0, 120);
    log('Inspector looked the other way.', 'up');
    render();
  }

  function actionAlly(){
    if(state.gameOver) return;
    const cost = 120;
    if(state.cash < cost) return log('Need cash to host alliance dinner', 'warn');
    state.cash -= cost;
    state.influence = clamp(state.influence + rnd(6,12), 0, 100);
    log('Alliance forged. Whisper network expands.', 'up');
    render();
  }

  function nextDay(){
    if(state.gameOver) return;
    resolveRandomEvents();

    if(state.heat >= 100){
      state.gameOver = true;
      log('Heat hit 100. Accounts frozen. Run ends.', 'down');
    } else {
      state.day++;
      if(state.day > state.maxDay){
        state.gameOver = true;
        log('Season closes. Final books settled.', 'up');
      }
    }

    render();
    if(state.gameOver){
      const worth = netWorth();
      const verdict = worth>=7000 ? 'LEGEND' : worth>=4500 ? 'SHARK' : worth>=2500 ? 'SURVIVOR' : 'SMALL FRY';
      log(`Final Net Worth: $${worth} — ${verdict}`, worth>=4500?'up':'warn');
    }
  }

  function reset(){
    Object.assign(state, {
      day:1, maxDay:14, cash:1200, influence:10, heat:0,
      prices:{ saffron:48, water:32, steel:40, ether:55 },
      holdings:{ saffron:0, water:0, steel:0, ether:0 },
      selected:'saffron', gameOver:false, feed:[]
    });
    log('Welcome to Liar\'s Market. Move quietly, profit loudly.', 'warn');
    render();
  }

  function render(){ renderHud(); renderMarket(); }

  el.hype.onclick = actionHype;
  el.smear.onclick = actionSmear;
  el.bribe.onclick = actionBribe;
  el.ally.onclick = actionAlly;
  el.next.onclick = nextDay;
  el.reset.onclick = reset;

  reset();
})();