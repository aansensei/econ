'use strict';

const Chapter6Core=(()=>{
 function answered(q,answer){return q.type==='mcq'?Number.isInteger(answer)&&answer>=0&&answer<q.opts.length:Array.isArray(answer)&&answer.length===q.fields.length&&answer.every((a,i)=>Number.isInteger(a)&&a>=0&&a<q.fields[i].opts.length);}
 function grade(q,answer){
  const hits=q.type==='mcq'?[Number.isInteger(answer)&&answer===q.ans]:q.fields.map((field,i)=>Array.isArray(answer)&&answer[i]===field.ans);
  const correctParts=hits.filter(Boolean).length,totalParts=hits.length;
  return {hits,correctParts,totalParts,points:q.pts*correctParts/totalParts,max:q.pts,correct:correctParts===totalParts};
 }
 function draw(questions,random=Math.random){
  const selected=new Set();
  for(let pool=1;pool<=5;pool++){const items=questions.filter(q=>q.pool===pool);selected.add(items[Math.floor(random()*items.length)].id);}
  const mcq=questions.filter(q=>q.pool===6).slice();
  for(let i=mcq.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[mcq[i],mcq[j]]=[mcq[j],mcq[i]];}
  mcq.slice(0,5).forEach(q=>selected.add(q.id));
  return questions.filter(q=>selected.has(q.id)).map(q=>q.id);
 }
 return {answered,grade,draw};
})();
if(typeof module!=='undefined')module.exports=Chapter6Core;

