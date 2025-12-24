 document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'http://localhost:3000/api';
  let currentUser = null;
  const socket = io(); 

  // ==========================
  // 0. i18n 多語言字典
  // ==========================
  const translations = {
    zh: {
      login_desc: "為地球盡一份心力", ph_user: "請輸入識別代號...", btn_login: "連線",
      nav_dash: "儀表板", nav_game: "對戰", nav_action: "行動", nav_log: "紀錄", rank_title: "排行榜", btn_logout: "登出",
      hero_title: "一起讓校園更綠！", hero_desc: "你的個人儀表板：目標、行動、與可量化成果。",
      kpi_cups: "省下杯數", kpi_carbon: "減碳量 (kg)", kpi_rate: "達成率",
      game_title: "⚡ 環保知識對決", game_desc: "與同學即時連線挑戰！",
      lobby_wait: "等待挑戰者加入...", btn_join: "加入戰局", btn_start_game: "開始遊戲 (主機)",
      lbl_q: "題目", battle_res: "對戰結果 🏆", btn_lobby: "返回大廳",
      sec_action: "行動清單", btn_add: "+ 新增", prog_title: "目前進度", txt_completion: "完成度",
      log_title: "新增回收紀錄", log_type: "種類", log_item: "物品名稱", log_count: "數量",
      opt_recycle: "♻️ 資源回收", opt_trash: "🗑️ 一般垃圾", opt_food: "🍎 廚餘",
      ph_item: "例如：寶特瓶", btn_confirm: "送出紀錄",
      sec_stats: "統計數據", stats_desc: "根據你的行動分析。",
      modal_title: "新增行動", ph_task: "你想做什麼？", btn_cancel: "取消", btn_add_confirm: "新增",
      task_1: "自帶環保杯", task_2: "拒絕塑膠袋", task_3: "做好分類回收"
    },
    en: {
      login_desc: "Enter User ID to connect.", ph_user: "Enter ID...", btn_login: "CONNECT",
      nav_dash: "Dashboard", nav_game: "Battle", nav_action: "Actions", nav_log: "Logs", rank_title: "Rank", btn_logout: "Exit",
      hero_title: "Make Campus Greener.", hero_desc: "Your personal dashboard for goals and impact.",
      kpi_cups: "Cups Saved", kpi_carbon: "Carbon (kg)", kpi_rate: "Rate",
      game_title: "⚡ Eco-Knowledge Battle", game_desc: "Challenge classmates in real-time!",
      lobby_wait: "Waiting for players...", btn_join: "JOIN BATTLE", btn_start_game: "START GAME (Host)",
      lbl_q: "Question", battle_res: "Battle Results 🏆", btn_lobby: "Return to Lobby",
      sec_action: "Actions", btn_add: "+ New", prog_title: "Your Progress", txt_completion: "Completion",
      log_title: "Log Waste", log_type: "Type", log_item: "Item", log_count: "Count",
      opt_recycle: "♻️ Recycle", opt_trash: "🗑️ Trash", opt_food: "🍎 Compost",
      ph_item: "e.g., Bottle", btn_confirm: "Submit Log",
      sec_stats: "Statistics", stats_desc: "Based on your actions.",
      modal_title: "New Action Idea", ph_task: "What's your plan?", btn_cancel: "Cancel", btn_add_confirm: "Add",
      task_1: "Bring reusable cup", task_2: "Refuse plastic bags", task_3: "Sort recycling"
    },
    jp: {
      login_desc: "IDを入力して接続", ph_user: "IDを入力...", btn_login: "接続",
      nav_dash: "ダッシュボード", nav_game: "バトル", nav_action: "アクション", nav_log: "ログ", rank_title: "順位", btn_logout: "退出",
      hero_title: "キャンパスを緑に。", hero_desc: "目標と成果の個人ダッシュボード。",
      kpi_cups: "節約カップ", kpi_carbon: "削減炭素 (kg)", kpi_rate: "達成率",
      game_title: "⚡ エコ知識バトル", game_desc: "クラスメートとリアルタイム対戦！",
      lobby_wait: "参加者を待っています...", btn_join: "参加する", btn_start_game: "開始 (ホスト)",
      lbl_q: "問題", battle_res: "対戦結果 🏆", btn_lobby: "ロビーへ戻る",
      sec_action: "アクション", btn_add: "+ 追加", prog_title: "進捗状況", txt_completion: "完了率",
      log_title: "ゴミ記録", log_type: "種類", log_item: "品名", log_count: "数量",
      opt_recycle: "♻️ リサイクル", opt_trash: "🗑️ ゴミ", opt_food: "🍎 生ゴミ",
      ph_item: "例：ペットボトル", btn_confirm: "記録送信",
      sec_stats: "統計", stats_desc: "あなたのアクションに基づく。",
      modal_title: "新規アクション", ph_task: "計画は？", btn_cancel: "キャンセル", btn_add_confirm: "追加",
      task_1: "マイカップ持参", task_2: "レジ袋断る", task_3: "分別する"
    }
  };

  // 語言切換
  function setLanguage(lang) {
    localStorage.setItem('gd_lang', lang);
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (translations[lang][key]) el.innerHTML = translations[lang][key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (translations[lang][key]) el.placeholder = translations[lang][key];
    });
    const opts = document.getElementById('log-type').options;
    opts[0].text = translations[lang]['opt_recycle'];
    opts[1].text = translations[lang]['opt_trash'];
    opts[2].text = translations[lang]['opt_food'];
  }
  const langSelect = document.getElementById('lang-select');
  langSelect.addEventListener('change', e => setLanguage(e.target.value));
  setLanguage(localStorage.getItem('gd_lang') || 'zh'); // 預設中文

  // ==========================
  // 1. 視覺 & 主題 (Theme)
  // ==========================
  initParticleBackground();

  const themeBtn = document.getElementById('theme-toggle');
  const body = document.body;
  const savedTheme = localStorage.getItem('gd_theme') || 'dark';
  body.setAttribute('data-theme', savedTheme);
  themeBtn.innerText = savedTheme === 'dark' ? '🌙' : '☀️';

  themeBtn.addEventListener('click', () => {
    const current = body.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('gd_theme', newTheme);
    themeBtn.innerText = newTheme === 'dark' ? '🌙' : '☀️';
  });

  // ==========================
  // 2. 登入系統
  // ==========================
  const loginOverlay = document.getElementById('login-overlay');
  const inpUser = document.getElementById('inp-user');
  const btnLogin = document.getElementById('btn-login-action');
  const loginMsg = document.getElementById('login-msg');
  const btnLogout = document.getElementById('btn-logout');

  inpUser.addEventListener('keyup', (e) => { if(e.key==='Enter') btnLogin.click(); });

  btnLogin.addEventListener('click', async () => {
    const username = inpUser.value.trim();
    if(!username) { loginMsg.innerText = "ID Required"; return; }
    loginMsg.innerText = "Connecting...";
    try {
        const res = await fetch(API_BASE + '/auth', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({username}) });
        const data = await res.json();
        if(data.status === 'success') {
            currentUser = { username: data.username, seed: data.seed, tasks: data.tasks, wasteLogs: data.wasteLogs };
            loginOverlay.classList.add('hidden'); 
            document.getElementById('user-avatar').src = `https://api.dicebear.com/7.x/notionists/svg?seed=${currentUser.seed}`;
            
            if(currentUser.tasks.length === 0) {
                const l = langSelect.value;
                updateUI([{text: translations[l]['task_1'], isChecked: false}, {text: translations[l]['task_2'], isChecked: false}, {text: translations[l]['task_3'], isChecked: false}]);
                saveData();
            } else { updateUI(currentUser.tasks); }
            
            loadLeaderboard(); 
        } else { loginMsg.innerText = data.msg; }
    } catch(e) { loginMsg.innerText = "Backend Error"; }
  });

  btnLogout.addEventListener('click', () => window.location.reload());

  // ==========================
  // 3. Kahoot Battle
  // ==========================
  const battlePanel = {
    lobby: document.getElementById('battle-lobby'),
    quiz: document.getElementById('battle-quiz'),
    result: document.getElementById('battle-result'),
    players: document.getElementById('lobby-players'),
    btnJoin: document.getElementById('btn-join-battle'),
    btnStart: document.getElementById('btn-start-battle'),
    timerProgress: document.getElementById('timer-progress')
  };

  battlePanel.btnJoin.addEventListener('click', () => {
    if(!currentUser) { alert('Login first!'); return; }
    socket.emit('join_battle', { name: currentUser.username, seed: currentUser.seed });
    battlePanel.btnJoin.classList.add('hidden');
    battlePanel.btnStart.classList.remove('hidden'); 
  });

  battlePanel.btnStart.addEventListener('click', () => { socket.emit('start_game'); });

  socket.on('update_room', (data) => {
    battlePanel.players.innerHTML = '';
    data.players.forEach(p => {
      battlePanel.players.innerHTML += `<div class="lobby-p"><img src="https://api.dicebear.com/7.x/notionists/svg?seed=${p.avatar}"><span>${p.name}</span></div>`;
    });
  });

  socket.on('new_question', (data) => {
    battlePanel.lobby.classList.add('hidden');
    battlePanel.result.classList.add('hidden');
    battlePanel.quiz.classList.remove('hidden');
    document.getElementById('q-current').innerText = data.current;
    document.getElementById('q-total').innerText = data.total;
    document.getElementById('q-text').innerText = data.q.q;
    document.getElementById('q-feedback').innerText = "";
    battlePanel.timerProgress.style.strokeDashoffset = '0';

    document.querySelectorAll('.opt-btn').forEach((btn, idx) => {
      btn.innerText = data.q.opts[idx];
      btn.className = 'opt-btn'; btn.disabled = false;
      btn.onclick = () => { 
        socket.emit('submit_answer', idx); 
        btn.style.borderColor = "var(--primary)";
        btn.style.background = "rgba(16, 185, 129, 0.2)";
        document.querySelectorAll('.opt-btn').forEach(b=>b.disabled=true); 
      };
    });
  });

  socket.on('timer_update', (t) => {
    document.getElementById('q-timer').innerText = t;
    const offset = 226 - (t / 10) * 226;
    battlePanel.timerProgress.style.strokeDashoffset = offset;
  });

  socket.on('answer_result', (res) => {
    const fb = document.getElementById('q-feedback');
    fb.innerText = res.correct ? `Correct! +${res.score}` : "Wrong!";
    fb.style.color = res.correct ? "var(--primary)" : "var(--danger)";
  });

  socket.on('game_over', (rank) => {
    battlePanel.quiz.classList.add('hidden');
    battlePanel.result.classList.remove('hidden');
    if(rank[0]) document.getElementById('win-1').innerText = rank[0].name;
    if(rank[1]) document.getElementById('win-2').innerText = rank[1].name;
    if(rank[2]) document.getElementById('win-3').innerText = rank[2].name;
  });

  // ==========================
  // 4. Data Logic
  // ==========================
  const btnAddLog=document.getElementById('btn-add-log'), logType=document.getElementById('log-type'), logItem=document.getElementById('log-item'), logCount=document.getElementById('log-count');
  btnAddLog.addEventListener('click', async()=>{ if(!currentUser)return; const item=logItem.value.trim(), count=parseInt(logCount.value); if(!item||count<=0)return; const newLog={date:new Date().toLocaleDateString(), type:logType.value, item, count}; const res=await fetch(API_BASE+'/log-waste',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:currentUser.username, logItem:newLog})}); const data=await res.json(); if(data.status==='success'){ currentUser.wasteLogs=data.wasteLogs; loadLeaderboard(); alert("Log added!"); logItem.value=''; logCount.value=1; }});

  const checklist=document.getElementById('checklist'), progressBar=document.getElementById('progress-bar'), completionText=document.getElementById('completion'), kpiCarbonHero=document.getElementById('kpi-carbon-hero'), kpiCups=document.getElementById('kpi-cups'), kpiRate=document.getElementById('kpi-rate');
  async function saveData(){ if(!currentUser)return; const tasks=[]; document.querySelectorAll('#checklist li').forEach(li=>tasks.push({text:li.querySelector('span').innerText, isChecked:li.querySelector('.task').checked})); currentUser.tasks=tasks; await fetch(API_BASE+'/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:currentUser.username,tasks})}); loadLeaderboard(); }
  function updateUI(tasks){ checklist.innerHTML=''; let checkedCount=0; tasks.forEach(item=>{ const li=document.createElement('li'); li.innerHTML=`<div style="display:flex;align-items:center;"><input type="checkbox" class="task" ${item.isChecked?'checked':''}><span>${item.text}</span></div><button class="btn-icon" style="color:var(--danger)" onclick="deleteTask(this)">✕</button>`; checklist.appendChild(li); if(item.isChecked)checkedCount++; }); const total=tasks.length, percent=total===0?0:Math.round((checkedCount/total)*100); progressBar.style.width=percent+'%'; completionText.innerText=percent+'%'; kpiRate.innerText=percent+'%'; kpiCups.innerText=checkedCount*5; const carbon=(checkedCount*0.05).toFixed(2); if(kpiCarbonHero)kpiCarbonHero.innerText=carbon; drawChart(percent); }
  checklist.addEventListener('change', e=>{ if(e.target.classList.contains('task')){ saveData(); const tasks=[]; document.querySelectorAll('#checklist li').forEach(li=>tasks.push({text:li.querySelector('span').innerText, isChecked:li.querySelector('.task').checked})); updateUI(tasks); } });
  window.deleteTask=function(btn){ if(confirm("Remove?")){ btn.closest('li').remove(); saveData(); } };
  
  const dlgAdd=document.getElementById('dlg-add'), inputNew=document.getElementById('new-task-text'); document.getElementById('btn-add').addEventListener('click',()=>dlgAdd.showModal()); document.getElementById('confirm-add').addEventListener('click',()=>{ if(inputNew.value.trim()){ const li=document.createElement('li'); li.innerHTML=`<div style="display:flex;align-items:center;"><input type="checkbox" class="task"><span>${inputNew.value}</span></div><button class="btn-icon" style="color:var(--danger)" onclick="deleteTask(this)">✕</button>`; checklist.appendChild(li); saveData(); inputNew.value=''; dlgAdd.close(); } });
  
  async function loadLeaderboard(){ try{ const res=await fetch(API_BASE+'/leaderboard'); const allUsers=await res.json(); const rankTable=document.getElementById('rank-list'); if(!rankTable)return; rankTable.innerHTML=`<thead><tr><th>Rank</th><th>User</th><th style="text-align:right">Score</th></tr></thead>`; allUsers.forEach((user,index)=>{ const rank=index+1, isMe=(currentUser&&user.name===currentUser.username); const row=document.createElement('tr'); if(isMe)row.classList.add('rank-me'); const displayName=isMe?`${user.name} (You)`:user.name; row.innerHTML=`<td>${rank}</td><td><div style="display:flex;align-items:center;gap:10px;"><img src="https://api.dicebear.com/7.x/notionists/svg?seed=${user.seed}" style="width:24px;height:24px;border-radius:50%;">${displayName}</div></td><td style="text-align:right;font-weight:bold;color:var(--primary);">${user.score.toFixed(2)}</td>`; rankTable.appendChild(row); }); }catch(e){} }
  
  const bgMusic=document.getElementById('bg-music'); document.getElementById('btn-music').addEventListener('click',()=>{ if(bgMusic.paused)bgMusic.play(); else bgMusic.pause(); });
  
  function drawChart(val){ const ctx=document.getElementById('chart').getContext('2d'), w=500, h=300; ctx.canvas.width=w; ctx.canvas.height=h; ctx.clearRect(0,0,w,h); const data=[20,45,val,75,90], step=w/5; const grad=ctx.createLinearGradient(0,0,0,h); grad.addColorStop(0,"rgba(16,185,129,0.4)"); grad.addColorStop(1,"transparent"); ctx.beginPath(); ctx.moveTo(0,h); data.forEach((v,i)=>ctx.lineTo(i*step+step/2, h-(v/100*h*0.8))); ctx.lineTo(w,h); ctx.fillStyle=grad; ctx.fill(); ctx.beginPath(); ctx.strokeStyle="#10b981"; ctx.lineWidth=3; data.forEach((v,i)=>i===0?ctx.moveTo(step/2,h-(v/100*h*0.8)):ctx.lineTo(i*step+step/2, h-(v/100*h*0.8))); ctx.stroke(); }
  
  function initParticleBackground(){ const c=document.getElementById('particle-canvas'), ctx=c.getContext('2d'); c.width=window.innerWidth; c.height=window.innerHeight; let ps=[]; for(let i=0;i<30;i++)ps.push({x:Math.random()*c.width,y:Math.random()*c.height,r:Math.random()*2,d:Math.random()*0.5,yv:Math.random()*0.5}); function animate(){ ctx.clearRect(0,0,c.width,c.height); ctx.fillStyle='rgba(16,185,129,0.4)'; ps.forEach(p=>{ p.y-=p.yv; if(p.y<0)p.y=c.height; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); }); requestAnimationFrame(animate); } animate(); }
});
function changeAvatar(){ document.getElementById('user-avatar').src=`https://api.dicebear.com/7.x/notionists/svg?seed=${Math.random()}`; }