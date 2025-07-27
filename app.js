// ===== 基本数据与工具 =====
const STORAGE_KEY = 'fitTrackDataV1';
const TODAY = new Date();

const defaultData = {
  goals: { dailyProtein: 130, dailyCalories: 1500, caffeineCutoffHour: 18, bodyWeight: 64 },
  foodLibrary: [
    {id:'whey30',name:'乳清30g',protein:24,carb:2,fat:2,kcal:120,caffeine:20},
    {id:'milk200',name:'牛奶200ml',protein:7,carb:10,fat:6,kcal:130,caffeine:0},
    {id:'egg1',name:'鸡蛋1个',protein:6,carb:0,fat:5,kcal:70,caffeine:0},
    {id:'tofuGan100',name:'豆腐干100g',protein:18,carb:3,fat:6,kcal:160,caffeine:0},
    {id:'chicken100',name:'鸡胸100g',protein:22,carb:0,fat:3,kcal:120,caffeine:0},
    {id:'beef100',name:'牛肉100g',protein:20,carb:0,fat:10,kcal:180,caffeine:0},
    {id:'noodle50',name:'挂面干50g',protein:5,carb:35,fat:1,kcal:170,caffeine:0},
    {id:'rice50',name:'白米生50g',protein:3,carb:38,fat:0,kcal:175,caffeine:0},
    {id:'yogurt200',name:'含糖酸奶200g',protein:8,carb:26,fat:6,kcal:180,caffeine:0},
    {id:'oreoThin1',name:'奥利奥巧轻薄1片',protein:0.3,carb:10,fat:2,kcal:33,caffeine:0},
    {id:'banana50',name:'香蕉半根50g',protein:0.6,carb:12,fat:0.2,kcal:48,caffeine:0},
  ],
  dailyLogs: [],
  trainingSessions: []
};

function loadAll(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return structuredClone(defaultData);
    const obj = JSON.parse(raw);
    // 简单校验
    if(!obj.dailyLogs || !obj.trainingSessions) throw new Error('invalid');
    // 合并默认食物库（去重）
    const libMap = new Map((obj.foodLibrary||[]).map(f=>[f.id,f]));
    defaultData.foodLibrary.forEach(f=>{ if(!libMap.has(f.id)) libMap.set(f.id,f); });
    obj.foodLibrary = Array.from(libMap.values());
    return obj;
  }catch(e){
    console.warn('加载失败，回退默认', e);
    return structuredClone(defaultData);
  }
}
function saveAll(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function todayStr(d=new Date()){ return d.toISOString().slice(0,10); }
function showToast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1800); }
function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }
function sum(arr,sel){ return arr.reduce((a,b)=>a+(sel?sel(b):b),0); }
function getTodayLog(createIfMissing=true){
  const d = todayStr();
  let log = data.dailyLogs.find(x=>x.date===d);
  if(!log && createIfMissing){ log={date:d, wakeTime:'', sleepHours:0, sleepQuality:0, energyAM:0, energyPM:0, nap:'none', breakfast:true, proteinEachMeal:false, sunlightMin:0, activityMin:0, sleepiness:0, mood:0, proteinTotal:0, caloriesTotal:0, caffeineMg:0, notes:'', foods:[]}; data.dailyLogs.push(log); }
  return log;
}
function ensureArray(v){ return Array.isArray(v)?v:[]; }
function fmt(n,dp=0){ return (n??0).toFixed(dp); }
function isAfterCutoff(){ const hour = new Date().getHours(); return hour >= (data.goals.caffeineCutoffHour??18); }

let data = loadAll();

// ===== 主题 =====
const themeToggle = document.getElementById('themeToggle');
function applyTheme(){
  const theme = localStorage.getItem('theme')||'dark';
  if(theme==='light') document.documentElement.classList.add('light'); else document.documentElement.classList.remove('light');
}
applyTheme();
if(themeToggle){ themeToggle.addEventListener('click',()=>{ const cur=localStorage.getItem('theme')||'dark'; const next=cur==='dark'?'light':'dark'; localStorage.setItem('theme',next); applyTheme(); }); }