if(typeof document!=='undefined'){
 const DATA=window.CHAPTER6_DATA,questions=DATA.questions,byId=new Map(questions.map(q=>[q.id,q]));
 const app=document.getElementById('app'),key='econ302_ch6_v1';
 let state={answers:{},results:{},history:{},pool:'all',quiz:null},view='review',tick=null;
 try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&saved.answers&&saved.results&&saved.history)state={...state,...saved};}catch(error){}
 if(!['all','1','2','3','4','5','6'].includes(state.pool))state.pool='all';
 if(state.quiz&&(!Array.isArray(state.quiz.ids)||!state.quiz.ids.length||!state.quiz.ids.every(id=>byId.has(id))||!Number.isFinite(state.quiz.deadline)))state.quiz=null;
 const escape=text=>String(text??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const points=value=>Number.isInteger(value)?String(value):value.toFixed(1);
 const sourceUrl=page=>encodeURI(DATA.source.url)+'#page='+page;
 const pageImage=page=>'chapter6-assets/source-pages/page-'+page+'.png';
 function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch(error){document.getElementById('storage-warning').hidden=false;}}
 function selectedQuestions(){return questions.filter(q=>(state.pool==='all'||q.pool===Number(state.pool))&&(view!=='mistakes'||state.history[q.id]?.wrong>0));}
 function feedback(q,result){
  if(!result)return '';
  const status=result.correct?'correct':result.points>0?'partial':'incorrect';
  let html=`<div class="feedback ${status}" role="status"><strong>${result.correct?'Đúng':result.points>0?'Đúng một phần':'Chưa đúng'}: ${points(result.points)}/${q.pts} điểm</strong>`;
  if(q.type==='mcq')html+=`<p class="source-text">${escape(q.keyText)}<br>${String.fromCharCode(65+q.ans)}. ${escape(q.opts[q.ans])}</p>`;
  else html+='<ul class="answer-key-list">'+q.fields.map((field,i)=>`<li>${result.hits[i]?'✓':'✗'} ${escape(field.label)}<strong>${escape(field.opts[field.ans])}</strong> (½ point)</li>`).join('')+'</ul>';
  return html+'</div>';
 }
 function card(q,mode){
  const quiz=mode==='quiz',session=state.quiz,answer=(quiz?session.answers:state.answers)[q.id];
  const result=quiz?(session.submitted?session.results[q.id]:null):state.results[q.id],locked=!!result;
  const status=result?(result.correct?'correct':result.points>0?'partial':'incorrect'):'';
  let html=`<article class="card ${status}" data-q="${q.id}" id="q-${q.id}"><div class="card-head"><span class="source-question-number">Pool ${q.pool}, Question ${q.number}</span><span class="badge official">Official answer key</span><span>${q.pts} ${q.pts===1?'point':'points'}</span></div><div class="source-stem">${escape(q.stem)}</div>`;
  if(q.type==='mcq')html+='<div class="choices">'+q.opts.map((option,i)=>`<label class="${result&&i===q.ans?'answer':result&&answer===i?'wrong':''}"><input type="radio" name="${q.id}" value="${i}" ${answer===i?'checked':''} ${locked?'disabled':''}><span>${String.fromCharCode(65+i)}. ${escape(option)}</span></label>`).join('')+'</div>';
  else html+='<div class="shock-fields">'+q.fields.map((field,i)=>`<label class="shock-field ${result?(result.hits[i]?'answer':'wrong'):''}"><span class="source-line">${escape(field.sourceLine)}</span><select data-field="${i}" aria-label="Pool ${q.pool}, Question ${q.number}: ${escape(field.label.trim())}" ${locked?'disabled':''}><option value="">Chọn đáp án</option>${field.opts.map((option,j)=>`<option value="${j}" ${answer?.[i]===j?'selected':''}>${escape(option)}</option>`).join('')}</select></label>`).join('')+'</div>';
  if(!quiz)html+=`<div class="actions"><button class="btn small ${result?'secondary':''}" ${result?'data-retry':'data-check'}="${q.id}">${result?'Làm lại':'Check answer'}</button></div>`;
  html+=feedback(q,result)+`<p class="source-controls"><a class="source-page-link" href="${sourceUrl(q.page)}" target="_blank" rel="noopener">PDF gốc, trang ${q.page}</a></p><details class="original-page"><summary>Xem nguyên trang gốc ${q.page}</summary><img class="source-image" src="${pageImage(q.page)}" alt="Trang ${q.page} trong PDF gốc" loading="lazy"></details></article>`;
  return html;
 }
 function review(){
  const qs=selectedQuestions(),attempted=qs.filter(q=>state.results[q.id]),correct=attempted.filter(q=>state.results[q.id].correct).length;
  let html=`<div class="section-top"><div><p class="kicker">Module 2 | Chapter 6</p><h1>${view==='mistakes'?'Câu hay sai':'Chapter 6 Potential Quiz'}</h1></div><a class="btn small secondary" href="${sourceUrl(1)}" target="_blank" rel="noopener">Mở PDF gốc</a></div><p>Câu hỏi, lựa chọn và đáp án giữ theo bản PDF. Thứ tự câu và các lựa chọn giữ như nguồn. Mỗi biến trong Pools 1 đến 5 được chấm ½ điểm.</p>`;
  if(view==='mistakes')html+='<p class="draft-notice">Giữ các câu từng làm sai, kể cả khi lần làm sau đã đúng.</p>';
  html+=`<div class="filters chapter6-filter"><label>Pool<select id="pool-filter" aria-label="Pool"><option value="all">All pools</option>${DATA.pools.map(pool=>`<option value="${pool.id}" ${state.pool===String(pool.id)?'selected':''}>${escape(pool.title.replace(/\n/g,' '))}</option>`).join('')}</select></label></div><p class="muted">${qs.length} câu | ${qs.reduce((n,q)=>n+(q.fields?.length||1),0)} phần trả lời | ${correct}/${qs.length} câu đúng trọn vẹn | ${points(attempted.reduce((n,q)=>n+state.results[q.id].points,0))}/${qs.reduce((n,q)=>n+q.pts,0)} điểm</p>`;
  let pool=null;
  for(const q of qs){if(q.pool!==pool){pool=q.pool;html+=`<h2 class="pool-heading">${escape(DATA.pools.find(p=>p.id===pool).title)}</h2>`;}html+=card(q,'review');}
  if(!qs.length)html+='<div class="empty">Chưa có câu phù hợp trong bộ đang chọn.</div>';
  app.innerHTML=html;
 }
 function source(){app.innerHTML=`<p class="kicker">Nguồn gốc | 9 trang</p><h1 class="source-document-title">${escape(DATA.title)}</h1><div class="source-controls"><a class="btn" href="${sourceUrl(1)}" target="_blank" rel="noopener">Đọc PDF gốc</a><a class="btn secondary" href="${encodeURI(DATA.source.url)}" download>Tải PDF gốc</a></div><section class="panel source-card"><h2>Hướng dẫn trong PDF</h2><div class="source-text">${escape(DATA.instructions)}</div></section><p>23 câu trong 6 pools. Pools 1 đến 5: 10 câu, 6 biến mỗi câu, ½ điểm mỗi biến. Pool 6: 13 MCQ, 1 điểm mỗi câu. Tổng ngân hàng: 43 điểm.</p><h2>Bản gốc theo từng trang</h2>${Array.from({length:DATA.source.pages},(_,i)=>`<details class="panel source-card"><summary>Trang gốc ${i+1}</summary><img class="source-image" src="${pageImage(i+1)}" alt="Trang ${i+1} trong PDF gốc" loading="lazy"></details>`).join('')}`;}
 function quizSetup(){
  const session=state.quiz;
  app.innerHTML=`<p class="kicker">Chapter 6</p><h1>Quiz 20 điểm</h1><div class="panel"><h2>30 phút, 20 điểm</h2><p>Bốc 1 câu từ mỗi pool trong Pools 1 đến 5 và 5 MCQ từ Pool 6. Chấm ½ điểm mỗi biến và 1 điểm mỗi MCQ.</p><p>Cách bốc này dùng để ôn tập; PDF chỉ quy định một tập con câu hỏi, không quy định số câu lấy từ từng pool. Giữ thứ tự nguồn của các câu được bốc và giữ nguyên thứ tự lựa chọn.</p><div class="actions">${session?`<button class="btn" data-resume>${session.submitted?'Xem bài đã nộp':'Tiếp tục bài đã lưu'}</button>`:''}<button class="btn ${session?'secondary':''}" data-start ${session&&!session.submitted?'disabled':''}>Bắt đầu bài mới</button></div></div>`;
 }
 function renderQuiz(){
  const session=state.quiz;if(!session){quizSetup();return;}
  const qs=session.ids.map(id=>byId.get(id));
  let html='<div class="section-top"><div><p class="kicker">Chapter 6 Quiz</p><h1>'+(session.submitted?'Kết quả đã lưu':'Quiz đang làm')+'</h1></div><button class="btn small secondary" data-view="quiz">Trang Quiz</button></div>';
  if(session.submitted)html+=`<section class="panel quiz-summary"><h2>${points(qs.reduce((n,q)=>n+session.results[q.id].points,0))}/20 điểm</h2><p>Mỗi phần trả lời được chấm riêng theo key PDF.</p></section>`;
  else html+='<p>30 phút cho toàn bài. Câu chưa trả lời được tính 0 điểm khi nộp.</p>';
  html+='<div class="question-jumps">'+qs.map(q=>`<button data-jump="${q.id}">Pool ${q.pool}, Q${q.number}</button>`).join('')+'</div>';
  let pool=null;
  for(const q of qs){if(q.pool!==pool){pool=q.pool;html+=`<h2 class="pool-heading">${escape(DATA.pools.find(p=>p.id===pool).title)}</h2>`;}html+=card(q,'quiz');}
  if(!session.submitted)html+='<button class="btn" data-submit>Nộp bài</button>';
  app.innerHTML=html;
 }
 function show(next){
  view=next;
  document.querySelectorAll('nav button').forEach(button=>button.classList.toggle('active',button.dataset.view===(view==='session'?'quiz':view)));
  if(view==='source')source();else if(view==='quiz')quizSetup();else if(view==='session')renderQuiz();else review();
  location.hash=view;
  document.getElementById('clock').hidden=!(view==='session'&&state.quiz&&!state.quiz.submitted);
 }
 function record(q,result){const history=state.history[q.id]||{attempts:0,wrong:0};state.history[q.id]={attempts:history.attempts+1,wrong:history.wrong+(result.correct?0:1)};}
 function start(){if(state.quiz&&!state.quiz.submitted)return;state.quiz={ids:Chapter6Core.draw(questions),answers:{},results:{},deadline:Date.now()+1800000,submitted:false};save();show('session');startClock();window.scrollTo(0,0);}
 async function submit(expired=false){
  const session=state.quiz;if(!session||session.submitted)return;
  if(!expired){const dialog=document.getElementById('confirm-dialog');const approved=await new Promise(resolve=>{dialog.addEventListener('close',()=>resolve(dialog.returnValue==='ok'),{once:true});dialog.showModal();});if(!approved||session!==state.quiz||session.submitted)return;}
  else{const dialog=document.getElementById('confirm-dialog');if(dialog.open)dialog.close('cancel');}
  for(const id of session.ids){const q=byId.get(id),answer=session.answers[id],result=Chapter6Core.grade(q,answer);session.results[id]=result;state.results[id]=result;state.answers[id]=Array.isArray(answer)?answer.slice():answer??null;record(q,result);}
  session.submitted=true;save();clearInterval(tick);document.getElementById('clock').hidden=true;show('session');window.scrollTo(0,0);
 }
 function startClock(){clearInterval(tick);const update=()=>{const session=state.quiz;if(!session||session.submitted){clearInterval(tick);return;}const left=Math.max(0,Math.ceil((session.deadline-Date.now())/1000));document.getElementById('clock-time').textContent=Math.floor(left/60)+':'+String(left%60).padStart(2,'0');if(!left)submit(true);};update();if(state.quiz&&!state.quiz.submitted)tick=setInterval(update,1000);}
 function check(id){
  const q=byId.get(id);if(state.results[id])return;
  if(!Chapter6Core.answered(q,state.answers[id])){const el=document.getElementById('q-'+id);let warning=el.querySelector('.input-warning');if(!warning){warning=document.createElement('p');warning.className='warning input-warning';warning.setAttribute('role','alert');el.append(warning);}warning.textContent='Chọn đầy đủ đáp án trước khi Check answer.';return;}
  const result=Chapter6Core.grade(q,state.answers[id]);state.results[id]=result;record(q,result);save();show(view);
 }
 app.addEventListener('change',event=>{
  const el=event.target;if(el.id==='pool-filter'){state.pool=el.value;save();show(view);return;}
  const cardEl=el.closest('[data-q]');if(!cardEl)return;
  const id=cardEl.dataset.q,q=byId.get(id),answers=view==='session'?state.quiz.answers:state.answers;
  if((view==='session'&&state.quiz.submitted)||(view!=='session'&&state.results[id]))return;
  if(q.type==='mcq')answers[id]=Number(el.value);
  else{const a=Array.isArray(answers[id])?answers[id].slice():Array(q.fields.length).fill(null);a[Number(el.dataset.field)]=el.value===''?null:Number(el.value);answers[id]=a;}
  save();
 });
 app.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;const d=button.dataset;if(d.jump)document.getElementById('q-'+d.jump).scrollIntoView({behavior:'smooth',block:'start'});else if(d.view)show(d.view);else if(d.check)check(d.check);else if(d.retry){delete state.results[d.retry];save();show(view);}else if('start'in d)start();else if('resume'in d){show('session');startClock();}else if('submit'in d)submit();});
 document.querySelectorAll('nav button').forEach(button=>button.addEventListener('click',()=>show(button.dataset.view)));
 document.getElementById('submit-top').addEventListener('click',()=>submit());
 const initial=location.hash.slice(1);show(['review','mistakes','source','quiz','session'].includes(initial)?initial:'review');
 if(state.quiz&&!state.quiz.submitted)startClock();
}
