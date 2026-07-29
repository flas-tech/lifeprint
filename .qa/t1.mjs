import {demoProfile, hardCaseProfile} from '../js/state.js';
import {buildRules} from '../js/engine/rules.js';
import {buildBook} from '../js/engine/book.js';
import {validateBook} from '../js/engine/validate.js';
import {detectConflicts} from '../js/engine/conflicts.js';
import {runSafetyChecks} from '../js/engine/safety.js';
for (const [label, mk] of [['demo',demoProfile],['hard',hardCaseProfile]]) {
  const s = mk();
  if(label==='hard') s.findings.forEach(f=>f.status='Confirmed');
  const rules = buildRules(s);
  console.log('=== '+label, JSON.stringify(rules.counts));
  console.log('conflicts', detectConflicts(s).map(c=>c.id+':'+c.severity).join(', '));
  console.log('safety', runSafetyChecks(s).map(f=>f.id+':'+f.level).join(', '));
  const book = buildBook(s, {rules});
  console.log('chapters', book.chapters.length, 'stats', JSON.stringify(book.stats));
  const v = validateBook(book, s, rules);
  console.log('validate: pass',v.passed,'warn',v.warned,'fail',v.failed);
  v.checks.filter(c=>c.status!=='pass').forEach(c=>console.log('  ',c.status,c.id,'-',c.detail));
  console.log('day1', JSON.stringify(book.data.plan.days[0].meals.map(m=>m.name)));
}
