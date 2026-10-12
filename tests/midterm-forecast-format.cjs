const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),core=require(path.join(root,'midterm.js'));
const main=fs.readFileSync(path.join(root,'midterm.js'),'utf8'),bankCode=fs.readFileSync(path.join(root,'midterm-data.js'),'utf8');
const storage=new Map();
function load(hash='#library'){
 const nodes=new Map();
 function node(id){if(!nodes.has(id))nodes.set(id,{id,innerHTML:'',hidden:false,handlers:{},classList:{toggle(){}},addEventListener(name,fn){this.handlers[name]=fn;},querySelectorAll(){return [];}});return nodes.get(id);}
 const ctx=vm.createContext({window:{addEventListener(){},scrollTo(){}},document:{getElementById:node,querySelectorAll(){return [];}},location:{hash},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},console,setInterval(){return 1;},clearInterval(){}});
 vm.runInContext(bankCode,ctx);
 const last=main.lastIndexOf('}');
 vm.runInContext(main.slice(0,last)+'globalThis.testAPI={selectQuestions,record,card,start,submit,getSession:()=>session,getFilter:()=>filter};'+main.slice(last),ctx);
 return {api:ctx.testAPI,bank:JSON.parse(JSON.stringify(ctx.window.MIDTERM_DATA.bank)),node};
}
(async()=>{
 let m=load();const bank=m.bank,byId=new Map(bank.map(q=>[q.id,q]));
 assert.equal(byId.size,bank.length);assert(bank.every(q=>['mcq','inline','fill'].includes(q.type)));
 const forecast=bank.filter(q=>q.category==='forecast');assert.equal(forecast.length,24);
 for(const q of forecast){
  assert.equal(q.type,'mcq');assert.equal(q.opts.length,4);assert.equal(new Set(q.opts).size,4);assert.equal(q.sim,false);
  assert(q.note.length>70);for(const s of q.dataSources)assert(fs.existsSync(path.join(root,s.url)));
  let correct;
  if(q.actual!==undefined){const truth=q.target==='level'?q.prediction>q.actual:Math.abs(q.prediction-q.base)>Math.abs(q.actual-q.base);correct=truth?'Overestimate':'Underestimate';}
  else if(q.target==='level'&&q.horizon==='short')correct=q.wageDirection==='up'?'Underestimate':'Overestimate';
  else if(q.horizon==='short'&&['increase','decrease'].includes(q.target))correct='Underestimate';
  else if(q.target==='level'&&q.horizon==='long')correct=q.wageDirection==='up'?'Overestimate':'Underestimate';
  else if(q.horizon==='long'&&['increase','decrease'].includes(q.target))correct='Overestimate';
  if(correct)assert.equal(q.opts[q.ans],correct,q.id);
  for(let a=0;a<4;a++)assert.equal(core.grade(q,a),a===q.ans,q.id);
 }
 m.node('app').handlers.change({target:{id:'category',value:'forecast'}});
 assert.equal(m.api.selectQuestions().length,24);assert(m.node('app').innerHTML.includes('Forecasting Practice'));
 m=load();assert.equal(m.api.getFilter().category,'forecast');assert.equal(m.api.selectQuestions().length,24);
 m.node('app').handlers.change({target:{id:'chapter',value:'4'}});assert.equal(m.api.selectQuestions().length,24);
 m.node('app').handlers.change({target:{id:'chapter',value:'5'}});assert.equal(m.api.selectQuestions().length,0);
 const adapted=byId.get('m1_s17sa_8');const card=m.api.card(adapted,0,'review',null,null);
 assert(card.includes('More is preferred to less: ICs slope down'));assert(card.includes('Đề gốc để đối chiếu'));assert(!card.includes('textarea'));
 const numeric=bank.filter(q=>q.category==='numeric');assert.equal(numeric.length,6);
 const answers={m1_numeric_log_leisure:6.4,m1_numeric_log_labor:9.6,m1_numeric_log_consumption:96,m1_numeric_ql_leisure:3,m1_numeric_ql_labor:13,m1_numeric_ql_consumption:52};
 for(const q of numeric){assert.equal(Number(q.answer),answers[q.id]);assert(core.grade(q,String(answers[q.id])));assert(!core.grade(q,String(answers[q.id]+1)));assert(!core.grade(q,'show my work'));}
 for(let i=0;i<100;i++){
  const draw=core.simulation(bank);assert.equal(draw.reduce((s,x)=>s+x.pts,0),50);assert.equal(new Set(draw.map(x=>x.id)).size,draw.length);
  assert.equal(draw.filter(x=>byId.get(x.id).category==='numeric').reduce((s,x)=>s+x.pts,0),6);
  assert.equal(draw.filter(x=>byId.get(x.id).category==='potential').reduce((s,x)=>s+x.pts,0),25);
  assert(draw.every(x=>byId.get(x.id).category!=='forecast'&&byId.get(x.id).category!=='ai'&&byId.get(x.id).type!=='open'));
 }
 storage.clear();storage.set('econ302_midterm_review',JSON.stringify({m1_s17sa_8:{answer:'my explanation',result:{self:3}}}));storage.set('econ302_stats',JSON.stringify({m1_s17sa_8:{lastResult:'correct'}}));
 m=load();assert(JSON.parse(storage.get('econ302_adapted_open_archive')).m1_s17sa_8);assert(!JSON.parse(storage.get('econ302_stats')).m1_s17sa_8);
 storage.set('econ302_midterm_session',JSON.stringify({mode:'simulation',token:'old-written',items:[{id:'m1_s17sa_8',pts:3}],answers:{},results:{},flags:{},version:1,deadline:Date.now()+60000}));
 m=load();assert.equal(m.api.getSession(),null);assert(JSON.parse(storage.get('econ302_midterm_session_archive'))['old-written']);
 await m.api.start('simulation');const session=m.api.getSession();
 for(const x of session.items){const q=byId.get(x.id);session.answers[x.id]=q.type==='mcq'?q.ans:q.type==='inline'?q.blanks.map(b=>String(b.ans)):q.answer;}
 storage.set('econ302_midterm_session',JSON.stringify(session));await m.api.submit(true);
 assert.equal(session.items.reduce((s,x)=>s+(session.results[x.id].ok?x.pts:0),0),50);
 assert(m.node('app').innerHTML.includes('50/50 điểm'));assert(!m.node('app').innerHTML.includes('textarea'));assert(!m.node('app').innerHTML.includes('data-self'));
 m=load('#session');assert(m.api.getSession().submitted);assert(m.node('app').innerHTML.includes('50/50 điểm'));
 console.log('PASS: 24 forecasting MCQs, independent level/change checks, category persistence, original essay archive, numeric grading and automatic 50-point simulation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
