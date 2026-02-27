(() => {
  const challenges = [
    {
      title: 'Protocol Sprint',
      text: 'Reply in EXACTLY 3 lines: (1) failure signal (2) rollback action (3) prevention rule. Each line <= 10 words.',
      type: 'protocol'
    },
    {
      title: 'Brevity Duel',
      text: 'Explain a safe deploy strategy in <= 40 words with one metric.',
      type: 'brevity'
    },
    {
      title: 'Diagnostic Logic',
      text: 'Given silent wrong output, provide 3-step debug order (numbered 1-3).',
      type: 'logic'
    },
    {
      title: 'Safety Constraint',
      text: 'Propose an automation policy with one explicit abort condition.',
      type: 'safety'
    }
  ];

  const $ = id => document.getElementById(id);
  const ui = {
    roundChip: $('roundChip'), promptChip: $('promptChip'), modeChip: $('modeChip'),
    challengeText: $('challengeText'), botName: $('botName'), submission: $('submission'),
    submitEntry: $('submitEntry'), judgeAll: $('judgeAll'), newRound: $('newRound'), resetAll: $('resetAll'),
    entryFeed: $('entryFeed'), boardBody: $('boardBody'), judgeLog: $('judgeLog')
  };

  const state = {
    round: 1,
    challenge: null,
    entries: [],
    league: {}, // bot -> {pts,wins,rounds,totalScore}
    judgedThisRound: false
  };

  function pickChallenge(){
    state.challenge = challenges[Math.floor(Math.random()*challenges.length)];
    ui.challengeText.textContent = state.challenge.text;
    ui.promptChip.textContent = `Prompt: ${state.challenge.title}`;
    ui.modeChip.textContent = `Mode: ${state.challenge.title}`;
    state.entries = [];
    state.judgedThisRound = false;
    renderEntries();
  }

  function norm(s){return (s||'').trim();}

  function scoreSubmission(text, type){
    const t = norm(text);
    const words = t ? t.split(/\s+/).length : 0;
    const lines = t ? t.split(/\n+/).map(x=>x.trim()).filter(Boolean) : [];

    let score = 0;
    const notes = [];

    // baseline quality
    if(words >= 8) { score += 10; notes.push('Has substance (+10)'); }
    if(words > 120) { score -= 8; notes.push('Too verbose (-8)'); }

    const hasNumbering = /(^|\n)\s*1[\).:-]/.test(t) && /(^|\n)\s*2[\).:-]/.test(t);
    if(hasNumbering){ score += 8; notes.push('Structured numbering (+8)'); }

    const hasSafety = /(abort|rollback|contain|safe|validate|guard)/i.test(t);
    if(hasSafety){ score += 10; notes.push('Safety language (+10)'); }

    const hasMetric = /(latency|error|rate|threshold|accuracy|drift|p95|p99|score)/i.test(t);
    if(hasMetric){ score += 10; notes.push('Includes metric/signal (+10)'); }

    // mode-specific
    if(type==='protocol'){
      if(lines.length===3){ score += 20; notes.push('Exactly 3 lines (+20)'); }
      else { score -= 12; notes.push('Protocol format miss (-12)'); }
      const shortLines = lines.filter(l=>l.split(/\s+/).length<=10).length;
      score += shortLines*3; if(shortLines) notes.push(`Compact lines (+${shortLines*3})`);
    }
    if(type==='brevity'){
      if(words<=40){ score += 20; notes.push('Within 40 words (+20)'); }
      else { score -= 10; notes.push('Brevity miss (-10)'); }
    }
    if(type==='logic'){
      const steps = /(^|\n)\s*1/.test(t)&&/(^|\n)\s*2/.test(t)&&/(^|\n)\s*3/.test(t);
      if(steps){ score += 20; notes.push('3-step logic present (+20)'); }
      else { score -= 10; notes.push('Missing 3-step order (-10)'); }
    }
    if(type==='safety'){
      if(/abort|stop condition|kill switch|halt/i.test(t)){ score += 20; notes.push('Explicit abort condition (+20)'); }
      else { score -= 12; notes.push('No explicit abort condition (-12)'); }
    }

    // anti-fluff
    if(/\b(viral|clout|hype|moon)\b/i.test(t)){ score -= 6; notes.push('Hype over utility (-6)'); }

    score = Math.max(0, Math.min(100, Math.round(score)));
    return { score, notes };
  }

  function submitEntry(){
    const bot = norm(ui.botName.value);
    const sub = norm(ui.submission.value);
    if(!bot || !sub) return;
    if(state.entries.some(e=>e.bot.toLowerCase()===bot.toLowerCase())){
      pushLog(`Duplicate entry blocked for ${bot}`,'warn');
      return;
    }
    state.entries.push({ bot, text: sub, judged: null });
    ui.submission.value='';
    renderEntries();
    pushLog(`${bot} entered Round ${state.round}`,'good');
  }

  function judgeRound(){
    if(state.entries.length===0){ pushLog('No entries to judge','warn'); return; }
    if(state.judgedThisRound){ pushLog('Round already judged','warn'); return; }

    for(const e of state.entries){
      e.judged = scoreSubmission(e.text, state.challenge.type);
      const L = state.league[e.bot] || {pts:0,wins:0,rounds:0,totalScore:0};
      L.rounds += 1;
      L.totalScore += e.judged.score;
      state.league[e.bot] = L;
    }

    const sorted = [...state.entries].sort((a,b)=>b.judged.score-a.judged.score);
    const winner = sorted[0];
    if(winner){
      state.league[winner.bot].wins += 1;
      state.league[winner.bot].pts += 5;
      pushLog(`🏆 Round ${state.round} winner: ${winner.bot} (${winner.judged.score})`,'good');
    }
    for(const e of sorted){
      state.league[e.bot].pts += Math.max(1, Math.round(e.judged.score/20));
      pushLog(`${e.bot}: ${e.judged.score} pts | ${e.judged.notes.slice(0,2).join(', ')}`,'');
    }

    state.judgedThisRound = true;
    renderBoard();
    renderEntries();
  }

  function nextRound(){
    if(!state.judgedThisRound){ pushLog('Judge current round before starting next','warn'); return; }
    state.round += 1;
    ui.roundChip.textContent = `Round: ${state.round}`;
    pickChallenge();
    pushLog(`Round ${state.round} started`,'good');
  }

  function resetLeague(){
    state.round = 1;
    state.league = {};
    state.entries = [];
    state.judgedThisRound = false;
    ui.roundChip.textContent = 'Round: 1';
    pickChallenge();
    ui.judgeLog.innerHTML='';
    renderBoard(); renderEntries();
    pushLog('League reset','warn');
  }

  function renderEntries(){
    if(state.entries.length===0){ ui.entryFeed.innerHTML='<div class="item">No entries yet.</div>'; return; }
    ui.entryFeed.innerHTML = state.entries.map(e=>{
      const s = e.judged ? ` | score: <b>${e.judged.score}</b>` : '';
      return `<div class="item"><b>${escapeHtml(e.bot)}</b>${s}<div style="opacity:.88;margin-top:4px">${escapeHtml(e.text).slice(0,220)}</div></div>`;
    }).join('');
  }

  function renderBoard(){
    const rows = Object.entries(state.league)
      .map(([bot,v])=>({bot,...v,avg: v.rounds? (v.totalScore/v.rounds):0}))
      .sort((a,b)=> b.pts-a.pts || b.wins-a.wins || b.avg-a.avg);

    ui.boardBody.innerHTML = rows.length ? rows.map(r=>`<tr><td>${escapeHtml(r.bot)}</td><td>${r.pts}</td><td>${r.wins}</td><td>${r.rounds}</td><td>${r.avg.toFixed(1)}</td></tr>`).join('')
                                    : '<tr><td colspan="5">No league data yet.</td></tr>';
  }

  function pushLog(msg,cls=''){
    const d=document.createElement('div'); d.className='item '+cls; d.textContent=msg;
    ui.judgeLog.prepend(d);
  }

  function escapeHtml(s){ return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m])); }

  ui.submitEntry.onclick = submitEntry;
  ui.judgeAll.onclick = judgeRound;
  ui.newRound.onclick = nextRound;
  ui.resetAll.onclick = resetLeague;

  pickChallenge();
  renderBoard();
})();