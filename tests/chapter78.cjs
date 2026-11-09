const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),core=require(path.join(root,'chapter78.js'));
const dataCode=fs.readFileSync(path.join(root,'chapter78-data.js'),'utf8'),main=fs.readFileSync(path.join(root,'chapter78.js'),'utf8');
const audit=JSON.parse(fs.readFileSync(path.join(root,'chapter78-assets/source-audit.json'),'utf8'));
const storage=new Map([['econ302_stats','{"existing":{"attempts":2}}'],['econ302_ch6_v1','{"existing":true}'],['econ302_midterm_session','{"existing":true}']]);
function load(hash='#review',random=Math.random){
 const nodes=new Map(),timers={cleared:[]};
 function node(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',hidden:false,handlers:{},children:[],classList:{toggle(){}},addEventListener(name,fn){this.handlers[name]=fn;},querySelector(){return null;},append(child){this.children.push(child);},setAttribute(){},scrollIntoView(){},showModal(){this.open=true;},close(value){this.returnValue=value;this.open=false;this.handlers.close?.();}});return nodes.get(id);}
 const context=vm.createContext({Math:Object.assign(Object.create(Math),{random}),window:{scrollTo(){}},document:{getElementById:node,querySelectorAll(){return [];},createElement(){return node('warning');}},location:{hash},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setInterval(){return 1;},clearInterval:id=>timers.cleared.push(id),console});
 vm.runInContext(dataCode,context);const end=main.lastIndexOf('}');
 vm.runInContext(main.slice(0,end)+'globalThis.testAPI={selectedQuestions,show,check,start,submit,card,getState:()=>state};'+main.slice(end),context);
 return {api:context.testAPI,data:JSON.parse(JSON.stringify(context.window.CHAPTER78_DATA)),node,location:context.location,timers};
}
const SOURCE_KEYS='AACCDCAACBDABBBBCCABBBDBAABACACBAAABBBBBCCDCCDACCCDCADC';
let model=load('#review',()=>0);const data=model.data,questions=data.questions;
const sample=['a','b','c','d'];assert.deepEqual(core.shuffle(sample,()=>0),['b','c','d','a']);assert.deepEqual(sample,['a','b','c','d']);
assert.deepEqual(core.shuffle([],()=>0),[]);assert.deepEqual(core.shuffle(['a'],()=>0),['a']);

// source file integrity
assert.equal(data.source.sha256,'a79858b82fda9b48d6ba114164745d070834c5ac9c8aa3a7c47f932f4f0d12cf');
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,data.source.url))).digest('hex'),data.source.sha256);
assert.equal(audit.source.sha256,data.source.sha256);
assert.equal(data.source.pages,13);assert.equal(audit.pages.length,13);
for(let page=1;page<=13;page++)assert(fs.existsSync(path.join(root,'chapter78-assets/source-pages/page-'+page+'.png')));