// ===== 头部日期与 Day 建议 =====
function computeDaySuggestion(){
  const weekday = new Date().getDay(); // 0 Sun - 6 Sat
  // 习惯：周二/周六/周日提示 A/B/C
  if(weekday===2) return '建议：Day A';
  if(weekday===6) return '建议：Day B';
  if(weekday===0) return '建议：Day C';
  return '';
}
(function initHeader(){
  document.getElementById('todayDate').textContent = todayStr();
  document.getElementById('daySuggestion').textContent = computeDaySuggestion();
})();

// ===== Tab 切换 =====
const tabButtons = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.tab-panel');

tabButtons.forEach(btn=>btn.addEventListener('click',()=>{
  tabButtons.forEach(b=>b.classList.remove('active')); btn.classList.add('active');
  panels.forEach(p=>p.classList.remove('active'));
  document.getElementById(btn.dataset.tab).classList.add('active');
  // 进入面板时刷新
  if(btn.dataset.tab==='dashboard') renderDashboard();
  if(btn.dataset.tab==='nutrition') refreshNutrition();
  if(btn.dataset.tab==='review') renderWeek();
}));

// ===== 仪表盘 =====
function renderDashboard(){
  const log = getTodayLog(false);
  const p = document.getElementById('dashProtein');
  const k = document.getElementById('dashCalories');
  const c = document.getElementById('dashCaffeine');
  const s = document.getElementById('dashSleep');
  const sa = document.getElementById('dashSunAct');
  const pg = document.getElementById('dashProteinGoal');
  const goalP = data.goals.dailyProtein||0;
  if(log){
    p.textContent = fmt(log.proteinTotal,0);
    k.textContent = fmt(log.caloriesTotal,0);
    c.textContent = fmt(log.caffeineMg,0);
    s.textContent = log.sleepHours?fmt(log.sleepHours,1):'—';
    sa.textContent = `${log.sunlightMin||0}/${log.activityMin||0}`;
  }else{ p.textContent=k.textContent=c.textContent='0'; s.textContent='—'; sa.textContent='—'; }
  pg.textContent = `目标 ${goalP} g`;
  p.classList.toggle('good', log && log.proteinTotal>=goalP);
  p.classList.toggle('warn', !log || log.proteinTotal<goalP);
  drawMiniChart();
}

