(()=>{
const L=window.LESSONS,X=window.EXTRA,$=s=>document.querySelector(s),app=$('#app');
const KEY='lcp-v2',TEST_SECS=8*60;
let S=JSON.parse(localStorage.getItem(KEY)||'null')||{};
S={start:S.start||today(),read:S.read||{},proj:S.proj||{},notes:S.notes||{},active:S.active||[],att:S.att||{}};
const save=()=>localStorage.setItem(KEY,JSON.stringify(S));
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
if(!S.active.includes(today())){S.active.push(today());} save();
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const dayNum=()=>Math.max(1,Math.floor((new Date(today())-new Date(S.start))/864e5)+1);
// ---------- grading ----------
const letter=p=>p>=90?'A':p>=80?'B':p>=70?'C':p>=60?'D':'F';
const GP={A:4,B:3,C:2,D:1,F:0};
const atts=sk=>S.att[sk]||(S.att[sk]=[]);
const passed=sk=>atts(sk).some(a=>a.tries.some(p=>p>=70));
const best=sk=>{let b=null;atts(sk).forEach(a=>a.tries.forEach(p=>{if(b===null||p>b)b=p}));return b};
const cur=sk=>{const a=atts(sk);return a[a.length-1]};
const locked=a=>a&&(a.tries.some(p=>p>=70)||a.tries.length>=2);
const failedOpen=()=>L.filter(l=>{const c=cur(l.skill);return c&&locked(c)&&!passed(l.skill)}).map(l=>l.skill);
// schedule: day 1-16 = lessons; day 17+ cycles failed classes
function scheduled(d){if(d<=16)return {skill:L[d-1].skill,retake:false};const f=failedOpen();return f.length?{skill:f[(d-17)%f.length],retake:true}:null}
function nextRetakeDay(sk){const d0=Math.max(17,dayNum());for(let d=d0;d<d0+40;d++){const s=scheduled(d);if(s&&s.skill===sk)return d}return null}
const status=sk=>({learned:!!(S.read[sk]&&S.proj[sk]),tested:atts(sk).some(a=>a.tries.length),passed:passed(sk)});
const streak=()=>{let n=0,d=new Date(today());while(S.active.includes(d.toISOString().slice(0,10))){n++;d.setDate(d.getDate()-1)}return n};
// ---------- speech ----------
const synth=window.speechSynthesis;let rate=1,speakQ=[],speaking=false,paused=false;
function face(talk){document.querySelectorAll('.mouth').forEach(m=>m.classList.toggle('talk',!!talk))}
function stopSpeak(){speakQ=[];speaking=false;paused=false;try{synth&&synth.cancel()}catch(e){}face(false);document.querySelectorAll('.sent.hl').forEach(e=>e.classList.remove('hl'))}
function speakList(items){stopSpeak();speakQ=items.slice();speaking=true;nextSpeak()}
function nextSpeak(){document.querySelectorAll('.sent.hl').forEach(e=>e.classList.remove('hl'));
 if(!speakQ.length||!speaking){speaking=false;face(false);return}
 const it=speakQ.shift();if(it.el){it.el.classList.add('hl');it.el.scrollIntoView({block:'center',behavior:'smooth'})}
 face(true);
 if(!synth||!window.SpeechSynthesisUtterance){setTimeout(nextSpeak,Math.min(4000,it.text.length*55));return}
 const u=new SpeechSynthesisUtterance(it.text);u.rate=rate;u.onend=nextSpeak;u.onerror=nextSpeak;synth.speak(u)}
function say(t){speakList([{text:t}])}
const TEACHER=`<svg viewBox="0 0 100 100" class="face" aria-label="Teacher"><circle cx="50" cy="50" r="44" fill="#c68a5a"/><path d="M8 44 Q50 -6 92 44 Q80 22 50 22 Q20 22 8 44Z" fill="#2b1b10"/><rect x="26" y="38" width="20" height="14" rx="5" fill="none" stroke="#d4af37" stroke-width="3"/><rect x="54" y="38" width="20" height="14" rx="5" fill="none" stroke="#d4af37" stroke-width="3"/><line x1="46" y1="44" x2="54" y2="44" stroke="#d4af37" stroke-width="3"/><circle cx="36" cy="45" r="3" fill="#111" class="eye"/><circle cx="64" cy="45" r="3" fill="#111" class="eye"/><ellipse class="mouth" cx="50" cy="72" rx="11" ry="3" fill="#5a1f1f"/></svg>`;
const teach=(msg,id)=>`<div class="teacher"><div class="av">${TEACHER}<div class="tn">Ms. Ada</div></div><div class="bubble" ${id?`id="${id}"`:''}>${msg}</div></div>`;
// ---------- Q&A ----------
function corpus(l){const x=X[l.skill];return [l.why,l.breakdown,x.fund,x.matters,...l.concepts,...x.dos.map(d=>'Do: '+d),...x.donts.map(d=>'Avoid: '+d),...x.mistakes.map(m=>'Common mistake: '+m),...x.T.map(t=>t[0]+' '+t[1][t[2]]+'. '+t[3])]}
const sentences=t=>t.split(/(?<=[.!?])\s+(?=[A-Z<'"(])/).filter(s=>s.trim().length>3);
const STOP=new Set('the a an is are what how why do does i it to of in and or for on with my me you can be this that when should which about'.split(' '));
const toks=s=>s.toLowerCase().replace(/[^a-z0-9#+<>.\s]/g,' ').split(/\s+/).filter(w=>w&&!STOP.has(w));
function bank(l){const x=X[l.skill],s=l.skill;return [
 [['what is','explain','meaning','define'],`Great question! Here's the gist: ${l.breakdown.split('. ').slice(0,2).join('. ')}.`],
 [['why','matter','important','care','useful'],`${l.why} The biggest thing to hold onto: ${x.matters}`],
 [['mistake','wrong','error','bug','broken'],`The usual traps in ${s}: ${x.mistakes.slice(0,3).join('; ')}. Watch for those and you're ahead of most beginners.`],
 [['do','tip','best','practice','should'],`My top tips for ${s}: ${x.dos.slice(0,3).join('; ')}.`],
 [['avoid','dont','not','never'],`Things to avoid in ${s}: ${x.donts.slice(0,3).join('; ')}.`],
 [['start','begin','first','where'],`Start with the Reading tab, let me read it to you, then try the warm-ups and the mini-project in Learning. Concept one is: ${l.concepts[0]}.`],
 [['test','grade','pass','retake'],`The final test is ${x.T.length} questions in 8 minutes. 70% or better (a C) passes. You get one retake; if that misses too, the class comes back on your schedule after Day 16 as a new attempt.`]]}
function answer(l,q){const qt=toks(q),ql=q.toLowerCase();
 for(const [keys,a] of bank(l)){if(keys.some(k=>new RegExp('\\b'+k+'\\b').test(ql))&&qt.length<=4)return a}
 let bestS=null,bs=0;corpus(l).forEach(c=>sentences(c).forEach(s=>{const st=new Set(toks(s));let sc=0;qt.forEach(w=>{if(st.has(w))sc+=w.length>3?2:1});if(sc>bs){bs=sc;bestS=s}}));
 if(bs>=2)return `Good question. Here's what we covered on that: ${bestS} Does that make sense? Ask me to explain any word in there.`;
 for(const [keys,a] of bank(l))if(keys.some(k=>ql.includes(k)))return a;
 return `Hmm, I don't have that one in today's notes. Try the "Fundamentals" and "Key concepts" sections in Reading — or ask me "what is ${l.skill}", "common mistakes", or "tips".`}
// ---------- nav ----------
let view='today',sel=Math.min(dayNum(),16),tab='hook';
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{view=b.dataset.v;document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));render()});
function render(){stopSpeak();clearInterval(timerId);view==='today'?renderClass():renderReport();window.scrollTo(0,0)}
function schedBar(){const dn=dayNum();let h='<div class="daybar">';
 L.forEach((l,i)=>{const d=i+1,st=status(l.skill);h+=`<button data-d="${d}" class="${d===sel?'cur':''} ${st.passed?'done':''} ${d>dn?'lock':''}">D${d}<br><span class="desk">${esc(l.skill)}</span></button>`});
 const f=failedOpen();if(f.length)h+=`<button data-d="${Math.max(17,dn)}" class="${sel>16?'cur':''}">🔁<br><span class="desk">Retakes</span></button>`;
 return h+'</div>'}
function lessonFor(d){if(d<=16)return {l:L[d-1],retake:false};const s=scheduled(d);return s?{l:L.find(x=>x.skill===s.skill),retake:true}:null}
function renderClass(){const dn=dayNum(),cl=lessonFor(sel);
 let h=`<div class="row"><span class="pill">🔔 Today is Day ${dn}</span><span class="mut">Started ${S.start}</span></div>`+schedBar();
 if(!cl){app.innerHTML=h+`<div class="board"><h1>No classes scheduled 🎓</h1><p>Every class is passed or nothing needs a retake today. Proud of you!</p></div>`;bindBar();return}
 const l=cl.l,x=X[l.skill],d=L.indexOf(l)+1,st=status(l.skill);
 h+=`<div class="board"><div class="mut">${cl.retake?'Retake class':'Class '+d+' of 16'} ${sel>dn?'· 🔒 opens on Day '+sel+' (you can still peek)':''}</div><h1>${esc(l.skill)}: ${esc(l.title)}</h1>
 <div><span class="badge ${st.learned?'y':''}">Learned</span><span class="badge ${st.tested?'y':''}">Tested</span><span class="badge ${st.passed?'y':''}">Passed</span></div></div>
 <div class="tabs">${[['hook','✨ Hook'],['read','📖 Reading'],['learn','🧪 Learning'],['test','⏱️ Test']].map(([k,n])=>`<button data-t="${k}" class="${tab===k?'on':''}">${n}</button>`).join('')}</div><div id="pane"></div>`;
 app.innerHTML=h;bindBar();document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{stopSpeak();clearInterval(timerId);tab=b.dataset.t;renderClass()});
 ({hook:paneHook,read:paneRead,learn:paneLearn,test:paneTest})[tab](l,$('#pane'),d)}
function bindBar(){document.querySelectorAll('.daybar button').forEach(b=>b.onclick=()=>{sel=+b.dataset.d;tab='hook';renderClass()})}
function controls(){return `<div class="row ctl"><button class="btn gold" data-sp="play">▶ Read to me</button><button class="btn" data-sp="pause">⏸ Pause</button><button class="btn" data-sp="stop">⏹ Stop</button><label class="mut">Speed <select id="rate">${[0.75,0.9,1,1.15,1.3].map(r=>`<option ${r===rate?'selected':''}>${r}</option>`).join('')}</select></label></div>`}
function bindControls(root){root.querySelector('#rate').onchange=e=>rate=+e.target.value;
 root.querySelector('[data-sp=play]').onclick=()=>{if(paused&&synth){synth.resume();paused=false;face(true);return}speakList([...root.querySelectorAll('.sent')].map(el=>({el,text:el.textContent})))};
 root.querySelector('[data-sp=pause]').onclick=()=>{if(synth&&speaking){synth.pause();paused=true;face(false)}};
 root.querySelector('[data-sp=stop]').onclick=stopSpeak}
const sp=t=>sentences(t).map(s=>`<span class="sent">${esc(s)}</span> `).join('');
function askBox(l){return `<div class="card"><h2>🙋 Ask the teacher</h2><div class="row"><input id="askq" placeholder="e.g. What's the difference between margin and padding?"><button class="btn gold" id="askb">Ask</button>${(window.SpeechRecognition||window.webkitSpeechRecognition)?'<button class="btn" id="mic">🎤</button>':''}</div><div id="askout"></div></div>`}
function bindAsk(l){const go=()=>{const q=$('#askq').value.trim();if(!q)return;const a=answer(l,q);$('#askout').innerHTML=teach(esc(a));say(a)};
 $('#askb').onclick=go;$('#askq').onkeydown=e=>{if(e.key==='Enter')go()};
 const m=$('#mic');if(m)m.onclick=()=>{const R=new(window.SpeechRecognition||window.webkitSpeechRecognition)();R.lang='en-US';R.onresult=e=>{$('#askq').value=e.results[0][0].transcript;go()};R.start();m.textContent='👂'; R.onend=()=>m.textContent='🎤'}}
function paneHook(l,p){const msg=`Welcome to class, Lord! ✨ Today is <b>${esc(l.skill)}</b>. ${esc(l.why)} Here's the plan: first the hook (you're here), then I read the lesson to you, then you get your hands dirty, then a timed test. Ready?`;
 p.innerHTML=teach(msg)+`<div class="row"><button class="btn gold" id="hk">🔊 Hear it</button><button class="btn" id="go">Start reading →</button></div>`;
 $('#hk').onclick=()=>say(msg.replace(/<[^>]+>/g,''));$('#go').onclick=()=>{tab='read';renderClass()}}
function paneRead(l,p){const x=X[l.skill];
 p.innerHTML=teach(`I'll read this to you — follow the gold highlight. Pause any time and ask me questions below.`)+controls()+`
 <div class="card reading"><h2>The big idea</h2><p>${sp(l.breakdown)}</p><h2>Fundamentals</h2><p>${sp(x.fund)}</p>
 <h2>What matters most</h2><p>${sp(x.matters)}</p><h2>Key concepts</h2><ul class="concepts">${l.concepts.map(c=>`<li><span class="sent">${esc(c)}.</span></li>`).join('')}</ul>
 <h2>Do's</h2><ul class="do">${x.dos.map(c=>`<li><span class="sent">${esc(c)}.</span></li>`).join('')}</ul>
 <h2>Don'ts</h2><ul class="dont">${x.donts.map(c=>`<li><span class="sent">${esc(c)}.</span></li>`).join('')}</ul>
 <h2>Common mistakes</h2><ul class="oops">${x.mistakes.map(c=>`<li><span class="sent">${esc(c)}.</span></li>`).join('')}</ul>
 <button class="btn gold" id="rd">${S.read[l.skill]?'✔ Reading done':'I finished the reading'}</button></div>`+askBox(l);
 bindControls(p);bindAsk(l);$('#rd').onclick=()=>{S.read[l.skill]=true;save();tab='learn';renderClass()}}
function paneLearn(l,p,d){const x=X[l.skill],warm=x.T.slice(0,3);
 p.innerHTML=teach(`Hands-on time! Warm up with 3 quick checks (I'll tell you right away if you're right), then build the mini-project and hit Run.`)+controls()+`
 <div class="card"><h2>Quick recap</h2><p>${l.concepts.slice(0,4).map(c=>`<span class="sent">${esc(c)}.</span>`).join(' ')}</p></div>
 <div class="card"><h2>Warm-ups</h2>${warm.map((t,i)=>`<div class="q"><b>${i+1}. ${esc(t[0])}</b>${t[1].map((o,j)=>`<button class="opt" data-w="${i}" data-j="${j}">${esc(o)}</button>`).join('')}<div class="mut" id="wf${i}"></div></div>`).join('')}</div>
 <div class="card"><h2>🛠 Mini-project</h2><p>${esc(l.project.prompt)}</p><div id="runner"></div><p class="status" id="pst">${S.proj[l.skill]?'<span class="ok">✔ Project complete</span>':''}</p></div>
 <div class="card"><h2>📝 My notes for Day ${d}</h2><textarea id="notes" placeholder="What clicked today? What's still fuzzy?">${esc(S.notes[d]||'')}</textarea></div>`+askBox(l);
 bindControls(p);bindAsk(l);
 p.querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>{const t=warm[b.dataset.w],ok=+b.dataset.j===t[2];
  p.querySelectorAll(`[data-w="${b.dataset.w}"]`).forEach(o=>o.classList.remove('right','wrong'));b.classList.add(ok?'right':'wrong');
  const m=ok?'Yes! '+t[3]:'Not quite. '+t[3];$('#wf'+b.dataset.w).textContent=m;say(m)});
 $('#notes').oninput=e=>{S.notes[d]=e.target.value;save()};
 RUN[l.project.type](l,$('#runner'))}
function projDone(l,ok,msg){const e=$('#pst');if(ok){S.proj[l.skill]=true;save()}e.innerHTML=ok?`<span class="ok">✔ ${esc(msg||'Project complete! Nice work.')}</span>`:`<span class="bad">✗ ${esc(msg)}</span>`;e.className='status '+(ok?'ok':'bad')}
// ---------- runners ----------
const CHECKS={
 html_intro:r=>/<h1[\s>]/i.test(r.html)&&/<p[\s>]/i.test(r.html)&&(r.html.match(/<li[\s>]/gi)||[]).length>=3?[1,'Intro card has h1, p, and 3+ goals!']:[0,'Need an <h1>, a <p>, and at least 3 <li> goals.'],
 css_card:r=>{const s=r.code.replace(/\s/g,'').toLowerCase();return /\.card\{[^}]*background/.test(s)&&/border/.test(s)&&/padding/.test(s)&&/border-radius/.test(s)&&/display:flex/.test(s)?[1,'Styled like a pro!']:[0,'Need background, border, padding, border-radius on .card and display:flex somewhere.']},
 js_avg:r=>r.logs.some(x=>String(x).trim()==='25')?[1,'Prints 25 — correct!']:[0,'Expected the console to show 25. Got: '+(r.logs.join(' | ')||'nothing')],
 ts_signal:r=>/interface\s+Signal\s*\{[^}]*ticker\s*:\s*string[^}]*score\s*:\s*number|interface\s+Signal\s*\{[^}]*score\s*:\s*number[^}]*ticker\s*:\s*string/.test(r.code)&&r.logs.includes('HOT')?[1,'Typed and prints HOT!']:[0,'Signal needs ticker: string and score: number, and the log should say HOT.'],
 react_counter:r=>/Count:\s*1\b/.test(r.after||'')?[1,'Clicking works — count went up!']:[0,'After clicking the button the count should show 1.']};
