const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx={window:{}};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('practice-data.js','utf8'),ctx);
const P=ctx.window.PRACTICE,Q=P.questions;
assert.strictEqual(Q.length,65);
assert.strictEqual(new Set(Q.map(q=>q.id)).size,65);
const bySet={};
Q.forEach(q=>{bySet[q.set]=(bySet[q.set]||0)+1;});
assert.deepStrictEqual(bySet,{a:20,b:18,c:20,d:7});
Q.forEach(q=>{
 assert(q.stem&&q.explain&&q.tag,q.id);
 assert(q.fields.length>=1,q.id);
 q.fields.forEach(f=>{
  assert(Number.isInteger(f.answer)&&f.answer>=0&&f.answer<f.options.length,q.id);
  assert.strictEqual(new Set(f.options).size,f.options.length,q.id+' duplicate options');
 });
 assert(!/[\u2014\u2013]/.test(q.stem+q.explain+q.fields.map(f=>f.label+f.options.join('')).join('')),q.id+' has a dash');
});
console.log('practice data ok:',Q.length,'questions',JSON.stringify(bySet));
