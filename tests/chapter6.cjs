const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),core=require(path.join(root,'chapter6.js'));
const dataCode=fs.readFileSync(path.join(root,'chapter6-data.js'),'utf8'),main=fs.readFileSync(path.join(root,'chapter6.js'),'utf8');
const audit=JSON.parse(fs.readFileSync(path.join(root,'chapter6-assets/source-audit.json'),'utf8'));
const storage=new Map([['econ302_stats','{"existing":{"attempts":2}}'],['econ302_midterm_session','{"existing":true}']]);
function load(hash='#review'){
 const nodes=new Map(),timers={cleared:[]};
 function node(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',hidden:false,handlers:{},children:[],classList:{toggle(){}},addEventListener(name,fn){this.handlers[name]=fn;},querySelector(){return null;},append(child){this.children.push(child);},setAttribute(){},scrollIntoView(){},showModal(){this.open=true;},close(value){this.returnValue=value;this.open=false;this.handlers.close?.();}});return nodes.get(id);}
 const context=vm.createContext({window:{scrollTo(){}},document:{getElementById:node,querySelectorAll(){return [];},createElement(){return node('warning');}},location:{hash},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setInterval(){return 1;},clearInterval:id=>timers.cleared.push(id),console});
 vm.runInContext(dataCode,context);const end=main.lastIndexOf('}');
 vm.runInContext(main.slice(0,end)+'globalThis.testAPI={selectedQuestions,show,check,start,submit,card,getState:()=>state};'+main.slice(end),context);
 return {api:context.testAPI,data:JSON.parse(JSON.stringify(context.window.CHAPTER6_DATA)),node,location:context.location,timers};
}
let model=load();const data=model.data,questions=data.questions,mcq=questions.filter(q=>q.type==='mcq'),shocks=questions.filter(q=>q.type==='shock');
assert.equal(data.source.sha256,'ddce070a20ba573860ed2efa0db939beb8551286df35ad6cadffb491dad58e38');
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,data.source.url))).digest('hex'),data.source.sha256);
assert.equal(data.source.pages,9);assert.equal(questions.length,23);assert.equal(new Set(questions.map(q=>q.id)).size,23);assert.equal(data.pools.length,6);
for(let page=1;page<=9;page++)assert(fs.existsSync(path.join(root,'chapter6-assets/source-pages/page-'+page+'.png')));
assert.equal(shocks.length,10);assert.equal(mcq.length,13);assert.equal(questions.reduce((n,q)=>n+q.pts,0),43);
assert.deepEqual(questions.map(q=>q.id),audit.questionIds);assert.deepEqual(shocks.map(q=>q.fields.map(f=>f.ans)),audit.shockKeys);assert.deepEqual(mcq.map(q=>q.ans),[0,2,0,1,0,3,1,1,2,3,0,3,3]);
const normalize=text=>text.replace(/\s+/g,'');
assert.equal(normalize(data.title+'\n'+data.instructions),normalize(audit.pages[0].text));assert(data.instructions.includes('The remining 50%'));
for(const page of audit.pages.slice(1)){
 const heading=data.pools.find(p=>p.page===page.number)?.title||'';
 const text=heading+'\n'+questions.filter(q=>q.page===page.number).map(q=>q.originalText+(q.type==='mcq'?'\n'+q.keyText:'')).join('\n');
 assert.equal(normalize(text),normalize(page.text),'Full source page '+page.number);
}
for(const q of questions){
 const sourceText=q.number+'. '+q.stem+'\n'+(q.type==='shock'?q.fields.map(f=>f.sourceLine).join('\n'):q.opts.map((o,i)=>String.fromCharCode(65+i)+'. '+o).join('\n'));
 assert.equal(sourceText,q.originalText,q.id);
 if(q.type==='mcq'){
  assert.equal(q.opts.length,4);assert.equal(q.keyText,'Answer: '+String.fromCharCode(65+q.ans));
  for(let answer=0;answer<4;answer++)assert.equal(core.grade(q,answer).points,answer===q.ans?1:0);
 }else{
  assert.equal(q.fields.length,6);
  for(const f of q.fields){assert.deepEqual(f.opts,['increase','decrease','stay the same','change ambiguously']);assert.equal(f.sourceLine,f.label+'['+f.opts.join('/')+']');assert.equal(f.keyEvidence.text,f.opts[f.ans]);assert(f.keyEvidence.fonts.every(font=>font.includes('BoldItalic')));}
  for(let mask=0;mask<64;mask++){
   const answer=q.fields.map((f,i)=>(mask>>i)&1?f.ans:(f.ans+1)%4),correct=answer.filter((a,i)=>a===q.fields[i].ans).length;
   assert.equal(core.grade(q,answer).points,correct*.5);assert.equal(core.grade(q,answer).correct,correct===6);
  }
 }
 assert.equal(core.grade(q,null).points,0);assert.equal(core.answered(q,null),false);
}
for(let trial=0;trial<100;trial++){
 const ids=core.draw(questions),items=questions.filter(q=>ids.includes(q.id));assert.equal(ids.length,10);assert.equal(new Set(ids).size,10);assert.deepEqual(ids,items.map(q=>q.id));assert.equal(items.reduce((n,q)=>n+q.pts,0),20);
 for(let pool=1;pool<=5;pool++)assert.equal(items.filter(q=>q.pool===pool).length,1);assert.equal(items.filter(q=>q.pool===6).length,5);
}
assert(model.node('app').innerHTML.includes('23 câu | 73 phần trả lời'));assert(model.node('app').innerHTML.includes('43 điểm'));
assert(model.node('app').innerHTML.indexOf('Pool 1, Question 1')<model.node('app').innerHTML.indexOf('Pool 1, Question 2'));
const homeModel=load('');assert.equal(homeModel.location.hash,'home');
assert(homeModel.node('app').innerHTML.includes('Ch 6 Potential Quiz'));
for(const label of ['Gradeable Questions','Attempted','Accuracy','Mastered (Last ✓)','Review Mode','Quiz Mode','Review Mistakes','Original PDF'])assert(homeModel.node('app').innerHTML.includes(label));
assert(homeModel.node('app').innerHTML.includes('id="s-total">23</div>'));
const shock=shocks[0],state=model.api.getState();state.answers[shock.id]=shock.fields.map(f=>f.ans);state.answers[shock.id][0]=(shock.fields[0].ans+1)%4;
model.api.check(shock.id);assert.equal(state.results[shock.id].points,2.5);assert(model.node('app').innerHTML.includes('Đúng một phần: 2.5/3 điểm'));assert.equal(state.history[shock.id].wrong,1);
model.api.check(shock.id);assert.equal(state.history[shock.id].attempts,1);
model=load('#mistakes');assert.equal(model.api.selectedQuestions().length,1);assert.equal(model.api.getState().results[shock.id].points,2.5);
delete model.api.getState().results[shock.id];model.api.getState().answers[shock.id]=shock.fields.map(f=>f.ans);model.api.check(shock.id);assert.equal(model.api.getState().history[shock.id].wrong,1);assert.equal(model.api.selectedQuestions().length,1);
model.api.show('home');
for(const value of ['s-attempted">1','s-pct">50%','s-mastered">1'])assert(model.node('app').innerHTML.includes(value));
model.node('app').handlers.change({target:{id:'pool-filter',value:'6'}});model=load();assert.equal(model.api.selectedQuestions().length,13);
model.api.show('source');assert(model.node('app').innerHTML.includes('The remining 50%'));assert(model.node('app').innerHTML.includes('43 điểm'));
model.api.start();const quiz=model.api.getState().quiz;assert(Math.abs(quiz.deadline-Date.now()-1800000)<5000);const ids=Array.from(quiz.ids);model.api.start();assert.deepEqual(Array.from(model.api.getState().quiz.ids),ids);
model.api.show('home');assert(model.node('app').innerHTML.includes('Resume Quiz'));assert.deepEqual(Array.from(model.api.getState().quiz.ids),ids);
const resumed=load('');assert(resumed.node('app').innerHTML.includes('Resume Quiz'));assert.deepEqual(Array.from(resumed.api.getState().quiz.ids),ids);
model.api.show('session');
for(const id of quiz.ids){const q=questions.find(q=>q.id===id);quiz.answers[id]=q.type==='mcq'?q.ans:q.fields.map(f=>f.ans);}
(async()=>{
 await model.api.submit(true);assert.equal(quiz.submitted,true);assert.equal(Object.values(quiz.results).reduce((n,r)=>n+r.points,0),20);assert(model.node('app').innerHTML.includes('20/20 điểm'));
 for(const id of quiz.ids){assert.equal(model.api.getState().results[id].correct,true);assert.deepEqual(model.api.getState().answers[id],quiz.answers[id]);}
 const attempts=JSON.stringify(model.api.getState().history);await model.api.submit(true);assert.equal(JSON.stringify(model.api.getState().history),attempts);
 model=load('#session');assert(model.node('app').innerHTML.includes('20/20 điểm'));
 model.api.show('home');assert(model.node('app').innerHTML.includes('View Last Quiz'));
 model.node('app').handlers.click({target:{closest(){return {dataset:{homeReview:''}};}}});assert.equal(model.api.getState().pool,'all');assert.equal(model.api.selectedQuestions().length,23);assert.equal(model.location.hash,'review');
 const html=fs.readFileSync(path.join(root,'chapter6.html'),'utf8');
 assert(html.includes('id="reset-progress"'));assert(html.includes('id="reset-dialog"'));assert(html.includes('value="cancel" autofocus'));
 model.api.start();const beforeReset=JSON.stringify(model.api.getState()),savedBeforeReset=storage.get('econ302_ch6_v1');
 const resetDialog=model.node('reset-dialog');
 let resetting=model.node('reset-progress').handlers.click();assert.equal(resetDialog.open,true);
 await model.node('reset-progress').handlers.click();assert.equal(JSON.stringify(model.api.getState()),beforeReset);
 resetDialog.close('cancel');await resetting;
 assert.equal(JSON.stringify(model.api.getState()),beforeReset);assert.equal(storage.get('econ302_ch6_v1'),savedBeforeReset);
 resetting=model.node('reset-progress').handlers.click();assert.equal(resetDialog.returnValue,'cancel');resetDialog.close('');await resetting;
 assert.equal(JSON.stringify(model.api.getState()),beforeReset);
 const clearedBefore=model.timers.cleared.length;
 resetting=model.node('reset-progress').handlers.click();resetDialog.close('ok');await resetting;
 assert(model.timers.cleared.length>clearedBefore);assert.equal(model.node('clock').hidden,true);assert.equal(model.location.hash,'home');
 const emptyState={answers:{},results:{},history:{},pool:'all',quiz:null};
 assert.deepEqual(JSON.parse(storage.get('econ302_ch6_v1')),emptyState);
 model=load('#review');assert.deepEqual(JSON.parse(JSON.stringify(model.api.getState())),emptyState);
 assert(model.node('app').innerHTML.includes('0/23 câu đúng trọn vẹn'));assert(!model.node('app').innerHTML.includes('class="feedback'));
 model.api.getState().answers[shock.id]=shock.fields.map(f=>f.ans);model.api.check(shock.id);
 resetting=model.node('reset-progress').handlers.click();model.node('reset-dialog').close('ok');await resetting;
 assert.equal(model.location.hash,'review');assert(model.node('app').innerHTML.includes('0/23 câu đúng trọn vẹn'));
 model.api.show('mistakes');assert.equal(model.api.selectedQuestions().length,0);
 model.api.show('review');
 model.api.getState().answers[shock.id]=shock.fields.map(f=>f.ans);model.api.getState().answers[shock.id][0]=(shock.fields[0].ans+1)%4;model.api.check(shock.id);
 model.api.getState().answers[mcq[0].id]=mcq[0].ans;model.api.check(mcq[0].id);
 model.api.start();model.api.getState().quiz.answers[model.api.getState().quiz.ids[0]]=null;
 model.api.getState().answers[mcq[1].id]=mcq[1].ans;model.api.show('review');
 model.node('app').handlers.change({target:{id:'pool-filter',value:'6'}});
 assert(model.node('app').innerHTML.includes('data-refresh>Refresh ↺'));
 const clickRefresh=()=>model.node('app').handlers.click({target:{closest(){return {dataset:{refresh:''}};}}});
 const beforeRefresh=JSON.stringify(model.api.getState()),savedBeforeRefresh=storage.get('econ302_ch6_v1');
 const historyBeforeRefresh=JSON.stringify(model.api.getState().history),quizBeforeRefresh=JSON.stringify(model.api.getState().quiz);
 let refreshing=clickRefresh();assert.equal(model.node('refresh-dialog').open,true);
 assert(model.node('refresh-description').textContent.includes('13 câu Review trong Pool 6'));
 await clickRefresh();model.node('refresh-dialog').close('cancel');await refreshing;
 assert.equal(JSON.stringify(model.api.getState()),beforeRefresh);assert.equal(storage.get('econ302_ch6_v1'),savedBeforeRefresh);
 refreshing=clickRefresh();assert.equal(model.node('refresh-dialog').returnValue,'cancel');model.node('refresh-dialog').close('');await refreshing;
 assert.equal(JSON.stringify(model.api.getState()),beforeRefresh);
 refreshing=clickRefresh();model.node('refresh-dialog').close('ok');await refreshing;
 for(const q of mcq){assert.equal(model.api.getState().answers[q.id],undefined);assert.equal(model.api.getState().results[q.id],undefined);}
 assert.equal(model.api.getState().results[shock.id].points,2.5);assert.equal(model.api.getState().pool,'6');assert.equal(model.location.hash,'review');
 assert.equal(JSON.stringify(model.api.getState().history),historyBeforeRefresh);assert.equal(JSON.stringify(model.api.getState().quiz),quizBeforeRefresh);
 assert(model.node('app').innerHTML.includes('0/13 câu đúng trọn vẹn'));
 model=load('#review');assert.equal(model.api.getState().pool,'6');assert.equal(model.api.getState().answers[mcq[1].id],undefined);
 assert.equal(JSON.stringify(model.api.getState().history),historyBeforeRefresh);assert.equal(JSON.stringify(model.api.getState().quiz),quizBeforeRefresh);
 for(const next of ['home','mistakes','source','quiz','session']){model.api.show(next);assert(!model.node('app').innerHTML.includes('data-refresh'));await clickRefresh();assert.equal(model.node('refresh-dialog').open,undefined);}
 model.api.getState().pool='all';model.api.show('review');
 refreshing=clickRefresh();assert(model.node('refresh-description').textContent.includes('23 câu Review trong All pools'));model.node('refresh-dialog').close('ok');await refreshing;
 assert.equal(Object.keys(model.api.getState().answers).length,0);assert.equal(Object.keys(model.api.getState().results).length,0);
 assert.equal(JSON.stringify(model.api.getState().history),historyBeforeRefresh);assert.equal(JSON.stringify(model.api.getState().quiz),quizBeforeRefresh);
 model.api.show('mistakes');assert.equal(model.api.selectedQuestions().length,1);
 await model.api.submit(true);const submittedQuiz=JSON.stringify(model.api.getState().quiz),submittedHistory=JSON.stringify(model.api.getState().history);
 model.api.show('review');refreshing=clickRefresh();model.node('refresh-dialog').close('ok');await refreshing;
 assert.equal(Object.keys(model.api.getState().results).length,0);assert.equal(JSON.stringify(model.api.getState().quiz),submittedQuiz);assert.equal(JSON.stringify(model.api.getState().history),submittedHistory);
 assert.equal(storage.get('econ302_stats'),'{"existing":{"attempts":2}}');assert.equal(storage.get('econ302_midterm_session'),'{"existing":true}');
 for(const file of ['index.html','Econ302_Ch1-4_Quiz_Study.html','midterm.html'])assert(fs.readFileSync(path.join(root,file),'utf8').includes('href="chapter6.html"'));
 console.log('PASS: source wording and keys, grading, quiz/timer/storage, reset, Review-only refresh confirmation/cancel/dismiss/reload, pool isolation, preserved mistake history and active/submitted quizzes.');
})().catch(error=>{console.error(error);process.exitCode=1;});
