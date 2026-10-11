const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),core=require(path.join(root,'midterm.js'));
const bankCode=fs.readFileSync(path.join(root,'midterm-data.js'),'utf8');
const main=fs.readFileSync(path.join(root,'midterm.js'),'utf8');
const storage=new Map();
function load(hash='#ai'){
 const nodes=new Map();
 function node(id){if(!nodes.has(id))nodes.set(id,{id,innerHTML:'',hidden:false,handlers:{},classList:{toggle(){}},addEventListener(name,fn){this.handlers[name]=fn;},querySelectorAll(){return [];}});return nodes.get(id);}
 const ctx=vm.createContext({window:{addEventListener(){},scrollTo(){}},document:{getElementById:node,querySelectorAll(){return [];}},location:{hash},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},console,setInterval(){return 1;},clearInterval(){}});
 vm.runInContext(bankCode,ctx);
 const last=main.lastIndexOf('}');
 vm.runInContext(main.slice(0,last)+'globalThis.testAPI={selectQuestions,record,getFilter:()=>filter};'+main.slice(last),ctx);
 return {api:ctx.testAPI,bank:ctx.window.MIDTERM_DATA.bank,node};
}
let model=load();
const bank=JSON.parse(JSON.stringify(model.bank)),byId=new Map(bank.map(q=>[q.id,q]));
const ai=bank.filter(q=>q.category==='ai'),added=ai.filter(q=>q.id.startsWith('m1_ai_cc_'));
assert.equal(ai.length,90);assert.equal(added.length,60);assert.equal(byId.size,bank.length);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'midterm-assets/Extended AI/Concept Checks.json'),'utf8'));
for(const [chapter,expected] of [[1,10],[2,10],[3,10],[4,15],[5,15]]){
 const qs=added.filter(q=>q.chapters.includes(chapter));assert.equal(qs.length,expected);
 assert.equal(core.filterQuestions(ai,{chapter:String(chapter),aiKind:'concept'}).filter(q=>q.id.startsWith('m1_ai_cc_')).length,expected);
 for(const [i,q] of qs.entries()){
  assert.equal(q.type,'mcq');assert.equal(q.opts.length,4);assert.equal(new Set(q.opts).size,4);
  assert.equal(q.opts[q.ans],manifest.chapters[chapter][i].correct,q.id);
  assert.equal(q.sim,false);assert.equal(q.verified,'ai-checked');assert(q.note.length>70);
  for(let choice=0;choice<4;choice++)assert.equal(core.grade(q,choice),choice===q.ans,q.id);
 }
}
assert.equal(core.filterQuestions(ai,{aiKind:'concept'}).length,76);
assert.equal(core.filterQuestions(ai,{aiKind:'calculations'}).length,14);
assert.equal(core.filterQuestions(ai,{aiKind:'all'}).length,90);
assert.equal(model.api.selectQuestions().length,76);
assert(model.api.selectQuestions().every(q=>q.type==='mcq'));
assert(model.node('app').innerHTML.includes('data-ai-chapter="5"'));
assert(model.node('app').innerHTML.includes('aria-label="Question focus"'));
model.node('app').handlers.click({target:{closest:()=>({dataset:{aiChapter:'4'}})}});
assert.equal(model.api.getFilter().chapter,'4');
assert(model.api.selectQuestions().every(q=>q.chapters.includes(4)));
model.node('app').handlers.change({target:{id:'ai-kind',value:'calculations'}});
assert(model.api.selectQuestions().every(q=>q.type==='fill'));
model=load();assert.equal(model.api.getFilter().chapter,'4');assert.equal(model.api.getFilter().aiKind,'calculations');
assert(model.api.selectQuestions().every(q=>q.type==='fill'));
model.node('app').handlers.change({target:{id:'ai-kind',value:'concept'}});
const q=model.api.selectQuestions()[0];model.api.record(q,false,(q.ans+1)%4);
model=load('#mistakes');assert(model.api.selectQuestions().some(x=>x.id===q.id));
for(let i=0;i<100;i++)assert(core.simulation(bank).every(x=>byId.get(x.id).category!=='ai'));
for(let i=1;i<=30;i++)assert(byId.has('m1_ai_'+i));
console.log('PASS: 60 pure concept checks, answer mappings, chapter navigation, concept/calculation filters, saved preferences, Mistakes and simulation exclusions.');