function webRunner(l,el,kind){el.innerHTML=`<textarea class="code" spellcheck="false">${esc(localStorage.getItem('code-'+l.skill)||l.project.starter)}</textarea><div class="row"><button class="btn gold run">▶ Run</button><button class="btn rs">Reset code</button></div><iframe sandbox="allow-scripts" title="output"></iframe><pre class="out"></pre>`;
 const ta=el.querySelector('textarea'),fr=el.querySelector('iframe'),out=el.querySelector('pre');
 ta.oninput=()=>localStorage.setItem('code-'+l.skill,ta.value);el.querySelector('.rs').onclick=()=>{ta.value=l.project.starter;localStorage.removeItem('code-'+l.skill)};
 el.querySelector('.run').onclick=async()=>{let code=ta.value,body='',err='';
  if(kind==='ts'){try{await loadScript('https://cdn.jsdelivr.net/npm/typescript@5.4.5/lib/typescript.js');code=ts.transpile(code,{target:ts.ScriptTarget.ES2017})}catch(e){err=e.message}}
  const rep=`<script>(function(){var logs=[];var P=function(m){parent.postMessage(Object.assign({cp:1},m),'*')};['log','info','warn'].forEach(function(k){var o=console[k];console[k]=function(){var a=[].slice.call(arguments).map(function(x){return typeof x==='object'?JSON.stringify(x):String(x)});logs.push(a.join(' '));P({log:a.join(' ')});o.apply(console,arguments)}});window.onerror=function(m){P({err:String(m)})};window.addEventListener('load',function(){setTimeout(function(){var h=document.body.innerHTML;var b=document.querySelector('button');if(b)b.click();setTimeout(function(){P({done:1,html:h,after:document.body.innerText,logs:logs})},300)},${kind==='react'?1500:200})})})()<\/script>`;
  if(kind==='html')body=rep+code;
  else if(kind==='react')body=rep+`<div id="root"></div><script src="https://unpkg.com/react@18/umd/react.development.js"><\/script><script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script><script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script><script type="text/babel">${code.replace(/<\/script/gi,'<\\/script')}<\/script>`;
  else body=rep+`<script>${code.replace(/<\/script/gi,'<\\/script')}<\/script>`;
  out.textContent=err?'Error: '+err:'';fr.style.background='#fff';
  const h=e=>{if(!e.data||!e.data.cp||e.source!==fr.contentWindow)return;if(e.data.log!==undefined)out.textContent+=e.data.log+'\n';if(e.data.err)out.textContent+='⚠ '+e.data.err+'\n';
   if(e.data.done){window.removeEventListener('message',h);const [ok,m]=CHECKS[l.project.check]({code:ta.value,html:kind==='html'?ta.value:e.data.html,after:e.data.after,logs:e.data.logs});projDone(l,ok,m)}};
  window.addEventListener('message',h);fr.srcdoc=`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif">${body}</body></html>`}}
