const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),core=require(path.join(root,'midterm.js'));
const fixture=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/old-midterm-source-audit.json'),'utf8'));
const ctx={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'midterm-data.js'),'utf8'),ctx);
const bank=JSON.parse(JSON.stringify(ctx.window.MIDTERM_DATA.bank)),old=bank.filter(q=>q.category==='old');
const byId=new Map(old.map(q=>[q.id,q]));
const normalize=s=>String(s).normalize('NFKC').replace(/\s+/g,' ').trim();
assert.equal(old.length,127);
assert.equal(Object.keys(fixture.questions).length,127);
for(const [source,counts] of Object.entries(fixture.scope)){
 assert.equal(old.filter(q=>q.source===source&&q.type==='mcq').length,counts.mcq);
 assert.equal(old.filter(q=>q.source===source+'sa'&&q.originalType==='open'&&q.type==='mcq').length,counts.shortAnswer);
}
for(const [filename,hash] of Object.entries(fixture.sources)){
 const bytes=fs.readFileSync(path.join(root,'midterm-assets/Old Midterm 1',filename));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),hash,filename);
}
for(const [id,source] of Object.entries(fixture.questions)){
 const q=byId.get(id);assert(q,id);assert.equal(q.wordingVerified,true,id);
 for(const field of ['stem','scenario','officialRubric'])if(field in source)assert.equal(normalize(q[field]),normalize(source[field]),id+' '+field);
 assert.equal(q.wordingSource,source.wordingSource,id);
 if(q.originalType!=='open'){
  assert.deepEqual(q.opts.map(normalize),source.opts.map(normalize),id+' original choices');
  assert.equal(q.opts.length,4,id);
  assert.equal(q.ans,source.ans,id+' official key');
  assert.equal(q.keyText,source.keyText,id+' key text');
  for(let answer=0;answer<4;answer++)assert.equal(core.grade(q,answer),q.referenceOnly?null:answer===source.ans,id);
 }else{
  assert(q.officialRubric.length>150,id);
  assert.equal(q.keySource,source.keySource,id);
  assert(q.adaptedStem&&q.adaptedFromOpen,id);
  assert.equal(q.opts.length,4,id);
  assert.equal(new Set(q.opts).size,4,id);
  for(let answer=0;answer<4;answer++)assert.equal(core.grade(q,answer),answer===q.ans,id);
 }
}
assert.equal(byId.get('m1_f16_8').opts[0],'it is preferred to have more of one and less of another than more of everything');
const typo=byId.get('m1_f16_12');
assert.equal(typo.opts[0],typo.opts[1]);assert(typo.referenceOnly);assert(!typo.sim);
assert(typo.keyText.includes('we gave credit to all answers'));
assert.equal(byId.get('m1_f16_21').opts[0],'MPN = -slope of PPF.');
assert(byId.get('m1_s17_20').opts[0].startsWith('Increased consumption'));
assert.equal(byId.get('m1_f19_18').opts[3],'(b/a) · (l/C) = w(1−t)');
assert(byId.get('m1_s17sa_6').stem.includes('\na. Tell us'));
assert(byId.get('m1_s17sa_6').stem.includes('\nc. Explain'));
assert(byId.get('m1_s17sa_7').stem.includes('\nb. Explain'));
for(const id of ['m1_f19_23','m1_f19_24']){assert(byId.get(id).referenceOnly);assert(!byId.get(id).sim);}
assert(byId.get('m1_f19_23').note.includes('chọn B'));
assert(byId.get('m1_f19_24').note.includes('uncorrelated'));
const css=fs.readFileSync(path.join(root,'midterm.css'),'utf8');
assert(css.includes('.choices label.answer,.choices label.answer:has(input:checked){border-color:var(--green);background:#edf7ef}'));
assert(css.includes('.choices label.wrong,.choices label.wrong:has(input:checked){border-color:var(--red);background:#fff0f1}'));
assert(css.includes('.choices label:has(input:checked){border-color:#536b92;background:#f0f4fa}'));
assert(css.includes('.choices label.answer input{accent-color:var(--green)}'));
const main=fs.readFileSync(path.join(root,'midterm.js'),'utf8');
assert(main.includes('Rubric nguyên văn từ answer key'));
assert(main.includes('Giải thích ôn tập bằng tiếng Việt:'));
console.log('PASS: all 113 original MCQs and keys, 14 converted short answers with unchanged original text/rubrics, 9 source hashes and answer colors.');
