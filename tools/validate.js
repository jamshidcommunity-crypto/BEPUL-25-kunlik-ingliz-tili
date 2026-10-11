#!/usr/bin/env node
// Validates data/dayNN.json files against tools/CONTENT_SPEC.md
const fs = require('fs'), path = require('path');
const Lex = require('./lexicon.js');
const DATA = path.join(__dirname, '..', 'data');
const base = JSON.parse(fs.readFileSync(path.join(DATA, 'glossary_base.json'), 'utf8'));
const files = fs.readdirSync(DATA).filter(f => /^day\d\d\.json$/.test(f)).sort();
const only = process.argv.slice(2);
let errors = 0, warns = 0;
const E = (f, m) => { errors++; console.log(`ERR  ${f}: ${m}`); };
const W = (f, m) => { warns++; console.log(`warn ${f}: ${m}`); };
const CYR = /[Ѐ-ӿ]/;
const BADAPOS = /[a-z]['`‘’](?![a-z])|(?:o|g)['`‘’]/i; // o' g' or trailing apostrophe in uzbek-looking words
const UZ_CHECK = (f, s, where) => {
  if (typeof s !== 'string') return;
  if (CYR.test(s)) E(f, `Cyrillic in ${where}: ${s.slice(0, 60)}`);
  const s2 = s.replace(/o'clock/gi, '').replace(/\bwho's\b/gi, '').replace(/\b(go|do|two|so|no|dog|big|bag|leg)'(s|ll|re|ve|d)\b/gi, '');
  if (/[oOgG]['`‘’]/.test(s2)) E(f, `wrong apostrophe (use ʻ U+02BB) in ${where}: ${s.slice(0, 60)}`);
};
const allGloss = Object.assign({}, base);
const days = [];
for (const f of files) {
  if (only.length && !only.includes(f)) continue;
  let d;
  try { d = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch (e) { E(f, 'JSON parse: ' + e.message); continue; }
  days.push([f, d]);
  for (const u of d.units || []) Object.assign(allGloss, u.glossary || {});
}
const wordsOf = s => s.split(/\s+/).filter(Boolean);
function checkWords(f, s, where, gloss) {
  for (const t of wordsOf(s)) {
    const c = Lex.clean(t);
    if (!c || /^\d+$/.test(c) || Lex.isName(t) || c === '___' || /^_+$/.test(c)) continue;
    if (!Lex.lookup(t, gloss)) E(f, `no glossary for "${t}" in ${where}`);
  }
}
for (const [f, d] of days) {
  const num = parseInt(f.slice(3, 5));
  if (d.day !== num) E(f, `day field ${d.day} != ${num}`);
  if (!d.title) E(f, 'missing title');
  UZ_CHECK(f, d.title, 'title');
  if (!Array.isArray(d.shadowing) || d.shadowing.length !== 8) E(f, `shadowing must have 8 items (has ${(d.shadowing || []).length})`);
  for (const s of d.shadowing || []) { if (!s.en || !s.uz) E(f, 'shadowing item missing en/uz'); UZ_CHECK(f, s.uz, 'shadowing.uz'); }
  if (num < 25 && d.test !== null) E(f, 'test must be null before day 25');
  if (num === 25) {
    if (!d.test || !Array.isArray(d.test.choice) || d.test.choice.length !== 40) E(f, 'day25 test.choice must have 40 items');
    for (const [i, it] of (d.test?.choice || []).entries()) {
      if (!it.q || !Array.isArray(it.o) || it.o.length !== 3 || typeof it.a !== 'number' || it.a < 0 || it.a > 2) E(f, `test.choice[${i}] malformed`);
    }
  }
  for (const u of d.units || []) {
    const tag = `unit ${u.id}`;
    if (!u.id || !u.code || !u.title || !u.rule) E(f, `${tag}: missing id/code/title/rule`);
    UZ_CHECK(f, u.rule, tag + ' rule');
    if (!Array.isArray(u.examples) || u.examples.length !== 6) E(f, `${tag}: examples must be 6`);
    if (!Array.isArray(u.words) || u.words.length !== 8) E(f, `${tag}: words must be 8`);
    for (const w of u.words || []) { if (!w.en || !w.uz) E(f, `${tag}: word missing en/uz`); UZ_CHECK(f, w.uz, tag + ' word'); }
    if (!u.text || !u.text.en) E(f, `${tag}: missing text.en`);
    else {
      const n = wordsOf(u.text.en.replace(/\w+:/g, '')).length;
      if (n < 35 || n > 70) W(f, `${tag}: text has ${n} words (want 40–60)`);
    }
    const ex = u.exercises || {};
    const need = { choice: 6, order: 4, text: 4, fill: 4 };
    for (const k in need) {
      if (!Array.isArray(ex[k]) || ex[k].length !== need[k]) E(f, `${tag}: exercises.${k} must have ${need[k]} (has ${(ex[k] || []).length})`);
    }
    for (const [i, it] of (ex.choice || []).entries()) {
      if (!it.q || !Array.isArray(it.o) || it.o.length !== 3 || typeof it.a !== 'number' || it.a < 0 || it.a > 2) E(f, `${tag}: choice[${i}] malformed`);
      UZ_CHECK(f, it.q, `${tag} choice[${i}]`);
    }
    const ans = (ex.choice || []).map(i => i.a);
    if (ans.length === 6 && new Set(ans).size === 1) W(f, `${tag}: all choice answers are index ${ans[0]}`);
    for (const [i, it] of (ex.order || []).entries()) {
      if (!Array.isArray(it.w) || !it.a) { E(f, `${tag}: order[${i}] malformed`); continue; }
      const target = it.a.replace(/[.!?]$/, '').toLowerCase().replace(/[,]/g, '');
      const built = it.w.join(' ').toLowerCase().replace(/[,]/g, '');
      const sortW = s => s.split(/\s+/).sort().join(' ');
      if (sortW(target) !== sortW(built)) E(f, `${tag}: order[${i}] words ${JSON.stringify(it.w)} don't rebuild "${it.a}"`);
      if (it.w.some(x => /[.!?]$/.test(x))) E(f, `${tag}: order[${i}] punctuation inside w`);
      if (it.w.join(' ').toLowerCase() === it.a.replace(/[.!?]$/, '').toLowerCase()) W(f, `${tag}: order[${i}] not shuffled`);
    }
    for (const [i, it] of (ex.text || []).entries()) {
      if (!it.q || !Array.isArray(it.o) || it.o.length < 2 || it.o.length > 3 || typeof it.a !== 'number' || it.a >= it.o.length) E(f, `${tag}: text[${i}] malformed`);
    }
    for (const [i, it] of (ex.fill || []).entries()) {
      if (!it.q || !Array.isArray(it.a) || !it.a.length) E(f, `${tag}: fill[${i}] malformed`);
      else if ((it.q.match(/___/g) || []).length !== 1) E(f, `${tag}: fill[${i}] must have exactly one ___`);
    }
    // glossary coverage
    const gl = allGloss;
    checkWords(f, u.text?.en || '', `${tag} text`, gl);
    for (const e of u.examples || []) checkWords(f, e, `${tag} example "${e}"`, gl);
    for (const it of ex.order || []) checkWords(f, it.a, `${tag} order "${it.a}"`, gl);
    for (const it of ex.fill || []) checkWords(f, it.q.replace('___', ''), `${tag} fill "${it.q}"`, gl);
    for (const it of ex.text || []) { if (/^[A-Z]/.test(it.q) && !/[A-Za-z]{2,} [a-z]+ [a-z]+ qaysi/.test(it.q)) checkWords(f, it.q, `${tag} textq "${it.q}"`, gl); }
    for (const w of u.words || []) if (!Lex.lookup(w.en.split(' ')[0], gl) && !gl[w.en.toLowerCase()]) W(f, `${tag}: word "${w.en}" not in glossary (add it)`);
  }
}
console.log(`\n${days.length} files, ${errors} errors, ${warns} warnings`);
process.exit(errors ? 1 : 0);
