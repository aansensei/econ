const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),core=require(path.join(root,'midterm.js'));
const main=fs.readFileSync(path.join(root,'midterm.js'),'utf8'),dataCode=fs.readFileSync(path.join(root,'midterm-data.js'),'utf8');
const storage=new Map();
function load(hash='#topics'){
 const nodes=new Map();
 function node(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',hidden:false,handlers:{},classList:{toggle(){}},addEventListener(name,fn){this.handlers[name]=fn;},querySelectorAll(){return [];}});return nodes.get(id);}
 const ctx=vm.createContext({window:{addEventListener(){},scrollTo(){}},document:{getElementById:node,querySelectorAll(){return [];}},location:{hash},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},console,setInterval(){return 1;},clearInterval(){}});
 vm.runInContext(dataCode,ctx);
 const end=main.lastIndexOf('}');
 vm.runInContext(main.slice(0,end)+'globalThis.testAPI={selectQuestions,record,card,getFilter:()=>filter};'+main.slice(end),ctx);
 return {api:ctx.testAPI,bank:JSON.parse(JSON.stringify(ctx.window.MIDTERM_DATA.bank)),node,location:ctx.location};
}
let model=load();const bank=model.bank,byId=new Map(bank.map(q=>[q.id,q]));
const topic=bank.filter(q=>q.topics?.includes('ic-ppf')),added=topic.filter(q=>q.category==='topic');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'midterm-assets/Topic Practice/IC and PPF.json'),'utf8'));
assert.equal(topic.length,20);assert.equal(added.length,12);assert.equal(byId.size,bank.length);
assert.deepEqual(added,manifest.questions);
assert.deepEqual(Array.from(model.api.selectQuestions(),q=>q.id),[...manifest.existingQuestionIds,...added.map(q=>q.id)]);
assert.deepEqual(manifest.existingQuestionIds.slice(0,5),['p2_3','p2_4','p2_5','p2_7','m1_s17_12']);
assert.deepEqual(manifest.existingQuestionIds.slice(0,5).map(id=>byId.get(id).ans),[1,2,2,2,1]);
for(const [i,q] of added.entries()){
 assert.equal(q.type,'mcq');assert.equal(q.source,'ic-ppf-practice');assert.equal(q.verified,'ai-checked');assert.equal(q.sim,false);
 assert.equal(q.topicOrder,i+8);assert.equal(q.opts.length,4);assert.equal(new Set(q.opts).size,4);
 assert.equal(bank.filter(x=>x.stem===q.stem).length,1,q.id);
 for(const ref of q.dataSources){assert(fs.existsSync(path.join(root,ref.url)));if(ref.page)assert(Number.isInteger(ref.page)&&ref.page>0);}
 for(let a=0;a<4;a++)assert.equal(core.grade(q,a),a===q.ans,q.id);
}
assert.deepEqual([0,1,2,3].map(a=>added.filter(q=>q.ans===a).length),[3,3,3,3]);
const q=n=>byId.get('m1_icppf_'+String(n).padStart(2,'0')),answer=n=>q(n).opts[q(n).ans];
assert(answer(1).includes('diminishing MRS'));assert(answer(1).includes('diminishing MPN'));
assert(answer(2).includes('MRS falls'));assert(answer(2).includes('flatter'));
const production=n=>Math.sqrt(n),mpn=n=>1/(2*Math.sqrt(n)),consumption=l=>production(16-l)-1;
assert(mpn(4)>mpn(9));assert(consumption(12)<consumption(7));assert(answer(3).includes('Labor falls, MPN rises'));
assert.equal(answer(4),`IC slope = ${-q(4).mrs}; physical PPF slope = ${-q(4).mpn}.`);
const linearPpf=l=>3*(16-l)-2;assert.equal(linearPpf(5)-linearPpf(4),linearPpf(6)-linearPpf(5));assert(answer(5).includes('straight line'));
assert(production(10)>production(9));assert(production(10)-production(9)<production(9)-production(8));assert(answer(6).includes('Total output rises'));
assert(answer(7).includes('PPF concavity comes from diminishing MPN'));assert(answer(8).includes('normal goods'));assert(answer(9).includes('physical PPF does not change'));
assert(Math.abs(q(10).initialSlope)>Math.abs(q(10).newSlope));assert(answer(10).includes('falls from 6 to 2'));assert(answer(10).includes('flatter'));
assert(Math.abs(q(11).initialSlope)<Math.abs(q(11).newSlope));assert(answer(11).includes('rises from 2 to 6'));assert(answer(11).includes('labor falls'));
assert(answer(12).includes('cannot all have the same utility'));
assert(model.node('app').innerHTML.includes('<h1>Luyện theo chủ đề</h1>'));assert(model.node('app').innerHTML.includes('20 cards'));
const html=fs.readFileSync(path.join(root,'midterm.html'),'utf8');assert(html.includes('data-view="topics"'));assert(html.includes('20261012.2'));
model.node('app').handlers.change({target:{id:'category',value:'topic'}});assert.equal(model.api.selectQuestions().length,12);assert.equal(model.location.hash,'topics');
model=load();assert.equal(model.api.getFilter().category,'topic');assert.equal(model.api.selectQuestions().length,12);
model.node('app').handlers.change({target:{id:'source',value:'ic-ppf-practice'}});assert.equal(model.location.hash,'topics');assert.equal(model.api.selectQuestions().length,12);
model.node('app').handlers.change({target:{id:'chapter',value:'5'}});assert.equal(model.api.selectQuestions().length,added.filter(q=>q.chapters.includes(5)).length);
storage.clear();model=load();const original=model.api.selectQuestions()[0];model.api.record(original,false,(original.ans+1)%4);model.api.record(original,true,original.ans);
model=load('#mistakes');assert(model.api.selectQuestions().some(q=>q.id===original.id));
assert.equal(JSON.parse(storage.get('econ302_weak_history'))[original.id].wrong,1);
assert(model.api.card(q(4),0,'review',q(4).ans,{ok:true}).includes('class="answer"'));
storage.clear();model=load('#home');assert(model.node('app').innerHTML.includes('data-browse="topic"'));assert(model.node('app').innerHTML.includes('20 cards | 0/20 objective correct'));
model.node('app').handlers.click({target:{closest:()=>({dataset:{browse:'topic'}})}});assert.equal(model.location.hash,'topics');assert.equal(model.api.selectQuestions().length,20);
for(let i=0;i<50;i++)assert(core.simulation(bank).every(x=>byId.get(x.id).category!=='topic'));
console.log('PASS: 20-topic drill, 12 sourced MCQs, original answer keys, independent slope/curvature reasoning, filters, saved preferences, shared progress and grading.');