// 7天简易折线 (蛋白)
function drawMiniChart(){
  const cvs = document.getElementById('miniChart'); const ctx = cvs.getContext('2d');
  ctx.clearRect(0,0,cvs.width,cvs.height);
  const days=[]; for(let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); days.push(todayStr(d)); }
  const values = days.map(d=>{ const log=data.dailyLogs.find(x=>x.date===d); return log?log.proteinTotal||0:0; });
  const W=cvs.width= cvs.clientWidth*2, H=cvs.height= 120*2; ctx.scale(2,2);
  const max = Math.max(10, ...values, data.goals.dailyProtein||0);
  const stepX = cvs.clientWidth/6; const baseY = 100;
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  // 目标线
  ctx.beginPath(); ctx.moveTo(0, baseY - (data.goals.dailyProtein||0)/max*80); ctx.lineTo(cvs.clientWidth, baseY - (data.goals.dailyProtein||0)/max*80); ctx.setLineDash([4,4]); ctx.stroke(); ctx.setLineDash([]);
  // 折线
  ctx.beginPath(); ctx.lineWidth=2;
  values.forEach((v,i)=>{ const x=i*stepX; const y=baseY - v/max*80; if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
  ctx.stroke();
}

// 快速添加模板
const quickTemplates = {
  breakfast: [{id:'milk200',s:1},{id:'egg1',s:2}],
  pre: [{id:'banana50',s:1},{id:'whey30',s:1}],
  post: [{id:'whey30',s:1},{id:'yogurt200',s:1}],
  dinner: [{id:'beef100',s:1},{id:'rice50',s:1},{id:'noodle50',s:0.5}],
};

document.querySelectorAll('[data-quick]').forEach(b=>b.addEventListener('click',()=>{
  const key=b.dataset.quick; const arr=quickTemplates[key]||[]; arr.forEach(it=>addFoodToToday(it.id,it.s,keyLabel(key)));
  saveAll(); syncTodayTotals(); renderDashboard(); showToast('已添加模板到今天'); caffeineReminderIfNeeded();
}));
function keyLabel(k){ return k==='pre'?'训练前':k==='post'?'训练后':k==='breakfast'?'早餐':'晚餐'; }

// ===== 营养 =====
const foodSelect = document.getElementById('foodSelect');
function refreshFoodSelect(){ foodSelect.innerHTML = data.foodLibrary.map(f=>`<option value="${f.id}">${f.name}</option>`).join(''); }
refreshFoodSelect();

const foodForm = document.getElementById('foodForm');
foodForm.addEventListener('submit',e=>{e.preventDefault(); const id=foodSelect.value; const s=parseFloat(document.getElementById('servings').value)||1; const tag=document.getElementById('timeTag').value; addFoodToToday(id,s,tag); saveAll(); syncTodayTotals(); renderDashboard(); refreshNutrition(); showToast('已保存到本地'); caffeineReminderIfNeeded();});

function addFoodToToday(id,servings,tag){
  const item = data.foodLibrary.find(f=>f.id===id); if(!item) return;
  const log = getTodayLog(); log.foods = ensureArray(log.foods);
  const rec = { timeTag: tag, foodId: id, servings, protein:item.protein*servings, carb:item.carb*servings, fat:item.fat*servings, kcal:item.kcal*servings, caffeine:item.caffeine*servings };
  log.foods.push(rec);
}
function syncTodayTotals(){
  const log = getTodayLog(false); if(!log) return;
  const foods = ensureArray(log.foods);
  log.proteinTotal = +fmt(sum(foods,x=>x.protein),1);
  log.caloriesTotal = Math.round(sum(foods,x=>x.kcal));
  log.caffeineMg = Math.round(sum(foods,x=>x.caffeine));
  saveAll();
}
function caffeineReminderIfNeeded(){ const log=getTodayLog(false); if(!log) return; if(log.caffeineMg>0 && isAfterCutoff()) alert('已过咖啡因截止时间'); }

function refreshNutrition(){
  refreshFoodSelect();
  const list = document.getElementById('todayFoodList'); const log=getTodayLog(false); const foods=log?ensureArray(log.foods):[];
  list.innerHTML = foods.map((x,i)=>{
    const name = (data.foodLibrary.find(f=>f.id===x.foodId)||{name:x.foodId}).name;
    return `<li class="food-item"><div><div>${name} × ${x.servings}</div><div class="small">${x.timeTag}</div></div><div class="small">P${fmt(x.protein,1)} C${fmt(x.carb,1)} F${fmt(x.fat,1)} | ${Math.round(x.kcal)}kcal | ☕${Math.round(x.caffeine)}mg <br><button data-del="${i}">删除</button></div></li>`;
  }).join('');
  list.querySelectorAll('button[data-del]').forEach(btn=>btn.addEventListener('click',()=>{ const idx=+btn.dataset.del; foods.splice(idx,1); syncTodayTotals(); saveAll(); refreshNutrition(); renderDashboard(); }));
  document.getElementById('todayP').textContent = fmt(sum(foods,x=>x.protein),1);
  document.getElementById('todayC').textContent = fmt(sum(foods,x=>x.carb),1);
  document.getElementById('todayF').textContent = fmt(sum(foods,x=>x.fat),1);
  document.getElementById('todayK').textContent = Math.round(sum(foods,x=>x.kcal));
  document.getElementById('todayCafe').textContent = Math.round(sum(foods,x=>x.caffeine));
}

// ===== 每日追踪 =====
(function initWellness(){
  const d = document.getElementById('dailyDate'); d.value = todayStr();
  document.getElementById('wellnessForm').addEventListener('submit',e=>{
    e.preventDefault();
    const date = d.value; let log = data.dailyLogs.find(x=>x.date===date);
    if(!log){ log={date, foods:[]}; data.dailyLogs.push(log); }
    log.wakeTime = document.getElementById('wakeTime').value || '';
    log.sleepHours = parseFloat(document.getElementById('sleepHours').value)||0;
    log.sleepQuality = parseInt(document.getElementById('sleepQuality').value)||0;
    log.energyAM = parseInt(document.getElementById('energyAM').value)||0;
    log.energyPM = parseInt(document.getElementById('energyPM').value)||0;
    log.nap = document.getElementById('nap').value;
    log.breakfast = document.getElementById('breakfast').value==='true';
    log.proteinEachMeal = document.getElementById('proteinEachMeal').value==='true';
    log.sunlightMin = parseInt(document.getElementById('sunlightMin').value)||0;
    log.activityMin = parseInt(document.getElementById('activityMin').value)||0;
    log.sleepiness = clamp(parseInt(document.getElementById('sleepiness').value)||0,0,3);
    log.mood = clamp(parseInt(document.getElementById('mood').value)||0,1,5);
    log.proteinTotal = parseFloat(document.getElementById('proteinTotal').value)||log.proteinTotal||0;
    log.caloriesTotal = parseInt(document.getElementById('caloriesTotal').value)||log.caloriesTotal||0;
    log.caffeineMg = parseInt(document.getElementById('caffeineMg').value)||log.caffeineMg||0;
    log.notes = document.getElementById('dailyNotes').value||'';
    saveAll(); showToast('已保存到本地'); renderDashboard();
    if(log.caffeineMg>0 && isAfterCutoff()) alert('已过咖啡因截止时间');
  });
})();

// ===== 训练模板与表单 =====
const templates = {
  A: [
    {name:'臀桥机/杠铃臀推', targetSets:4, targetReps:'10-12', hint:'起始40–50kg'},
    {name:'哑铃 RDL', targetSets:3, targetReps:'10', hint:'每手10–12kg'},
    {name:'俯身哑铃腿弯举', targetSets:3, targetReps:'12–15', hint:'4–6kg'},
    {name:'坐姿划船', targetSets:3, targetReps:'10–12', hint:'25–35kg'},
    {name:'哑铃肩推', targetSets:3, targetReps:'10', hint:'每手6–8kg'},
    {name:'平板支撑', targetSets:3, targetReps:'30–40s', hint:'自重'},
  ],
  B: [
    {name:'哑铃胸推', targetSets:4, targetReps:'8–10', hint:'每手8–10kg'},
    {name:'哑铃侧平举', targetSets:3, targetReps:'12–15', hint:'每手4–6kg'},
    {name:'Face-pull', targetSets:3, targetReps:'15', hint:'中等阻力'},
    {name:'坐姿划船 / 反手下拉', targetSets:3, targetReps:'10–12', hint:'25–35kg'},
    {name:'哑铃二头弯举', targetSets:3, targetReps:'10–12', hint:'每手5–6kg'},
    {name:'核心（卷腹/死虫）', targetSets:3, targetReps:'15 / 10/侧', hint:''},
  ],
  C: [
    {name:'RDL 或 臀桥', targetSets:4, targetReps:'8–10', hint:'与 A 互换'},
    {name:'腿外展机', targetSets:3, targetReps:'15–20', hint:'中重量'},
    {name:'坐姿划船（换握距）', targetSets:3, targetReps:'10', hint:''},
    {name:'反手高位下拉', targetSets:3, targetReps:'10', hint:'25–35kg'},
    {name:'Face-pull', targetSets:3, targetReps:'15', hint:''},
    {name:'侧桥', targetSets:3, targetReps:'30s/侧', hint:''},
  ],
};

const exerciseList = document.getElementById('exerciseList');
const dayTypeSel = document.getElementById('dayType');
const trainDate = document.getElementById('trainDate');

(function initTraining(){
  trainDate.value = todayStr();
  dayTypeSel.addEventListener('change',()=>renderExercises(dayTypeSel.value));
  renderExercises(dayTypeSel.value);
  document.getElementById('addExerciseBtn').addEventListener('click',()=>addExerciseBlock({name:'新动作', targetSets:3, targetReps:'', hint:''}));
  document.getElementById('addSetBtn').addEventListener('click',()=>{
    const cur = exerciseList.querySelector('.exercise.active'); if(!cur) return; const sets = cur.querySelector('.sets');
    sets.appendChild(buildSetRow()); updateTrainingMetrics();
  });
  document.getElementById('trainingForm').addEventListener('submit',saveTrainingSession);
})();

function renderExercises(day){
  exerciseList.innerHTML = '';
  (templates[day]||[]).forEach(t=>addExerciseBlock(t));
  updateTrainingMetrics();
}

function addExerciseBlock(t){
  const el = document.createElement('div'); el.className='exercise';
  el.innerHTML = `<div class="exercise-header"><span class="exercise-name">${t.name}</span><button type="button" class="icon-btn" aria-label="删除">✖</button></div><div class="muted small">${t.targetSets||''}组 目标次数 ${t.targetReps||''} ${t.hint?('｜'+t.hint):''}</div><div class="sets"></div>`;
  const sets = el.querySelector('.sets');
  for(let i=0;i<(t.targetSets||3);i++) sets.appendChild(buildSetRow());
  el.addEventListener('click',()=>{ exerciseList.querySelectorAll('.exercise').forEach(x=>x.classList.remove('active')); el.classList.add('active'); });
  el.querySelector('button').addEventListener('click',()=>{ el.remove(); updateTrainingMetrics(); });
  exerciseList.appendChild(el);
}
function buildSetRow(){
  const row = document.createElement('div'); row.className='set-row';
  row.innerHTML = `
    <input type="number" placeholder="组次" min="1" step="1" inputmode="numeric" />
    <input type="number" placeholder="重量kg" min="0" step="0.5" inputmode="decimal" />
    <input type="number" placeholder="次数" min="0" step="1" inputmode="numeric" />
    <input type="number" placeholder="RIR" min="-3" max="5" step="1" inputmode="numeric" />
    <input type="text" placeholder="备注" />`;
  const idx = (exerciseList.querySelectorAll('.set-row').length % 5) + 1; row.children[0].value = idx;
  Array.from(row.querySelectorAll('input')).forEach(inp=>inp.addEventListener('input',updateTrainingMetrics));
  return row;
}

function updateTrainingMetrics(){
  let totalSets=0, volume=0;
  exerciseList.querySelectorAll('.exercise').forEach(ex=>{
    ex.querySelectorAll('.set-row').forEach(row=>{
      const kg = parseFloat(row.children[1].value)||0; const reps = parseInt(row.children[2].value)||0;
      totalSets++; volume += kg*reps;
    });
  });
  document.getElementById('totalSets').textContent = totalSets;
  document.getElementById('totalVolume').textContent = Math.round(volume);
}

function saveTrainingSession(e){
  e.preventDefault();
  const date = trainDate.value; const day = dayTypeSel.value; const duration = parseInt(document.getElementById('durationMin').value)||0; const notes = document.getElementById('sessionNotes').value||'';
  const exercises=[];
  exerciseList.querySelectorAll('.exercise').forEach(ex=>{
    const name = ex.querySelector('.exercise-name').textContent.trim();
    const sets=[]; ex.querySelectorAll('.set-row').forEach(row=>{
      const set = { kg: parseFloat(row.children[1].value)||0, reps: parseInt(row.children[2].value)||0, rir: parseInt(row.children[3].value)||0, note: row.children[4].value||'' };
      if(set.kg||set.reps||set.note) sets.push(set);
    });
    if(sets.length) exercises.push({name, sets});
  });
  data.trainingSessions.push({date, dayType:day, durationMin:duration, exercises, sessionNotes:notes});
  saveAll(); showToast('已保存到本地');
}

// ===== 周评估与进阶规则 =====
function isoWeek(d){
  const date = new Date(d.getTime()); date.setHours(0,0,0,0); date.setDate(date.getDate()+3-((date.getDay()+6)%7)); const week1 = new Date(date.getFullYear(),0,4); return 1+Math.round(((date-week1)/86400000-3+((week1.getDay()+6)%7))/7);
}
function weekRangeFromInput(val){ // yyyy-W##
  if(!val){ const d=new Date(); const day=d.getDay()||7; const monday=new Date(d); monday.setDate(d.getDate()-day+1); const sunday=new Date(monday); sunday.setDate(monday.getDate()+6); return [todayStr(monday), todayStr(sunday)]; }
  const [y,w] = val.split('-W').map(Number); const simple = new Date(y,0,1+(w-1)*7); const dow = simple.getDay(); const ISOmonday = new Date(simple); const diff = (dow<=4?1-dow:8-dow); ISOmonday.setDate(simple.getDate()+diff); const sunday = new Date(ISOmonday); sunday.setDate(ISOmonday.getDate()+6); return [todayStr(ISOmonday), todayStr(sunday)];
}

const weekPicker = document.getElementById('weekPicker');
function renderWeek(){
  if(!weekPicker.value){
    const y = new Date().getFullYear(); const w = String(isoWeek(new Date())).padStart(2,'0'); weekPicker.value = `${y}-W${w}`;
  }
  const [start,end] = weekRangeFromInput(weekPicker.value);
  const logs = data.dailyLogs.filter(x=>x.date>=start && x.date<=end);
  const trains = data.trainingSessions.filter(x=>x.date>=start && x.date<=end);
  const avg = (k)=> logs.length? sum(logs,x=>+x[k]||0)/logs.length : 0;
  const sums = { protein: sum(logs,x=>+x.proteinTotal||0), calories: sum(logs,x=>+x.caloriesTotal||0), caffeine: sum(logs,x=>+x.caffeineMg||0), sleep: avg('sleepHours'), sunlight: avg('sunlightMin'), activity: avg('activityMin') };
  const ws = document.getElementById('weekSummary');
  ws.innerHTML = `
    <div class="card"><div class="card-title">平均蛋白 (g)</div><div class="card-value">${fmt(sums.protein/logs.length||0,0)}</div></div>
    <div class="card"><div class="card-title">平均热量 (kcal)</div><div class="card-value">${fmt(sums.calories/logs.length||0,0)}</div></div>
    <div class="card"><div class="card-title">平均咖啡因 (mg)</div><div class="card-value">${fmt(sums.caffeine/logs.length||0,0)}</div></div>
    <div class="card"><div class="card-title">平均睡眠 (h)</div><div class="card-value">${fmt(sums.sleep,1)}</div></div>
    <div class="card"><div class="card-title">平均日晒 (min)</div><div class="card-value">${fmt(sums.sunlight,0)}</div></div>
    <div class="card"><div class="card-title">平均活动 (min)</div><div class="card-value">${fmt(sums.activity,0)}</div></div>`;

  // 训练量统计 & 进阶建议
  const list = document.getElementById('progressHints'); list.innerHTML='';
  const exMap = new Map();
  trains.forEach(s=>{
    s.exercises.forEach(ex=>{
      const vol = sum(ex.sets,z=> (z.kg||0)*(z.reps||0));
      const key = ex.name; const prev = exMap.get(key)||{volume:0, sessions:[]};
      prev.volume += vol; prev.sessions.push(ex); exMap.set(key,prev);
    });
  });
  function hintFor(name){
    const ses = data.trainingSessions.filter(x=>x.exercises.some(e=>e.name===name)).slice(-2);
    if(ses.length<2) return null;
    const recent = ses.map(s=> s.exercises.find(e=>e.name===name));
    const ok = recent.every(ex=> ex.sets.every(s=> (s.rir??0)>=2 && (s.reps??0)>0));
    const hard = recent.some(ex=> ex.sets.slice(-2).some(s=> (s.rir??0)<=0));
    if(ok) return `${name}：两次训练均较余裕（RIR≥2），下次杠铃 +2.5kg；哑铃每手 +1–2kg。`;
    if(hard) return `${name}：最近训练接近力竭（最后两组 RIR≤0），建议降重 5–10%。`;
    return `${name}：维持现重量，巩固技术。`;
  }
  exMap.forEach((v,k)=>{
    const h = hintFor(k); const div=document.createElement('div'); div.className='hint'; div.textContent=`${k}｜周训练量 ${Math.round(v.volume)} ｜ ${h||'—'}`; list.appendChild(div);
  });

  const lastChest = data.trainingSessions.filter(x=>x.exercises.some(e=>e.name.includes('胸推'))).slice(-4);
  if(lastChest.length){
    const chestHard = lastChest.some(s=> s.exercises.some(e=> e.name.includes('胸推') && e.sets.slice(-2).some(z=> (z.rir??0)<=0)) );
    if(chestHard){
      const tip = document.createElement('div'); tip.className='hint'; tip.textContent='胸推长期吃力：可将腿外展或腿弯举各减 1 组，胸推 +3 组（周总量保持）。'; list.appendChild(tip);
    }
  }
}
weekPicker.addEventListener('change',renderWeek);

// ===== 设置、导入导出 =====
(function initSettings(){
  const f=document.getElementById('settingsForm');
  f.bodyWeight.value = data.goals.bodyWeight||0;
  f.dailyProtein.value = data.goals.dailyProtein||0;
  f.dailyCalories.value = data.goals.dailyCalories||0;
  f.caffeineCutoffHour.value = data.goals.caffeineCutoffHour||18;
  f.addEventListener('submit',e=>{e.preventDefault(); data.goals.bodyWeight=parseFloat(f.bodyWeight.value)||0; data.goals.dailyProtein=parseInt(f.dailyProtein.value)||0; data.goals.dailyCalories=parseInt(f.dailyCalories.value)||0; data.goals.caffeineCutoffHour=clamp(parseInt(f.caffeineCutoffHour.value)||18,0,23); saveAll(); showToast('已保存目标'); renderDashboard();});

  document.getElementById('exportJson').addEventListener('click',()=>{
    const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); download(url,`fittrack-${todayStr()}.json`);
  });
  document.getElementById('exportDailyCsv').addEventListener('click',()=>{
    const rows = [['date','wakeTime','sleepHours','sleepQuality','energyAM','energyPM','nap','breakfast','proteinEachMeal','sunlightMin','activityMin','sleepiness','mood','proteinTotal','caloriesTotal','caffeineMg','notes']];
    data.dailyLogs.forEach(l=>rows.push([l.date,l.wakeTime,l.sleepHours,l.sleepQuality,l.energyAM,l.energyPM,l.nap,l.breakfast,l.proteinEachMeal,l.sunlightMin,l.activityMin,l.sleepiness,l.mood,l.proteinTotal,l.caloriesTotal,l.caffeineMg,quote(l.notes)]));
    downloadCsv(rows,`dailyLogs-${todayStr()}.csv`);
  });
  document.getElementById('exportTrainCsv').addEventListener('click',()=>{
    const rows = [['date','day','exercise','setIndex','kg','reps','rir','note','volume']];
    data.trainingSessions.forEach(s=>{
      s.exercises.forEach(ex=>{
        ex.sets.forEach((set,i)=> rows.push([s.date,s.dayType,ex.name,i+1,set.kg,set.reps,set.rir,quote(set.note||''),(set.kg||0)*(set.reps||0)]));
      });
    });
    downloadCsv(rows,`training-${todayStr()}.csv`);
  });
  document.getElementById('importJson').addEventListener('click',()=>document.getElementById('jsonFile').click());
  document.getElementById('jsonFile').addEventListener('change',onImportFile);
  document.getElementById('clearData').addEventListener('click',()=>{ if(confirm('确定清空所有数据？此操作不可撤销。')){ localStorage.removeItem(STORAGE_KEY); data=loadAll(); location.reload(); }});
  const enablePWA = document.getElementById('enablePWA'); enablePWA.addEventListener('change',()=>{ if(enablePWA.checked) registerSW(); else unregisterSW(); });
})();

