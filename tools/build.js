#!/usr/bin/env node
// 1) merges data/*.json + glossary into course.js (window.COURSE)
// 2) assembles index.html from src/index.template.html + src/app.js + src/emblem_b64.txt
// Usage: node tools/build.js   (run after editing data/*.json or src/*)
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), DATA = path.join(ROOT, 'data'), SRC = path.join(ROOT, 'src');
const config = JSON.parse(fs.readFileSync(path.join(DATA, 'config.json'), 'utf8'));
const base = JSON.parse(fs.readFileSync(path.join(DATA, 'glossary_base.json'), 'utf8'));
const files = fs.readdirSync(DATA).filter(f => /^day\d\d\.json$/.test(f)).sort();
const days = files.map(f => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')));
const glossary = Object.assign({}, base);
for (const d of days) for (const u of d.units) { Object.assign(glossary, u.glossary); for (const w of u.words) if (!glossary[w.en.toLowerCase()]) glossary[w.en.toLowerCase()] = w.uz; }
const ustoz = JSON.parse(fs.readFileSync(path.join(DATA, 'ustoz.json'), 'utf8'));
const out = { config, ustoz, glossary, days: days.map(d => ({ ...d, units: d.units.map(u => { const { glossary, ...rest } = u; return rest; }) })) };
const js = 'window.COURSE = ' + JSON.stringify(out) + ';\n';
fs.writeFileSync(path.join(ROOT, 'course.js'), js);
fs.writeFileSync(path.join(ROOT, 'netlify', 'functions', 'lib', 'days.json'), JSON.stringify(days.map(d => ({ day: d.day, title: d.title, units: d.units.length, unitIds: d.units.map(u => u.id) }))));
// index.html
const emblem = fs.readFileSync(path.join(SRC, 'emblem_b64.txt'), 'utf8').trim();
const app = fs.readFileSync(path.join(SRC, 'app.js'), 'utf8') + '\n' + fs.readFileSync(path.join(SRC, 'extras.js'), 'utf8');
let html = fs.readFileSync(path.join(SRC, 'index.template.html'), 'utf8');
html = html.replace('__APP__', () => app).split('__EMBLEM__').join(emblem);
fs.writeFileSync(path.join(ROOT, 'index.html'), html);
// bump service worker cache version
const sw = path.join(ROOT, 'sw.js');
if (fs.existsSync(sw)) {
  const v = 'b25-' + Date.now().toString(36);
  fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace(/const CACHE = '[^']*'/, `const CACHE = '${v}'`));
}
console.log(`course.js: ${days.length} days, ${days.reduce((n, d) => n + d.units.length, 0)} units, ${Object.keys(glossary).length} glossary entries, ${(js.length / 1024).toFixed(0)} KB · index.html ${(html.length / 1024).toFixed(0)} KB`);
