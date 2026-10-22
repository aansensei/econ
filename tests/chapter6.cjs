const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),core=require(path.join(root,'chapter6.js'));
const dataCode=fs.readFileSync(path.join(root,'chapter6-data.js'),'utf8'),main=fs.readFileSync(path.join(root,'chapter6.js'),'utf8');
const audit=JSON.parse(fs.readFileSync(path.join(root,'chapter6-assets/source-audit.json'),'utf8'));
const storage=new Map([['econ302_stats','{"existing":{"attempts":2}}'],['econ302_midterm_session','{"existing":true}']]);
function load(hash='#review'){
 const nodes=new Map();
 function node(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',hidden:false,handlers:{},children:[],classList:{toggle(){}},addEventListener(name,fn){this.handlers[name]=fn;},querySelector(){return null;},append(child){this.children.push(child);},setAttribute(){},scrollIntoView(){},showModal(){this.open=true;},close(value){this.returnValue=value;this.open=false;this.handlers.close?.();}});return nodes.get(id);}
 const context=vm.createContext({window:{scrollTo(){}},document:{getElementById:node,querySelectorAll(){return [];},createElement(){return node('warning');}},location:{hash},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setInterval(){return 1;},clearInterval(){},console});
 vm.runInContext(dataCode,context);const end=main.lastIndexOf('}');
 vm.runInContext(main.slice(0,end)+'globalThis.testAPI={selectedQuestions,show,check,start,submit,card,getState:()=>state};'+main.slice(end),context);
 return {api:context.testAPI,data:JSON.parse(JSON.stringify(context.window.CHAPTER6_DATA)),node,location:context.location};
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
const shock=shocks[0],state=model.api.getState();state.answers[shock.id]=shock.fields.map(f=>f.ans);state.answers[shock.id][0]=(shock.fields[0].ans+1)%4;
model.api.check(shock.id);assert.equal(state.results[shock.id].points,2.5);assert(model.node('app').innerHTML.includes('Đúng một phần: 2.5/3 điểm'));assert.equal(state.history[shock.id].wrong,1);
model.api.check(shock.id);assert.equal(state.history[shock.id].attempts,1);
model=load('#mistakes');assert.equal(model.api.selectedQuestions().length,1);assert.equal(model.api.getState().results[shock.id].points,2.5);
delete model.api.getState().results[shock.id];model.api.getState().answers[shock.id]=shock.fields.map(f=>f.ans);model.api.check(shock.id);assert.equal(model.api.getState().history[shock.id].wrong,1);assert.equal(model.api.selectedQuestions().length,1);
model.node('app').handlers.change({target:{id:'pool-filter',value:'6'}});model=load();assert.equal(model.api.selectedQuestions().length,13);
model.api.show('source');assert(model.node('app').innerHTML.includes('The remining 50%'));assert(model.node('app').innerHTML.includes('43 điểm'));
model.api.start();const quiz=model.api.getState().quiz;assert(Math.abs(quiz.deadline-Date.now()-1800000)<5000);const ids=Array.from(quiz.ids);model.api.start();assert.deepEqual(Array.from(model.api.getState().quiz.ids),ids);
for(const id of quiz.ids){const q=questions.find(q=>q.id===id);quiz.answers[id]=q.type==='mcq'?q.ans:q.fields.map(f=>f.ans);}
(async()=>{
 await model.api.submit(true);assert.equal(quiz.submitted,true);assert.equal(Object.values(quiz.results).reduce((n,r)=>n+r.points,0),20);assert(model.node('app').innerHTML.includes('20/20 điểm'));
 for(const id of quiz.ids){assert.equal(model.api.getState().results[id].correct,true);assert.deepEqual(model.api.getState().answers[id],quiz.answers[id]);}
 const attempts=JSON.stringify(model.api.getState().history);await model.api.submit(true);assert.equal(JSON.stringify(model.api.getState().history),attempts);
 model=load('#session');assert(model.node('app').innerHTML.includes('20/20 điểm'));
 assert.equal(storage.get('econ302_stats'),'{"existing":{"attempts":2}}');assert.equal(storage.get('econ302_midterm_session'),'{"existing":true}');
 for(const file of ['index.html','Econ302_Ch1-4_Quiz_Study.html','midterm.html'])assert(fs.readFileSync(path.join(root,file),'utf8').includes('href="chapter6.html"'));
 console.log('PASS: full wording across all 9 pages, 60 bold-font keys, 13 MCQ keys, all partial-credit combinations, preserved source order, 20-point draw, 30-minute timer, saved progress, mistakes and legacy storage isolation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