function quote(s){ return '"'+String(s).replace(/"/g,'""')+'"'; }
function download(url, name){ const a=document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
function downloadCsv(rows, name){ const csv = rows.map(r=>r.join(',')).join('\n'); const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob); download(url,name); }

async function onImportFile(e){
  const file = e.target.files[0]; if(!file) return; try{
    const text = await file.text(); const obj = JSON.parse(text);
    if(!obj.dailyLogs && !obj.trainingSessions){ alert('JSON 无关键字段 dailyLogs / trainingSessions'); return; }
    const mode = confirm('确定覆盖当前数据吗？\n确定=覆盖；取消=合并');
    if(mode){ data = obj; } else {
      data.goals = {...data.goals, ...(obj.goals||{})};
      const map = new Map(data.foodLibrary.map(x=>[x.id,x])); (obj.foodLibrary||[]).forEach(x=>map.set(x.id,x)); data.foodLibrary = Array.from(map.values());
      const dmap = new Map(data.dailyLogs.map(x=>[x.date,x])); (obj.dailyLogs||[]).forEach(x=>dmap.set(x.date,x)); data.dailyLogs = Array.from(dmap.values()).sort((a,b)=>a.date.localeCompare(b.date));
      const sig = s=>`${s.date}|${s.dayType}|${(s.exercises||[]).length}`;
      const tmap = new Map(data.trainingSessions.map(s=>[sig(s),s])); (obj.trainingSessions||[]).forEach(s=>tmap.set(sig(s),s)); data.trainingSessions = Array.from(tmap.values()).sort((a,b)=>a.date.localeCompare(b.date));
    }
    saveAll(); showToast('导入完成'); renderDashboard(); refreshNutrition();
  }catch(err){ alert('导入失败：'+err.message); }
  e.target.value='';
}

// ===== PWA =====
async function registerSW(){ if('serviceWorker' in navigator){ try{ await navigator.serviceWorker.register('sw.js'); showToast('已注册离线缓存'); }catch(e){ alert('SW 注册失败'); } } }
async function unregisterSW(){ const regs = await navigator.serviceWorker.getRegistrations(); for(const r of regs) await r.unregister(); showToast('已取消离线缓存'); }

// 初始渲染
renderDashboard(); refreshNutrition();
