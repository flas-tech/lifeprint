import {demoProfile} from '../js/state.js';
import {buildRules} from '../js/engine/rules.js';
import {buildBook, bookPlainText} from '../js/engine/book.js';
import {scanClaims} from '../js/engine/safety.js';
const s=demoProfile(); const r=buildRules(s); const b=buildBook(s,{rules:r});
console.log(JSON.stringify(scanClaims(bookPlainText(b)),null,1));
