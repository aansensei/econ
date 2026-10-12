const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),core=require(path.join(root,'midterm.js'));
const main=fs.readFileSync(path.join(root,'midterm.js'),'utf8'),dataCode=fs.readFileSync(path.join(root,'midterm-data.js'),'utf8');
const storage=new Map();
function load(hash='#library'){
 const nodes=new Map();
 function node(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',hidden:false,handlers:{},classList:{toggle(){}},addEventListener(name,fn){this.handlers[name]=fn;},querySelectorAll(){return [];}});return nodes.get(id);}
 const ctx=vm.createContext({window:{addEventListener(){},scrollTo(){}},document:{getElementById:node,querySelectorAll(){return [];}},location:{hash},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},console,setInterval(){return 1;},clearInterval(){}});
 vm.runInContext(dataCode,ctx);
 const end=main.lastIndexOf('}');
 vm.runInContext(main.slice(0,end)+'globalThis.testAPI={selectQuestions,record,getFilter:()=>filter};'+main.slice(end),ctx);
 return {api:ctx.testAPI,bank:JSON.parse(JSON.stringify(ctx.window.MIDTERM_DATA.bank)),node};
}
let model=load();const bank=model.bank,byId=new Map(bank.map(q=>[q.id,q]));
const lecture=bank.filter(q=>q.category==='lecture');assert.equal(lecture.length,24);assert.equal(byId.size,bank.length);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'midterm-assets/Lecture Material/Questions.json'),'utf8'));
assert.deepEqual(lecture,manifest.questions);
for(const [chapter,count] of [[3,6],[4,10],[5,8]])assert.equal(core.filterQuestions(lecture,{chapter:String(chapter)}).length,count);
for(const q of lecture){
 assert.equal(q.type,'mcq');assert.equal(q.source,'lecture-material');assert.equal(q.studyKind,'lecture-material');assert.equal(q.verified,'ai-checked');assert.equal(q.sim,false);
 assert.equal(q.opts.length,4);assert.equal(new Set(q.opts).size,4);assert(q.note.length>80);assert(q.tag.startsWith('Lecture Material:'));
 assert.equal(bank.filter(x=>x.stem===q.stem).length,1,q.id);
 for(const ref of q.dataSources){assert(ref.url.startsWith('midterm-assets/Lecture References/'));assert(fs.existsSync(path.join(root,ref.url)));if(ref.page)assert(Number.isInteger(ref.page)&&ref.page>0);}
 for(let a=0;a<4;a++)assert.equal(core.grade(q,a),a===q.ans,q.id);
}
assert.deepEqual([0,1,2,3].map(answer=>lecture.filter(q=>q.ans===answer).length),[6,6,6,6]);
const keyed=kind=>lecture.find(q=>q.checkKind===kind);
const correct=kind=>keyed(kind).opts[keyed(kind).ans];
assert(correct('scale').includes('GDP doubles'));assert(Math.abs((2**.6*2**.4)/2-1)<1e-12);
assert(2**keyed('single-input').laborExponent>1&&2**keyed('single-input').laborExponent<2);assert(correct('single-input').includes('marginal product of labor falls'));
assert(100/(10**.6*8**.4)>100/(10**.6*10**.4));assert(correct('residual').includes('too high'));
assert.equal(keyed('time').initialTime/2,8);assert.equal(keyed('time').newTime/2,10);assert(correct('time').includes('hours worked also rise'));
assert(keyed('mrs').mrs<keyed('mrs').wage);assert(correct('mrs').startsWith('Work a little more'));
const profit=keyed('profit');assert.equal(profit.productionScale*Math.sqrt(profit.labor)-profit.wage*profit.labor,25);assert.equal(profit.productionScale/(2*Math.sqrt(profit.labor)),profit.wage);assert(correct('profit').includes('π is 25'));
const revenue=keyed('revenue');assert(Math.abs((revenue.newRate/revenue.initialRate)*revenue.laborRatio-1.125)<1e-12);assert(correct('revenue').includes('12.5%'));
model.node('app').handlers.change({target:{id:'category',value:'lecture'}});
assert.equal(model.api.selectQuestions().length,24);assert(model.node('app').innerHTML.includes('<h1>Lecture Material</h1>'));assert(model.node('app').innerHTML.includes('không phải nguyên văn câu cô viết'));assert(model.node('app').innerHTML.includes('#page=3'));
model=load();assert.equal(model.api.getFilter().category,'lecture');assert.equal(model.api.selectQuestions().length,24);
model.node('app').handlers.change({target:{id:'chapter',value:'4'}});assert.equal(model.api.selectQuestions().length,10);
const q=model.api.selectQuestions()[0];model.api.record(q,false,(q.ans+1)%4);model.api.record(q,true,q.ans);
model=load('#mistakes');assert(model.api.selectQuestions().some(x=>x.id===q.id));
storage.clear();model=load('#home');assert(model.node('app').innerHTML.includes('data-browse="lecture"'));
for(let i=0;i<100;i++)assert(core.simulation(bank).every(x=>byId.get(x.id).category!=='lecture'));
console.log('PASS: 24 sourced Lecture Material MCQs, mathematical implications, balanced answer mappings, labels, filters, progress and simulation isolation.');
