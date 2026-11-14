(function(){
const DATA=window.PRACTICE,Q=DATA.questions,SETS=DATA.sets,KEY='econ302_practice_m2_v1';
const app=document.getElementById('app');
let state={answers:{},results:{},draft:{},last:{},redo:[]};
try{
 const saved=JSON.parse(localStorage.getItem(KEY)||'null');
 if(saved&&saved.answers&&saved.results)state={answers:saved.answers,results:saved.results,draft:saved.draft||{},last:saved.last||{},redo:saved.redo||[]};
}catch(error){}
let summaryFor=null;

function save(){
 try{localStorage.setItem(KEY,JSON.stringify(state));}
 catch(error){document.getElementById('storage-warning').hidden=false;}
}
function el(tag,cls,text){
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=text;
 return node;
}
function listFor(setId){
 if(setId==='all')return Q;
 if(setId==='redo')return Q.filter(q=>state.redo.includes(q.id));
 return Q.filter(q=>q.set===setId);
}
function seeded(text){
 let h=1779033703^text.length;
 for(let i=0;i<text.length;i++){h=Math.imul(h^text.charCodeAt(i),3432918353);h=h<<13|h>>>19;}
 return function(){
  h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);h^=h>>>16;
  return(h>>>0)/4294967296;
 };
}
function orderFor(q,fi){
 const f=q.fields[fi],order=f.options.map((x,k)=>k);
 if(!f.shuffle)return order;
 const rand=seeded(q.id+':'+fi);
 for(let k=order.length-1;k>0;k--){const j=Math.floor(rand()*(k+1));[order[k],order[j]]=[order[j],order[k]];}
 return order;
}
function statusOf(q){
 const r=state.results[q.id];
 if(!r)return 'todo';
 return r.right===r.total?'ok':'bad';
}
function stats(list){
 let answered=0,right=0,total=0,perfect=0;
 list.forEach(q=>{
  const r=state.results[q.id];
  if(r){answered++;right+=r.right;total+=r.total;if(r.right===r.total)perfect++;}
 });
 return{answered,right,total,perfect,count:list.length};
}
function pct(a,b){return b?Math.round(100*a/b):0;}
function resetIds(ids){
 ids.forEach(id=>{delete state.answers[id];delete state.results[id];delete state.draft[id];});
}

function statCard(num,label){
 const card=el('div','stat-card');
 card.append(el('div','num',num),el('div','lbl',label));
 return card;
}
function renderHome(){
 const all=stats(Q);
 const wrap=el('div','chapter-home');
 wrap.append(el('h1','','Luyện Midterm 2: Malthus, Solow, Golden Rule và data'));
 wrap.append(el('p','home-subtitle',Q.length+' câu gom từ đề cũ, câu tự chế, câu viết lại theo kiểu cô và Ask Your Neighbor Ch 7. Tiến độ từng câu được lưu trên trình duyệt này, đóng trang rồi mở lại vẫn làm tiếp được.'));
 const grid=el('div','stat-grid');
 grid.append(statCard(all.answered+' / '+all.count,'Đã làm'),statCard(pct(all.right,all.total)+'%','Ô đúng'),statCard(String(all.count-all.perfect-(all.count-all.answered)),'Câu sai'),statCard(String(all.count-all.answered),'Chưa làm'));
 wrap.append(grid);
 const cards=el('div','mode-cards');
 SETS.concat([{id:'all',name:'Tất cả '+Q.length+' câu',note:'Làm lần lượt từng bộ theo thứ tự'}]).forEach(set=>{
  const list=listFor(set.id),s=stats(list);
  const card=el('div','mode-card');
  card.append(el('h2','',set.name),el('p','',set.note));
  const bar=el('div','progress'),fill=el('span');
  fill.style.width=pct(s.answered,s.count)+'%';
  bar.append(fill);
  card.append(bar,el('p','muted',s.answered+' / '+s.count+' câu, '+pct(s.right,s.total)+'% ô đúng'));
  const actions=el('div','actions');
  const go=el('a','btn',s.answered===0?'Bắt đầu':s.answered===s.count?'Xem kết quả':'Tiếp tục');
  go.href='#do-'+set.id;
  actions.append(go);
  card.append(actions);
  cards.append(card);
 });
 wrap.append(cards);
 const wrongCount=Q.filter(q=>statusOf(q)==='bad').length;
 const note=el('p','home-note',wrongCount?'Bạn đang có '+wrongCount+' câu sai. Mở mục Câu sai để xem đáp án và làm lại.':'Chưa có câu sai nào được ghi nhận.');
 wrap.append(note);
 app.className='home-view';
 app.replaceChildren(wrap);
}

function chips(list,setId,currentId){
 const nav=el('div','qnav');
 list.forEach((q,k)=>{
  const b=el('button','qchip '+statusOf(q),String(k+1));
  if(q.id===currentId)b.classList.add('current');
  b.type='button';
  b.setAttribute('aria-label','Câu '+(k+1));
  b.addEventListener('click',()=>{summaryFor=null;state.last[setId]=q.id;save();renderPractice(setId);window.scrollTo({top:0});});
  nav.append(b);
 });
 return nav;
}
function renderSummary(setId,list){
 const s=stats(list),wrong=list.filter(q=>statusOf(q)==='bad');
 const wrap=el('div','chapter-home');
 wrap.append(el('h1','','Kết quả: '+pct(s.right,s.total)+'%'));
 wrap.append(el('p','home-subtitle',s.right+' / '+s.total+' ô đúng. '+s.perfect+' / '+s.count+' câu đúng hết.'));
 wrap.append(chips(list,setId,null));
 const actions=el('div','actions');
 if(wrong.length){
  const redo=el('button','btn','Làm lại '+wrong.length+' câu sai');
  redo.type='button';
  redo.addEventListener('click',()=>{state.redo=wrong.map(q=>q.id);resetIds(state.redo);save();summaryFor=null;location.hash='#do-redo';render();});
  const view=el('a','btn secondary','Xem đáp án câu sai');
  view.href='#mistakes';
  actions.append(redo,view);
 }
 const again=el('button','btn secondary','Làm lại cả bộ');
 again.type='button';
 again.addEventListener('click',()=>{resetIds(list.map(q=>q.id));state.last[setId]=null;save();summaryFor=null;render();});
 const home=el('a','btn secondary','Về trang chính');
 home.href='#home';
 actions.append(again,home);
 wrap.append(actions);
 app.className='home-view';
 app.replaceChildren(wrap);
}
function renderPractice(setId){
 const list=listFor(setId);
 if(!list.length){
  app.className='';
  app.replaceChildren(el('p','empty','Chưa có câu nào trong mục này.'));
  return;
 }
 if(summaryFor===setId&&list.every(q=>state.results[q.id])){renderSummary(setId,list);return;}
 let idx=list.findIndex(q=>q.id===state.last[setId]);
 if(idx<0){
  idx=list.findIndex(q=>!state.results[q.id]);
  if(idx<0){summaryFor=setId;renderSummary(setId,list);return;}
 }
 const q=list[idx];
 state.last[setId]=q.id;
 const setName=(SETS.find(s=>s.id===q.set)||{}).name||'';
 const s=stats(list);
 app.className='';
 const top=el('div','section-top');
 top.append(el('h2','','Câu '+(idx+1)+' / '+list.length),el('span','muted',s.answered+' đã làm, '+pct(s.right,s.total)+'% ô đúng'));
 const bar=el('div','progress'),fill=el('span');
 fill.style.width=pct(s.answered,list.length)+'%';
 bar.append(fill);
 const card=el('article','card');
 const head=el('div','card-head');
 head.append(el('span','badge chapter',setName),el('span','',q.tag));
 card.append(head,el('p','stem',q.stem));
 const result=state.results[q.id],saved=result?state.answers[q.id]:state.draft[q.id];
 const fields=el('div','shock-fields'),selects=[],marks=[];
 q.fields.forEach((f,fi)=>{
  const wrap=el('div','shock-field'+(f.label?'':' single'));
  if(f.label)wrap.append(el('span','',f.label));
  const select=document.createElement('select');
  select.id='f-'+q.id+'-'+fi;
  select.setAttribute('aria-label',f.label||'Đáp án');
  select.append(new Option('Chọn đáp án',''));
  orderFor(q,fi).forEach(k=>select.append(new Option(f.options[k],String(k))));
  if(saved&&saved[fi]!==undefined)select.value=saved[fi];
  const mark=el('span','field-mark');
  if(result){
   select.disabled=true;
   const right=String(saved[fi])===String(f.answer);
   wrap.classList.add(right?'answer':'wrong');
   mark.textContent=right?'Đúng':'Đáp án: '+f.options[f.answer];
  }
  wrap.append(select);
  wrap.append(mark);
  fields.append(wrap);
  selects.push(select);marks.push(mark);
 });
 card.append(fields);
 const message=el('p','warning');
 message.hidden=true;
 card.append(message);
 const actions=el('div','actions');
 const prev=el('button','btn secondary','Câu trước');
 prev.type='button';
 prev.disabled=idx===0;
 prev.addEventListener('click',()=>{summaryFor=null;state.last[setId]=list[idx-1].id;save();renderPractice(setId);window.scrollTo({top:0});});
 actions.append(prev);
 if(result){
  const ok=result.right===result.total;
  const fb=el('div','feedback '+(ok?'ok':'err'));
  fb.append(el('p','',(ok?'Đúng hết. ':'Chưa đúng hết. ')+q.explain));
  card.append(fb);
  const again=el('button','btn secondary','Làm lại câu này');
  again.type='button';
  again.addEventListener('click',()=>{resetIds([q.id]);save();renderPractice(setId);});
  const next=el('button','btn',idx===list.length-1?'Xem kết quả':'Câu tiếp');
  next.type='button';
  next.addEventListener('click',()=>{
   if(idx===list.length-1){
    if(list.every(item=>state.results[item.id])){summaryFor=setId;}
    else{const todo=list.findIndex(item=>!state.results[item.id]);state.last[setId]=list[todo>=0?todo:0].id;}
   }else state.last[setId]=list[idx+1].id;
   save();renderPractice(setId);window.scrollTo({top:0});
  });
  actions.append(again,next);
 }else{
  const check=el('button','btn','Kiểm tra');
  check.type='button';
  check.addEventListener('click',()=>{
   if(selects.some(select=>select.value==='')){message.textContent='Chọn đáp án cho tất cả các ô trước khi kiểm tra.';message.hidden=false;return;}
   const picks=selects.map(select=>select.value);
   const right=picks.filter((value,fi)=>String(value)===String(q.fields[fi].answer)).length;
   state.answers[q.id]=picks;
   state.results[q.id]={right,total:q.fields.length};
   delete state.draft[q.id];
   save();renderPractice(setId);
  });
  selects.forEach(select=>select.addEventListener('change',()=>{
   message.hidden=true;
   state.draft[q.id]=selects.map(item=>item.value);
   save();
  }));
  actions.append(check);
 }
 card.append(actions);
 app.replaceChildren(top,bar,card,chips(list,setId,q.id));
}

function renderMistakes(){
 const wrong=Q.filter(q=>statusOf(q)==='bad');
 const wrap=el('div');
 const top=el('div','section-top');
 top.append(el('h2','','Câu sai ('+wrong.length+')'));
 if(wrong.length){
  const redo=el('button','btn','Làm lại các câu sai');
  redo.type='button';
  redo.addEventListener('click',()=>{state.redo=wrong.map(q=>q.id);resetIds(state.redo);save();summaryFor=null;location.hash='#do-redo';render();});
  top.append(redo);
 }
 wrap.append(top);
 if(!wrong.length)wrap.append(el('p','empty','Chưa có câu sai nào. Làm bài trong mục Luyện tất cả để câu sai xuất hiện ở đây.'));
 wrong.forEach(q=>{
  const card=el('article','card incorrect');
  const head=el('div','card-head');
  head.append(el('span','badge chapter',(SETS.find(s=>s.id===q.set)||{}).name||''),el('span','',q.tag));
  card.append(head,el('p','stem',q.stem));
  const picks=state.answers[q.id]||[];
  q.fields.forEach((f,fi)=>{
   const right=String(picks[fi])===String(f.answer);
   const line=el('div','shock-field '+(right?'answer':'wrong')+(f.label?'':' single'));
   const text=(f.label?f.label+': ':'')+'Bạn chọn: '+(f.options[picks[fi]]||'(bỏ trống)')+(right?'':'. Đáp án: '+f.options[f.answer]);
   line.append(el('span','',text));
   card.append(line);
  });
  const fb=el('div','feedback err');
  fb.append(el('p','',q.explain));
  card.append(fb);
  wrap.append(card);
 });
 app.className='';
 app.replaceChildren(wrap);
}

function render(){
 const hash=(location.hash||'#home').slice(1);
 document.querySelectorAll('nav button[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===hash.split('-')[0]||(hash.startsWith('do-')&&b.dataset.view==='do')));
 if(hash==='mistakes')renderMistakes();
 else if(hash.startsWith('do-')){state.last[hash.slice(3)]=null;renderPractice(hash.slice(3));}
 else renderHome();
}

document.querySelectorAll('nav button[data-view]').forEach(b=>b.addEventListener('click',()=>{
 summaryFor=null;
 location.hash=b.dataset.view==='do'?'#do-all':'#'+b.dataset.view;
}));
const resetDialog=document.getElementById('reset-dialog');
document.getElementById('reset-progress').addEventListener('click',()=>resetDialog.showModal());
resetDialog.addEventListener('close',()=>{
 if(resetDialog.returnValue==='ok'){
  state={answers:{},results:{},draft:{},last:{},redo:[]};
  summaryFor=null;save();location.hash='#home';render();
 }
});
window.addEventListener('hashchange',render);
render();
})();
