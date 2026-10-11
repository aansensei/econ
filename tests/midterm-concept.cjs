const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const core=require(path.join(root,'midterm.js'));
const ctx={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'midterm-data.js'),'utf8'),ctx);
const data=JSON.parse(JSON.stringify(ctx.window.MIDTERM_DATA)),bank=data.bank;
const byId=new Map(bank.map(q=>[q.id,q]));
assert.equal(byId.size,bank.length);
assert.equal(data.version,1);
const originals=bank.filter(q=>q.category!=='concept');
const keys=originals.map(q=>({...Object.fromEntries(['id','ans','answer'].filter(k=>k in q).map(k=>[k,q[k]])),blanks:(q.blanks||[]).map(b=>b.ans)}));
assert.equal(crypto.createHash('sha256').update(JSON.stringify(keys)).digest('hex'),'42790487f49a01504b16e366f6bffa58672e9a0dc42fc3063d90c0f3897aeacb');
const ayn=byId.get('m1_ayn_3_1');
assert(ayn.stem.includes('If N increases, what will happen to GDP (Y)?'));
assert.equal(ayn.opts[1],'The marginal productivity of N (MPN) will stay positive but fall as N rises');
assert(byId.get('m1_ps43_1').stem.includes('Piecing together these characteristics of the working-age population'));
assert(byId.get('m1_f16sa_1').stem.includes('Hint: most of the points come from how you solve the problem'));
for(const q of bank.filter(q=>q.category==='potential'))assert(q.wordingVerified,q.id);
const concepts=bank.filter(q=>q.category==='concept');
assert.equal(concepts.length,20);
for(const q of concepts){
 assert(q.wordingVerified,q.id);assert.equal(q.sim,false);
 assert(fs.existsSync(path.join(root,q.sourceImage)),q.id);
 assert.notEqual(q.verified,'official');
 if(q.type==='mcq'&&!q.referenceOnly)assert(Number.isInteger(q.ans)&&q.ans>=0&&q.ans<q.opts.length,q.id);
}
const mrs=byId.get('m1_concept_mrs_power');
for(const answer of ['0.50C^0.34','.5C^.34','0.5C^0.340'])assert(core.grade(mrs,answer),answer);
for(const answer of ['0.50C^-0.34','2C^0.34','0.50C^0.66','0.50C^0.34junk','0.50 C^0.34','0.50C^Infinity','0.50C^0.34;alert(1)'])assert.equal(core.grade(mrs,answer),false,answer);
const log=byId.get('m1_concept_leisure_log');
assert(core.grade(log,(.66*16/(.33+.66)).toFixed(2)));
assert.equal(core.grade(log,'10.45'),false);
for(const q of concepts.filter(q=>q.referenceOnly))for(const answer of [q.ans,0,1,2,3])assert.equal(core.grade(q,answer),null,q.id);
assert.equal(byId.get('m1_concept_distortion').ans,null);
assert.equal(byId.get('m1_concept_horizons').ans,2);
assert(byId.get('m1_concept_horizons').feedbackText.includes('income effects dominate substitution effect'));
for(let i=0;i<50;i++)assert(core.simulation(bank).every(x=>byId.get(x.id).category!=='concept'));
for(const filename of ['index.html','Econ302_Ch1-4_Quiz_Study.html']){
 const html=fs.readFileSync(path.join(root,filename),'utf8');
 const code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 new vm.Script(code);
 const defs=vm.runInNewContext(code.slice(0,code.indexOf('QB_CH5.forEach'))+';({QB,QB_CH5})');
 for(const parent of [...defs.QB,...defs.QB_CH5])for(const q of parent.subs||[parent]){
  const exact=byId.get(q.id);assert.equal(q.stem,exact.stem,q.id);
  if(q.opts)assert.equal(JSON.stringify(q.opts),JSON.stringify(exact.opts),q.id);
  if(q.blanks)assert.equal(JSON.stringify(q.blanks),JSON.stringify(exact.blanks),q.id);
 }
}
console.log('PASS: source wording, chapter-page parity, all existing answer keys, expression grading, screenshot assets, uncertain-key exclusions and simulation isolation.');