const loaded={};function loadScript(src){return loaded[src]||(loaded[src]=new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('Could not load '+src+' (are you online?)'));document.head.appendChild(s)}))}
function codeBox(l,el,label){el.innerHTML=`<textarea class="code" spellcheck="false">${esc(localStorage.getItem('code-'+l.skill)||l.project.starter)}</textarea><div class="row"><button class="btn gold run">▶ ${label}</button><button class="btn rs">Reset code</button></div><pre class="out"></pre>`;
 const ta=el.querySelector('textarea');ta.oninput=()=>localStorage.setItem('code-'+l.skill,ta.value);el.querySelector('.rs').onclick=()=>{ta.value=l.project.starter;localStorage.removeItem('code-'+l.skill)};return [ta,el.querySelector('.run'),el.querySelector('.out')]}
let pyP=null;
const RUN={html:(l,e)=>webRunner(l,e,'html'),js:(l,e)=>webRunner(l,e,'js'),ts:(l,e)=>webRunner(l,e,'ts'),react:(l,e)=>webRunner(l,e,'react'),
 py:(l,el)=>{const [ta,b,out]=codeBox(l,el,'Run Python');b.onclick=async()=>{out.textContent='Loading Python (first time takes ~10s)…';
  try{if(!pyP)pyP=loadScript('https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js').then(()=>loadPyodide());const py=await pyP;let buf='';py.setStdout({batched:s=>buf+=s+'\n'});py.setStderr({batched:s=>buf+=s+'\n'});
   try{await py.runPythonAsync(ta.value)}catch(e){buf+=String(e.message||e).split('\n').slice(-3).join('\n')}out.textContent=buf||'(no output)';
   const ok=buf.trim().split('\n').pop()==='10.0';projDone(l,ok,ok?'Prints 10.0 — correct!':'Expected the last line to print 10.0')}catch(e){out.textContent='Error: '+e.message}}},
 sql:(l,el)=>{const [ta,b,out]=codeBox(l,el,'Run SQL');el.insertAdjacentHTML('afterbegin','<p class="mut">Table <b>signals</b>(ticker, sector, score): 8 rows of sample MarketPulse-style data.</p>');
  b.onclick=async()=>{out.textContent='Loading SQL engine…';try{await loadScript('https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/sql-wasm.js');const SQL=await initSqlJs({locateFile:f=>'https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/'+f});
   const db=new SQL.Database();db.run(`CREATE TABLE signals(ticker TEXT,sector TEXT,score INT);INSERT INTO signals VALUES('BTC','Crypto',82),('ETH','Crypto',74),('NVDA','Tech',91),('AAPL','Tech',63),('XOM','Energy',55),('JPM','Finance',71),('SOL','Crypto',68),('TSLA','Auto',48);`);
   const r=db.exec(ta.value);if(!r.length){out.textContent='(no rows)';return}const t=r[r.length-1];out.innerHTML=`<table><tr>${t.columns.map(c=>`<th>${esc(c)}</th>`).join('')}</tr>${t.values.map(v=>`<tr>${v.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`;
   const cols=t.columns.map(c=>c.toLowerCase()),tk=t.values.map(v=>v[cols.indexOf('ticker')]).join(',');
   const ok=cols.length===2&&cols.includes('ticker')&&cols.includes('score')&&tk==='NVDA,BTC,ETH,JPM';projDone(l,ok,ok?'Perfect query!':'Expect only ticker & score, scores above 70, highest first (NVDA, BTC, ETH, JPM).')}catch(e){out.textContent='SQL error: '+e.message}}},
 git:(l,el)=>{el.innerHTML=`<div class="term" id="term"></div><div class="row"><input id="tin" placeholder="type a command, e.g. git init" autocapitalize="off"><button class="btn gold" id="tgo">Enter</button></div><p class="mut">Commands: git init, touch &lt;file&gt;, git status, git add &lt;file|.&gt;, git commit -m "msg", git log, git branch [name], git checkout &lt;branch&gt;, ls, help</p>`;
  const g={init:false,files:{},staged:new Set(),commits:[],branches:['main'],cur:'main'},T=$('#term'),pr=s=>{T.innerHTML+=s+'\n';T.scrollTop=1e9};T.style.whiteSpace='pre-wrap';pr('Welcome to the practice terminal. Type help.');
  const run=c=>{pr('<span class="p">lord@codepath $</span> '+esc(c));const a=c.match(/"[^"]*"|\S+/g)||[];
   if(a[0]==='help')return pr('Try: git init → touch index.html → git add . → git commit -m "First save" → git log → git branch feature');
   if(a[0]==='ls')return pr(Object.keys(g.files).join('  ')||'(empty)');
   if(a[0]==='touch'&&a[1]){g.files[a[1]]='new';return pr('created '+esc(a[1]))}
   if(a[0]!=='git')return pr('command not found: '+esc(a[0]||''));
   if(a[1]==='init'){g.init=true;return pr('Initialized empty Git repository in /home/lord/project/.git/')}
   if(!g.init)return pr('fatal: not a git repository (run git init first)');
   if(a[1]==='status'){const st=[...g.staged],un=Object.keys(g.files).filter(f=>g.files[f]==='new'&&!g.staged.has(f));return pr(`On branch ${g.cur}\n`+(st.length?'Changes to be committed:\n  '+st.map(f=>'new file: '+f).join('\n  ')+'\n':'')+(un.length?'Untracked files:\n  '+un.join('\n  '):'')+(!st.length&&!un.length?'nothing to commit, working tree clean':''))}
   if(a[1]==='add'){const fs=a[2]==='.'?Object.keys(g.files).filter(f=>g.files[f]==='new'):[a[2]];if(!fs[0]||!g.files[fs[0]])return pr("fatal: pathspec did not match any files");fs.forEach(f=>g.staged.add(f));return pr('')}
   if(a[1]==='commit'){if(a[2]!=='-m'||!a[3])return pr('error: use git commit -m "your message"');if(!g.staged.size)return pr('nothing added to commit (use "git add")');
    const h=Math.random().toString(16).slice(2,9);g.commits.unshift({h,m:a[3].replace(/"/g,''),b:g.cur});g.staged.forEach(f=>g.files[f]='committed');const n=g.staged.size;g.staged.clear();return pr(`[${g.cur} ${h}] ${esc(a[3].replace(/"/g,''))}\n ${n} file(s) changed`)}
   if(a[1]==='log')return pr(g.commits.map(c=>`commit ${c.h}\n    ${esc(c.m)}`).join('\n')||'fatal: no commits yet');
   if(a[1]==='branch'){if(a[2]){g.branches.push(a[2]);pr('');}else pr(g.branches.map(b=>(b===g.cur?'* ':'  ')+b).join('\n'));
    if(g.commits.length&&g.branches.includes('feature'))projDone(l,true,'You made a save point and a branch — real Git skills!');return}
   if(a[1]==='checkout'){if(!g.branches.includes(a[2]))return pr("error: branch not found");g.cur=a[2];return pr("Switched to branch '"+esc(a[2])+"'")}
   pr('git: unknown command in this simulator')};
  const go=()=>{const v=$('#tin').value.trim();if(v)run(v);$('#tin').value=''};$('#tgo').onclick=go;$('#tin').onkeydown=e=>{if(e.key==='Enter')go()}},
 quiz:(l,el)=>{const qs=l.project.questions;el.innerHTML=qs.map((q,i)=>`<div class="q"><pre>${esc(q.q)}</pre><input data-i="${i}" placeholder="your answer" autocapitalize="off"><div class="mut" id="qf${i}"></div></div>`).join('')+`<button class="btn gold" id="qchk">Check answers</button><p class="mut">No fake compiler here — this is a guided fill-the-blank / predict-the-output drill, auto-checked.</p>`;
  $('#qchk').onclick=()=>{let ok=0;qs.forEach((q,i)=>{const v=el.querySelector(`[data-i="${i}"]`).value.trim().toLowerCase(),r=q.a.some(a=>a.toLowerCase()===v);if(r)ok++;$('#qf'+i).innerHTML=r?'<span class="ok">✔ Correct</span>':`<span class="bad">✗ Answer: ${esc(q.a[0])}</span>${q.hint?' — '+esc(q.hint):''}`});
   projDone(l,ok===qs.length,ok===qs.length?'All correct!':`${ok}/${qs.length} — fix the red ones and check again.`)}}};
// ---------- test ----------
let timerId=null;
function paneTest(l,p){const sk=l.skill,x=X[sk],c=cur(sk),pass=passed(sk);
 const hist=atts(sk).map((a,i)=>`Attempt ${i+1}: ${a.tries.map(t=>t+'% ('+letter(t)+')').join(' → ')||'not taken'}${locked(a)?(a.tries.some(t=>t>=70)?' · PASSED':' · FINAL (locked)'):''}`).join('<br>');
 let can=true,why='';
 if(pass){can=true;why='You already passed this class — you can practice, but your recorded grade won\'t change.'}
 else if(c&&locked(c)){const sch=scheduled(dayNum());if(!(sch&&sch.skill===sk&&dayNum()>16)){can=false;const nd=nextRetakeDay(sk);why=`Retake scheduled for Day ${nd||'17+'} as a new attempt.`}}
 const tryN=c&&!locked(c)?c.tries.length+1:1;
 p.innerHTML=teach(`Final test time! ${x.T.length} questions, 8 minutes. 70%+ (C or better) passes. ${tryN===2?'This is your one <b>retake</b> for this attempt — if it misses, the grade locks and the class comes back after Day 16.':'You get one retake if you need it.'} Breathe — you've got this.`)+
 `<div class="card"><p><b>Grading:</b> A 90+ · B 80+ · C 70+ · D 60+ · F below 60. Pass = C or better.</p><p class="mut">${hist||'No attempts yet.'}</p><p>${esc(why)}</p>${can?`<button class="btn gold" id="start">${pass?'Practice test':tryN===2?'Start retake':'Start test'}</button>`:''}</div><div id="tz"></div>`;
 if(can)$('#start').onclick=()=>runTest(l,pass)}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function runTest(l,practice){const qs=shuffle(X[l.skill].T),ans={};let left=TEST_SECS;const z=$('#tz');$('#start').remove();
 z.innerHTML=`<div class="card"><div class="row"><span class="timer" id="tm"></span><span class="mut">answered <b id="ac">0</b>/${qs.length}</span></div>${qs.map((t,i)=>`<div class="q"><b>${i+1}. ${esc(t[0])}</b>${t[1].map((o,j)=>`<button class="opt" data-q="${i}" data-j="${j}">${esc(o)}</button>`).join('')}</div>`).join('')}<button class="btn gold" id="sub">Submit test</button></div>`;
 z.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{ans[b.dataset.q]=+b.dataset.j;z.querySelectorAll(`[data-q="${b.dataset.q}"]`).forEach(o=>o.classList.toggle('sel',o===b));$('#ac').textContent=Object.keys(ans).length});
 const tick=()=>{const m=$('#tm');if(!m)return clearInterval(timerId);m.textContent=`⏱ ${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`;m.classList.toggle('low',left<=60);if(left--<=0)finish()};
 clearInterval(timerId);timerId=setInterval(tick,1000);tick();$('#sub').onclick=finish;
 function finish(){clearInterval(timerId);let ok=0;qs.forEach((t,i)=>{if(ans[i]===t[2])ok++});const pct=Math.round(ok/qs.length*100),g=letter(pct);
  if(!practice){let c=cur(l.skill);if(!c||locked(c)){c={tries:[]};atts(l.skill).push(c)}c.tries.push(pct);save()}
  const c=cur(l.skill),retakeLeft=!practice&&pct<70&&c.tries.length<2,lockedF=!practice&&pct<70&&!retakeLeft;
  const msg=pct>=70?`You passed with a ${g}! I'm proud of you, Lord.`:retakeLeft?`That's a ${g}. Not a pass yet, but you have one retake. Review the wrong answers below, re-read, then go again.`:practice?`Practice score: ${g}.`:`That's a ${g}, and this attempt is now locked. No stress — this class comes back on your schedule after Day 16 as a new attempt.`;
  z.innerHTML=`<div class="card" style="text-align:center"><div class="grade">${g}</div><div>${ok}/${qs.length} correct · ${pct}%</div></div>`+teach(esc(msg))+
  `<div class="card"><h2>Review</h2>${qs.map((t,i)=>{const r=ans[i]===t[2];return `<div class="q"><b>${r?'✅':'❌'} ${esc(t[0])}</b><div>${r?'':`Your answer: ${ans[i]===undefined?'(blank)':esc(t[1][ans[i]])}<br>`}Correct: <b>${esc(t[1][t[2]])}</b></div><div class="mut">${esc(t[3])}</div></div>`}).join('')}</div>`+(retakeLeft?'<button class="btn gold" id="again">Back to test page</button>':'');
  say(msg);const a=$('#again');if(a)a.onclick=()=>renderClass()}}
// ---------- report card ----------
function renderReport(){let pts=0,n=0;const rows=L.map((l,i)=>{const sk=l.skill,b=best(sk),st=status(sk),c=cur(sk),fo=failedOpen().includes(sk);
  let g='—';if(b!==null){g=passed(sk)?letter(b):letter(Math.max(...c.tries));pts+=GP[g];n++}
  const flag=fo?`<span class="bad">Retake scheduled (Day ${nextRetakeDay(sk)})</span>`:st.passed?'<span class="ok">Passed</span>':c&&!locked(c)?'Retake available':'';
  return `<tr><td>D${i+1}</td><td>${esc(sk)}</td><td><b>${g}</b>${b!==null?' ('+b+'%)':''}</td><td>${atts(sk).length}</td><td>${st.learned?'✔':'·'} / ${st.tested?'✔':'·'} / ${st.passed?'✔':'·'}</td><td>${flag}</td></tr>`}).join('');
 const gpa=n?(pts/n).toFixed(2):'—',np=L.filter(l=>passed(l.skill)).length,pc=Math.round(np/16*100),ov=n?(pts/n>=3.5?'A':pts/n>=2.5?'B':pts/n>=1.5?'C':pts/n>=0.5?'D':'F'):'—';
 app.innerHTML=`<div class="board"><h1>📋 Report Card — Lord A'lhjmii</h1><div class="mut">Lord's Code Path · started ${S.start}</div></div>
 <div class="card stats"><div class="stat"><div class="n">${ov}</div>Overall</div><div class="stat"><div class="n">${gpa}</div>GPA</div><div class="stat"><div class="n">${pc}%</div>Classes passed</div><div class="stat"><div class="n">${streak()}🔥</div>Day streak</div></div>
 <div class="card"><div class="bar"><div style="width:${pc}%"></div></div></div>
 <div class="card"><h2>Skill tracker</h2><div class="grid">${L.map((l,i)=>{const st=status(l.skill);return `<div class="tile ${st.passed?'done':''}" data-d="${i+1}"><b>D${i+1} ${esc(l.skill)}</b><br><span class="badge ${st.learned?'y':''}">Learned</span><span class="badge ${st.tested?'y':''}">Tested</span><span class="badge ${st.passed?'y':''}">Passed</span></div>`}).join('')}</div></div>
 <div class="card" style="overflow-x:auto"><h2>Grades</h2><table class="rc"><tr><th>Day</th><th>Class</th><th>Grade</th><th>Attempts</th><th>L / T / P</th><th>Status</th></tr>${rows}</table>
 <p class="mut">A 90+ · B 80+ · C 70+ · D 60+ · F &lt;60. Pass = C or better. One retake per attempt; failed classes return after Day 16 until passed.</p></div>
 <div class="card"><h2>Notes</h2>${Object.keys(S.notes).filter(k=>S.notes[k]).map(k=>`<p><b>Day ${k}:</b> ${esc(S.notes[k])}</p>`).join('')||'<p class="mut">No notes yet.</p>'}</div>
 <div class="card"><div class="row"><label>Start date <input type="date" id="sd" value="${S.start}" style="width:auto"></label><button class="btn" id="reset">Reset all progress</button></div></div>`;
 document.querySelectorAll('.tile').forEach(t=>t.onclick=()=>{sel=+t.dataset.d;tab='hook';view='today';document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x.dataset.v==='today'));render()});
 $('#sd').onchange=e=>{S.start=e.target.value;save();renderReport()};
 $('#reset').onclick=()=>{if(confirm('Reset ALL progress, grades, and notes?')){localStorage.removeItem(KEY);Object.keys(localStorage).filter(k=>k.startsWith('code-')).forEach(k=>localStorage.removeItem(k));location.reload()}}}
window.__cp={S,save,render,answer:(i,q)=>answer(L[i],q)};
render();
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js');
})();