// question bank
assert.equal(questions.length,55);assert.equal(new Set(questions.map(q=>q.id)).size,55);assert.equal(data.pools.length,1);
assert.deepEqual(questions.map(q=>q.number),Array.from({length:55},(_,i)=>i+1));
assert.deepEqual(questions.map(q=>q.id),audit.questionIds);
assert.equal(questions.reduce((n,q)=>n+q.pts,0),55);
assert.equal(questions.map(q=>'ABCD'[q.ans]).join(''),SOURCE_KEYS);
assert.deepEqual(questions.map(q=>'ABCD'[q.ans]),audit.mcqKeys.map(k=>k.key));
const normalize=text=>text.replace(/\s+/g,'');
assert.equal(normalize(data.title+'\n'+data.instructions),normalize(audit.pages[0].text));assert(data.instructions.includes('The remining 50%'));
for(const page of audit.pages.slice(1)){
 const heading=page.number===data.pools[0].page?data.poolNote+'\n'+data.pools[0].title:'';
 const text=heading+'\n'+questions.filter(q=>q.page===page.number).map(q=>q.originalText).join('\n');
 assert.equal(normalize(text),normalize(page.text),'Full source page '+page.number);
}
for(const q of questions){
 const sourceText=q.number+'. '+q.stem+'\n'+q.opts.map((o,i)=>String.fromCharCode(65+i)+'. '+o).join('\n')+'\n'+q.keyText;
 assert.equal(normalize(sourceText),normalize(q.originalText),q.id);
 assert.equal(q.type,'mcq');assert.equal(q.opts.length,4);assert.equal(q.pts,1);assert.equal(q.keyText,'Answer: '+String.fromCharCode(65+q.ans));
 assert.equal(audit.mcqKeys.find(k=>k.id===q.id).page,q.page);
 for(let answer=0;answer<4;answer++)assert.equal(core.grade(q,answer).points,answer===q.ans?1:0);
 assert.equal(core.grade(q,null).points,0);assert.equal(core.answered(q,null),false);assert.equal(core.answered(q,q.ans),true);assert.equal(core.answered(q,4),false);
}

// spot checks against the PDF that a reader can verify by eye
const byNumber=n=>questions.find(q=>q.number===n);
assert(byNumber(1).stem.includes('poor economy inches towards the steady state'));assert.equal(byNumber(1).opts[byNumber(1).ans],'The growth rate of output decreases.');
assert(byNumber(11).stem.includes('lump-sum tax on Consumption'));assert.equal(byNumber(11).opts[byNumber(11).ans],'The graph of ln(Ct) to shift down and get steeper.');
assert.equal(byNumber(40).opts[1].trim(),'people.');assert.equal(byNumber(40).ans,1);
assert.equal(byNumber(52).opts.map(o=>o.trim()).join('|'),'H|z|b|1-u');assert.equal(byNumber(52).opts[byNumber(52).ans].trim(),'b');
assert.equal(byNumber(55).opts[byNumber(55).ans].trim(),'x/d.');assert.equal(byNumber(55).page,12);
assert.equal(byNumber(44).opts[byNumber(44).ans].trim(),'Brazil, Russia, India, China, and South Africa.');

// quiz draw
for(let trial=0;trial<100;trial++){
 const ids=core.draw(questions),items=questions.filter(q=>ids.includes(q.id));
 assert.equal(ids.length,20);assert.equal(new Set(ids).size,20);assert.deepEqual(ids,items.map(q=>q.id));assert.equal(items.reduce((n,q)=>n+q.pts,0),20);
}

