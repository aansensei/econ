'use strict';

const Chapter78Core=(()=>{
 const QUIZ_SIZE=20;
 function answered(q,answer){return Number.isInteger(answer)&&answer>=0&&answer<q.opts.length;}
 function grade(q,answer){
  const ok=Number.isInteger(answer)&&answer===q.ans;
  return {hits:[ok],correctParts:ok?1:0,totalParts:1,points:ok?q.pts:0,max:q.pts,correct:ok};
 }
 function shuffle(items,random=Math.random){
  const shuffled=items.slice();
  for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  return shuffled;
 }
 function draw(questions,random=Math.random){
  const selected=new Set(shuffle(questions.map(q=>q.id),random).slice(0,QUIZ_SIZE));
  return questions.filter(q=>selected.has(q.id)).map(q=>q.id);
 }
 return {answered,grade,draw,shuffle,QUIZ_SIZE};
})();
if(typeof module!=='undefined')module.exports=Chapter78Core;

if(typeof document!=='undefined'){
 const DATA=window.CHAPTER78_DATA,questions=DATA.questions,byId=new Map(questions.map(q=>[q.id,q]));
 const app=document.getElementById('app'),key='econ302_ch78_v1',total=questions.length,pages=DATA.source.pages;
 let state={answers:{},results:{},history:{},quiz:null},view='home',tick=null;
 try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&saved.answers&&saved.results&&saved.history)state={...state,...saved};}catch(error){}
 if(state.quiz&&(!Array.isArray(state.quiz.ids)||!state.quiz.ids.length||!state.quiz.ids.every(id=>byId.has(id))||!Number.isFinite(state.quiz.deadline)))state.quiz=null;
 const escape=text=>String(text??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const points=value=>Number.isInteger(value)?String(value):value.toFixed(1);
 const sourceUrl=page=>encodeURI(DATA.source.url)+'#page='+page;
 const pageImage=page=>'chapter78-assets/source-pages/page-'+page+'.png';
 function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch(error){document.getElementById('storage-warning').hidden=false;}}
 function home(){
  const histories=questions.map(q=>state.history[q.id]).filter(h=>h?.attempts>0);
  const attempts=histories.reduce((n,h)=>n+h.attempts,0),correct=histories.reduce((n,h)=>n+h.attempts-h.wrong,0);
  const mastered=questions.filter(q=>state.results[q.id]?.correct).length;
  const mistakes=questions.filter(q=>state.history[q.id]?.wrong>0).length;
  const session=state.quiz;
  app.innerHTML=`<section class="chapter-home" aria-labelledby="home-title"><h1 id="home-title">Econ 302 · Ch 7/8 Potential Quiz</h1><p class="home-subtitle">UW-Madison · Chapters 7 and 8 (Solow growth, Malthus, endogenous growth) · 30 minutes per quiz, 20-point quiz simulation</p><p class="home-note">${total} questions in 1 pool, 1 point each. Questions, choices and answer keys follow the original PDF. Your Chapter 7/8 progress is saved on this device.</p><div class="stat-grid" aria-label="Chapter 7/8 progress"><div class="stat-card"><div class="num" id="s-total">${total}</div><div class="lbl">Gradeable Questions</div></div><div class="stat-card"><div class="num" id="s-attempted">${histories.length}</div><div class="lbl">Attempted</div></div><div class="stat-card"><div class="num" id="s-pct">${attempts?Math.round(correct/attempts*100):0}%</div><div class="lbl">Accuracy</div></div><div class="stat-card"><div class="num" id="s-mastered">${mastered}</div><div class="lbl">Mastered (Last ✓)</div></div></div><p class="stats-note">Accuracy counts every checked attempt. Mastered means the latest attempt was correct.</p><div class="mode-cards"><section class="mode-card"><h2>📖 Review Mode</h2><p>All ${total} questions, in random order. Check answers and get instant feedback. Retry wrong answers.</p><button class="btn" data-home-review>Start Review</button></section><section class="mode-card"><h2>⏱ Quiz Mode</h2><p>30 minutes for a ${Chapter78Core.QUIZ_SIZE}-point practice quiz drawn from the pool. Submit for your score. Your quiz is saved as you work.</p><button class="btn" ${session?'data-resume':'data-view="quiz"'}>${session?(session.submitted?'View Last Quiz':'Resume Quiz'):'Start Quiz'}</button></section><section class="mode-card"><h2>❌ Review Mistakes</h2><p>${mistakes} questions previously missed. Practice them again and check each answer against the original key.</p><button class="btn" data-home-mistakes>View Mistakes</button></section><section class="mode-card"><h2>📄 Original PDF</h2><p>Read the full instructions and all ${pages} original pages. Questions, choices and answer keys follow the source PDF.</p><button class="btn" data-view="source">View Source</button></section></div></section>`;
 }
 function selectedQuestions(){
  const qs=questions.filter(q=>view!=='mistakes'||state.history[q.id]?.wrong>0);
  if(view!=='review')return qs;
  if(!Array.isArray(state.reviewOrder)||state.reviewOrder.length!==questions.length||new Set(state.reviewOrder).size!==questions.length||!state.reviewOrder.every(id=>byId.has(id))){
   state.reviewOrder=Chapter78Core.shuffle(questions.map(q=>q.id));save();
  }
  const selected=new Set(qs.map(q=>q.id));
  return state.reviewOrder.filter(id=>selected.has(id)).map(id=>byId.get(id));
 }
 function feedback(q,result){
  if(!result)return '';
  const status=result.correct?'correct':'incorrect';
  return `<div class="feedback ${status}" role="status"><strong>${result.correct?'Đúng':'Chưa đúng'}: ${points(result.points)}/${q.pts} điểm</strong><p class="source-text">${escape(q.keyText)}<br>${String.fromCharCode(65+q.ans)}. ${escape(q.opts[q.ans])}</p></div>`;
 }
 function card(q,mode){
  const quiz=mode==='quiz',session=state.quiz,answer=(quiz?session.answers:state.answers)[q.id];
  const result=quiz?(session.submitted?session.results[q.id]:null):state.results[q.id],locked=!!result;
  const status=result?(result.correct?'correct':'incorrect'):'';
  let html=`<article class="card ${status}" data-q="${q.id}" id="q-${q.id}"><div class="card-head"><span class="source-question-number">Question ${q.number}</span><span class="badge official">Official answer key</span><span>${q.pts} ${q.pts===1?'point':'points'}</span></div><div class="source-stem">${escape(q.stem)}</div>`;
  html+='<div class="choices">'+q.opts.map((option,i)=>`<label class="${result&&i===q.ans?'answer':result&&answer===i?'wrong':''}"><input type="radio" name="${q.id}" value="${i}" ${answer===i?'checked':''} ${locked?'disabled':''}><span>${String.fromCharCode(65+i)}. ${escape(option)}</span></label>`).join('')+'</div>';
  if(!quiz)html+=`<div class="actions"><button class="btn small ${result?'secondary':''}" ${result?'data-retry':'data-check'}="${q.id}">${result?'Làm lại':'Check answer'}</button></div>`;
  html+=feedback(q,result)+`<p class="source-controls"><a class="source-page-link" href="${sourceUrl(q.page)}" target="_blank" rel="noopener">PDF gốc, trang ${q.page}</a></p><details class="original-page"><summary>Xem nguyên trang gốc ${q.page}</summary><img class="source-image" src="${pageImage(q.page)}" alt="Trang ${q.page} trong PDF gốc" loading="lazy"></details></article>`;
  return html;
 }
 function review(){
  const qs=selectedQuestions(),attempted=qs.filter(q=>state.results[q.id]),correct=attempted.filter(q=>state.results[q.id].correct).length;
  let html=`<div class="section-top"><div><p class="kicker">Module 2 | Chapter 7/8</p><h1>${view==='mistakes'?'Câu hay sai':'Chapter 7/8 Potential Quiz'}</h1></div><div class="actions">${view==='review'?'<button class="btn small secondary" data-refresh>Refresh ↺</button>':''}<a class="btn small secondary" href="${sourceUrl(1)}" target="_blank" rel="noopener">Mở PDF gốc</a></div></div><p>${view==='review'?'Câu hỏi được trộn ngẫu nhiên. Lựa chọn và đáp án giữ theo PDF gốc.':'Câu hỏi, lựa chọn và đáp án giữ theo bản PDF. Thứ tự câu và các lựa chọn giữ như nguồn.'} Mỗi câu 1 điểm.</p>`;
  if(view==='mistakes')html+='<p class="draft-notice">Giữ các câu từng làm sai, kể cả khi lần làm sau đã đúng.</p>';
  html+=`<p class="muted">${qs.length} câu | ${correct}/${qs.length} câu đúng | ${points(attempted.reduce((n,q)=>n+state.results[q.id].points,0))}/${qs.reduce((n,q)=>n+q.pts,0)} điểm</p>`;
  for(const q of qs)html+=card(q,'review');
  if(!qs.length)html+='<div class="empty">Chưa có câu phù hợp trong bộ đang chọn.</div>';
  app.innerHTML=html;
 }
 function source(){app.innerHTML=`<p class="kicker">Nguồn gốc | ${pages} trang</p><h1 class="source-document-title">${escape(DATA.title)}</h1><div class="source-controls"><a class="btn" href="${sourceUrl(1)}" target="_blank" rel="noopener">Đọc PDF gốc</a><a class="btn secondary" href="${encodeURI(DATA.source.url)}" download>Tải PDF gốc</a></div><section class="panel source-card"><h2>Hướng dẫn trong PDF</h2><div class="source-text">${escape(DATA.instructions)}</div></section><p>${escape(DATA.poolNote)}. ${total} câu trong 1 pool, 1 điểm mỗi câu. Tổng ngân hàng: ${total} điểm.</p><h2>Bản gốc theo từng trang</h2>${Array.from({length:pages},(_,i)=>`<details class="panel source-card"><summary>Trang gốc ${i+1}</summary><img class="source-image" src="${pageImage(i+1)}" alt="Trang ${i+1} trong PDF gốc" loading="lazy"></details>`).join('')}`;}
 function quizSetup(){
  const session=state.quiz;
  app.innerHTML=`<p class="kicker">Chapter 7/8</p><h1>Quiz ${Chapter78Core.QUIZ_SIZE} điểm</h1><div class="panel"><h2>30 phút, ${Chapter78Core.QUIZ_SIZE} điểm</h2><p>Bốc ${Chapter78Core.QUIZ_SIZE} câu ngẫu nhiên từ pool, mỗi câu 1 điểm.</p><p>Cách bốc này dùng để ôn tập; PDF chỉ quy định một tập con câu hỏi. Giữ thứ tự nguồn của các câu được bốc và giữ nguyên thứ tự lựa chọn.</p><div class="actions">${session?`<button class="btn" data-resume>${session.submitted?'Xem bài đã nộp':'Tiếp tục bài đã lưu'}</button>`:''}<button class="btn ${session?'secondary':''}" data-start ${session&&!session.submitted?'disabled':''}>Bắt đầu bài mới</button></div></div>`;
 }
 function renderQuiz(){
  const session=state.quiz;if(!session){quizSetup();return;}
  const qs=session.ids.map(id=>byId.get(id));
  let html='<div class="section-top"><div><p class="kicker">Chapter 7/8 Quiz</p><h1>'+(session.submitted?'Kết quả đã lưu':'Quiz đang làm')+'</h1></div><button class="btn small secondary" data-view="quiz">Trang Quiz</button></div>';
  if(session.submitted)html+=`<section class="panel quiz-summary"><h2>${points(qs.reduce((n,q)=>n+session.results[q.id].points,0))}/${Chapter78Core.QUIZ_SIZE} điểm</h2><p>Mỗi câu được chấm theo key PDF.</p></section>`;
  else html+='<p>30 phút cho toàn bài. Câu chưa trả lời được tính 0 điểm khi nộp.</p>';
  html+='<div class="question-jumps">'+qs.map(q=>`<button data-jump="${q.id}">Q${q.number}</button>`).join('')+'</div>';
  for(const q of qs)html+=card(q,'quiz');
  if(!session.submitted)html+='<button class="btn" data-submit>Nộp bài</button>';
  app.innerHTML=html;
 }
 function show(next){
  view=next;
  app.classList.toggle('home-view',view==='home');
  document.querySelectorAll('nav button[data-view]').forEach(button=>button.classList.toggle('active',button.dataset.view===(view==='session'?'quiz':view)));
  if(view==='home')home();else if(view==='source')source();else if(view==='quiz')quizSetup();else if(view==='session')renderQuiz();else review();
  location.hash=view;
  document.getElementById('clock').hidden=!(view==='session'&&state.quiz&&!state.quiz.submitted);
 }
 function record(q,result){const history=state.history[q.id]||{attempts:0,wrong:0};state.history[q.id]={attempts:history.attempts+1,wrong:history.wrong+(result.correct?0:1)};}
 async function refreshReview(){
  if(view!=='review')return;
  const qs=selectedQuestions(),dialog=document.getElementById('refresh-dialog');if(!qs.length||dialog.open)return;
  document.getElementById('refresh-description').textContent=`Làm lại và trộn thứ tự ${qs.length} câu Review? Câu trả lời và điểm Review sẽ được xóa. Lịch sử câu sai và bài Quiz đã lưu được giữ lại.`;
  dialog.returnValue='cancel';
  const approved=await new Promise(resolve=>{dialog.addEventListener('close',()=>resolve(dialog.returnValue==='ok'),{once:true});dialog.showModal();});
  if(!approved||view!=='review')return;
  for(const q of qs){delete state.answers[q.id];delete state.results[q.id];}
  state.reviewOrder=Chapter78Core.shuffle(questions.map(q=>q.id));
  save();show('review');window.scrollTo(0,0);
 }
 async function resetProgress(){
  const dialog=document.getElementById('reset-dialog');if(dialog.open)return;
  dialog.returnValue='cancel';
  const approved=await new Promise(resolve=>{dialog.addEventListener('close',()=>resolve(dialog.returnValue==='ok'),{once:true});dialog.showModal();});
  if(!approved)return;
  clearInterval(tick);tick=null;
  const submitDialog=document.getElementById('confirm-dialog');if(submitDialog.open)submitDialog.close('cancel');
  state={answers:{},results:{},history:{},quiz:null};save();
  show(view==='session'?'home':view);window.scrollTo(0,0);
 }
 function start(){if(state.quiz&&!state.quiz.submitted)return;state.quiz={ids:Chapter78Core.draw(questions),answers:{},results:{},deadline:Date.now()+1800000,submitted:false};save();show('session');startClock();window.scrollTo(0,0);}
 async function submit(expired=false){
  const session=state.quiz;if(!session||session.submitted)return;
  if(!expired){const dialog=document.getElementById('confirm-dialog');const approved=await new Promise(resolve=>{dialog.addEventListener('close',()=>resolve(dialog.returnValue==='ok'),{once:true});dialog.showModal();});if(!approved||session!==state.quiz||session.submitted)return;}
  else{const dialog=document.getElementById('confirm-dialog');if(dialog.open)dialog.close('cancel');}
  for(const id of session.ids){const q=byId.get(id),answer=session.answers[id],result=Chapter78Core.grade(q,answer);session.results[id]=result;state.results[id]=result;state.answers[id]=answer??null;record(q,result);}
  session.submitted=true;save();clearInterval(tick);document.getElementById('clock').hidden=true;show('session');window.scrollTo(0,0);
 }
 function startClock(){clearInterval(tick);const update=()=>{const session=state.quiz;if(!session||session.submitted){clearInterval(tick);return;}const left=Math.max(0,Math.ceil((session.deadline-Date.now())/1000));document.getElementById('clock-time').textContent=Math.floor(left/60)+':'+String(left%60).padStart(2,'0');if(!left)submit(true);};update();if(state.quiz&&!state.quiz.submitted)tick=setInterval(update,1000);}
 function check(id){
  const q=byId.get(id);if(state.results[id])return;
  if(!Chapter78Core.answered(q,state.answers[id])){const el=document.getElementById('q-'+id);let warning=el.querySelector('.input-warning');if(!warning){warning=document.createElement('p');warning.className='warning input-warning';warning.setAttribute('role','alert');el.append(warning);}warning.textContent='Chọn đáp án trước khi Check answer.';return;}
  const result=Chapter78Core.grade(q,state.answers[id]);state.results[id]=result;record(q,result);save();show(view);
 }
 app.addEventListener('change',event=>{
  const el=event.target;
  const cardEl=el.closest&&el.closest('[data-q]');if(!cardEl)return;
  const id=cardEl.dataset.q,answers=view==='session'?state.quiz.answers:state.answers;
  if((view==='session'&&state.quiz.submitted)||(view!=='session'&&state.results[id]))return;
  answers[id]=Number(el.value);
  save();
 });
 app.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;const d=button.dataset;if(d.jump)document.getElementById('q-'+d.jump).scrollIntoView({behavior:'smooth',block:'start'});else if('homeReview'in d||'homeMistakes'in d){save();show('homeReview'in d?'review':'mistakes');}else if('refresh'in d)return refreshReview();else if(d.view)show(d.view);else if(d.check)check(d.check);else if(d.retry){delete state.results[d.retry];save();show(view);}else if('start'in d)start();else if('resume'in d){show('session');startClock();}else if('submit'in d)submit();});
 document.querySelectorAll('nav button[data-view]').forEach(button=>button.addEventListener('click',()=>show(button.dataset.view)));
 document.getElementById('reset-progress').addEventListener('click',resetProgress);
 document.getElementById('submit-top').addEventListener('click',()=>submit());
 const initial=location.hash.slice(1);show(['home','review','mistakes','source','quiz','session'].includes(initial)?initial:'home');
 if(state.quiz&&!state.quiz.submitted)startClock();
}