// UI
assert(model.node('app').innerHTML.includes('55 câu | 0/55 câu đúng'));assert(model.node('app').innerHTML.includes('0/55 điểm'));
const reviewIds=()=>Array.from(model.api.selectedQuestions(),q=>q.id),initialOrder=reviewIds();
assert.deepEqual(initialOrder,questions.slice(1).concat(questions[0]).map(q=>q.id));
assert.deepEqual(Array.from(model.node('app').innerHTML.matchAll(/data-q="([^"]+)"/g),m=>m[1]),initialOrder);
assert(model.node('app').innerHTML.includes('Câu hỏi được trộn ngẫu nhiên'));
const homeModel=load('');assert.equal(homeModel.location.hash,'home');
assert(homeModel.node('app').innerHTML.includes('Ch 7/8 Potential Quiz'));
for(const label of ['Gradeable Questions','Attempted','Accuracy','Mastered (Last ✓)','Review Mode','Quiz Mode','Review Mistakes','Original PDF'])assert(homeModel.node('app').innerHTML.includes(label));
assert(homeModel.node('app').innerHTML.includes('id="s-total">55</div>'));
const wrong=questions[0],right=questions[1],state=model.api.getState();
state.answers[wrong.id]=(wrong.ans+1)%4;model.api.check(wrong.id);
assert.equal(state.results[wrong.id].points,0);assert(model.node('app').innerHTML.includes('Chưa đúng: 0/1 điểm'));assert.equal(state.history[wrong.id].wrong,1);
state.answers[right.id]=right.ans;model.api.check(right.id);assert.equal(state.results[right.id].points,1);assert(model.node('app').innerHTML.includes('Đúng: 1/1 điểm'));
assert.deepEqual(reviewIds(),initialOrder);model.api.show('home');model.api.show('review');assert.deepEqual(reviewIds(),initialOrder);
model=load('#review');assert.deepEqual(reviewIds(),initialOrder);assert.equal(model.api.getState().results[right.id].correct,true);
model=load('#mistakes');assert.equal(model.api.selectedQuestions().length,1);assert.equal(model.api.selectedQuestions()[0].id,wrong.id);
model.api.show('home');
for(const value of ['s-attempted">2','s-pct">50%','s-mastered">1'])assert(model.node('app').innerHTML.includes(value));
model.api.show('source');assert(model.node('app').innerHTML.includes('The remining 50%'));assert(model.node('app').innerHTML.includes('There is only one pool for this quiz'));
assert.equal((model.node('app').innerHTML.match(/Trang gốc \d+/g)||[]).length,13);

// saved quiz
model.api.start();const quiz=model.api.getState().quiz;assert(Math.abs(quiz.deadline-Date.now()-1800000)<5000);const ids=Array.from(quiz.ids);assert.equal(ids.length,20);
model.api.start();assert.deepEqual(Array.from(model.api.getState().quiz.ids),ids);
model.api.show('home');assert(model.node('app').innerHTML.includes('Resume Quiz'));
const resumed=load('');assert(resumed.node('app').innerHTML.includes('Resume Quiz'));assert.deepEqual(Array.from(resumed.api.getState().quiz.ids),ids);
model.api.show('session');
for(const id of quiz.ids)quiz.answers[id]=questions.find(q=>q.id===id).ans;
(async()=>{
 await model.api.submit(true);assert.equal(quiz.submitted,true);assert.equal(Object.values(quiz.results).reduce((n,r)=>n+r.points,0),20);assert(model.node('app').innerHTML.includes('20/20 điểm'));
 for(const id of quiz.ids){assert.equal(model.api.getState().results[id].correct,true);assert.equal(model.api.getState().answers[id],quiz.answers[id]);}
 const attempts=JSON.stringify(model.api.getState().history);await model.api.submit(true);assert.equal(JSON.stringify(model.api.getState().history),attempts);
 model=load('#session');assert(model.node('app').innerHTML.includes('20/20 điểm'));
 model.api.show('home');assert(model.node('app').innerHTML.includes('View Last Quiz'));
 model.node('app').handlers.click({target:{closest(){return {dataset:{homeReview:''}};}}});assert.equal(model.api.selectedQuestions().length,55);assert.equal(model.location.hash,'review');

 // radio selection is saved per question and ignored once a result exists
 model=load('#review');const pick=questions[5];
 model.node('app').handlers.change({target:{value:'2',closest(){return {dataset:{q:pick.id}};}}});assert.equal(model.api.getState().answers[pick.id],2);
 model.api.check(pick.id);const lockedResult=JSON.stringify(model.api.getState().results[pick.id]);
 model.node('app').handlers.change({target:{value:'0',closest(){return {dataset:{q:pick.id}};}}});assert.equal(model.api.getState().answers[pick.id],2);assert.equal(JSON.stringify(model.api.getState().results[pick.id]),lockedResult);

 // reset
 const html=fs.readFileSync(path.join(root,'chapter78.html'),'utf8');
 assert(html.includes('id="reset-progress"'));assert(html.includes('id="reset-dialog"'));assert(html.includes('value="cancel" autofocus'));
 model.api.start();const beforeReset=JSON.stringify(model.api.getState()),savedBeforeReset=storage.get('econ302_ch78_v1');
 const resetDialog=model.node('reset-dialog');
 let resetting=model.node('reset-progress').handlers.click();assert.equal(resetDialog.open,true);
 resetDialog.close('cancel');await resetting;
 assert.equal(JSON.stringify(model.api.getState()),beforeReset);assert.equal(storage.get('econ302_ch78_v1'),savedBeforeReset);
 const clearedBefore=model.timers.cleared.length;
 resetting=model.node('reset-progress').handlers.click();resetDialog.close('ok');await resetting;
 assert(model.timers.cleared.length>clearedBefore);assert.equal(model.node('clock').hidden,true);assert.equal(model.location.hash,'home');
 const emptyState={answers:{},results:{},history:{},quiz:null};
 const savedAfterReset=JSON.parse(storage.get('econ302_ch78_v1'));delete savedAfterReset.reviewOrder;assert.deepEqual(savedAfterReset,emptyState);
 model=load('#review');assert(model.node('app').innerHTML.includes('0/55 câu đúng'));assert(!model.node('app').innerHTML.includes('class="feedback'));

 // refresh keeps history and quizzes, clears review results
 model.api.getState().answers[wrong.id]=(wrong.ans+1)%4;model.api.check(wrong.id);
 const historyBefore=JSON.stringify(model.api.getState().history),quizBefore=JSON.stringify(model.api.getState().quiz);
 const clickRefresh=()=>model.node('app').handlers.click({target:{closest(){return {dataset:{refresh:''}};}}});
 assert(model.node('app').innerHTML.includes('data-refresh>Refresh ↺'));
 let refreshing=clickRefresh();assert.equal(model.node('refresh-dialog').open,true);assert(model.node('refresh-description').textContent.includes('55 câu Review'));
 model.node('refresh-dialog').close('cancel');await refreshing;assert(model.api.getState().results[wrong.id]);
 refreshing=clickRefresh();model.node('refresh-dialog').close('ok');await refreshing;
 assert.equal(Object.keys(model.api.getState().results).length,0);assert.equal(Object.keys(model.api.getState().answers).length,0);
 assert.equal(JSON.stringify(model.api.getState().history),historyBefore);assert.equal(JSON.stringify(model.api.getState().quiz),quizBefore);
 assert.equal(new Set(model.api.getState().reviewOrder).size,55);
 for(const next of ['home','mistakes','source','quiz','session']){model.api.show(next);assert(!model.node('app').innerHTML.includes('data-refresh'));}

 // invalid saved order recovers
 const invalid=JSON.parse(storage.get('econ302_ch78_v1'));invalid.reviewOrder=questions.map(()=>questions[0].id);storage.set('econ302_ch78_v1',JSON.stringify(invalid));
 model=load('#review',()=>0);assert.equal(new Set(reviewIds()).size,55);

 // other apps' storage is untouched
 assert.equal(storage.get('econ302_stats'),'{"existing":{"attempts":2}}');assert.equal(storage.get('econ302_ch6_v1'),'{"existing":true}');assert.equal(storage.get('econ302_midterm_session'),'{"existing":true}');

 // navigation between study pages
 for(const file of ['index.html','Econ302_Ch1-4_Quiz_Study.html','midterm.html','chapter6.html'])assert(fs.readFileSync(path.join(root,file),'utf8').includes('href="chapter78.html"'),file+' links to Chapter 7/8');
 for(const href of ['index.html','chapter6.html','midterm.html'])assert(html.includes('href="'+href+'"'));
 for(const file of ['chapter78.html','chapter78.js','chapter78-data.js','midterm.css','chapter6.css'])assert(fs.existsSync(path.join(root,file)));
 console.log('PASS: Chapter 7/8 source wording and keys (55 MCQs, 13 pages), grading, saved quiz/reset/refresh, shuffled Review, mistake history, storage isolation, navigation links.');
})().catch(error=>{console.error(error);process.exitCode=1;});
