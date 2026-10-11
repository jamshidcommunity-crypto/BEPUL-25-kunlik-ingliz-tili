// Shared word lookup used by the app (inlined) and by tools/validate.js.
// lookup(token, glossary) -> {key, uz} | null
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Lexicon = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const IRREGULAR = {
    went: 'go', gone: 'go', had: 'have', has: 'have', saw: 'see', seen: 'see', ate: 'eat', eaten: 'eat',
    bought: 'buy', made: 'make', got: 'get', came: 'come', took: 'take', taken: 'take', gave: 'give', given: 'give',
    met: 'meet', wrote: 'write', written: 'write', read: 'read', slept: 'sleep', drank: 'drink', drunk: 'drink',
    was: 'be', were: 'be', is: 'be', am: 'be', are: 'be', been: 'be', being: 'be', did: 'do', does: 'do', done: 'do',
    children: 'child', men: 'man', women: 'woman', people: 'person', feet: 'foot', teeth: 'tooth', mice: 'mouse',
    better: 'good', best: 'good', worse: 'bad', worst: 'bad', more: 'much', most: 'much', said: 'say', sat: 'sit',
    ran: 'run', swam: 'swim', found: 'find', told: 'tell', knew: 'know', thought: 'think', left: 'leave', felt: 'feel',
    began: 'begin', broke: 'break', brought: 'bring', built: 'build', caught: 'catch', chose: 'choose', cost: 'cost',
    cut: 'cut', drove: 'drive', fell: 'fall', flew: 'fly', forgot: 'forget', grew: 'grow', heard: 'hear', hit: 'hit',
    kept: 'keep', lost: 'lose', paid: 'pay', put: 'put', rode: 'ride', rang: 'ring', sang: 'sing', spoke: 'speak',
    spent: 'spend', stood: 'stand', taught: 'teach', threw: 'throw', understood: 'understand', woke: 'wake', won: 'win',
    worn: 'wear', wore: 'wear', hurt: 'hurt', let: 'let', sent: 'send', sold: 'sell', shut: 'shut', lent: 'lend',
    lay: 'lie', meant: 'mean', fed: 'feed', led: 'lead', lit: 'light', shone: 'shine', stuck: 'stick', bit: 'bite',
    earlier: 'early', earliest: 'early', bigger: 'big', biggest: 'big', hotter: 'hot', hottest: 'hot',
    thinner: 'thin', thinnest: 'thin', fatter: 'fat', fattest: 'fat', sadder: 'sad', saddest: 'sad',
    wetter: 'wet', wettest: 'wet', farther: 'far', farthest: 'far', further: 'far', furthest: 'far',
    less: 'little', least: 'little', fewer: 'few', fewest: 'few', themselves: 'themselves', ourselves: 'ourselves'
  };
  const NAMES = new Set(['dilnoza', 'bekzod', 'karim', 'nodira', 'hamida', 'aziz', 'malika', 'kim', 'mr', 'mrs', 'tom',
    'usmat', 'jizzax', 'samarkand', 'tashkent', 'uzbekistan', 'korea', 'bukhara', 'khiva', 'england', 'london',
    'russia', 'turkey', 'china', 'japan', 'india', 'america', 'moscow', 'istanbul', 'seoul', 'paris', 'france',
    'english', 'uzbek', 'russian', 'korean', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
    'sunday', 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october',
    'november', 'december', 'tv', 'ok', 'a', 'an', 'the', 'i', 'zarina', 'sardor', 'gulnora', 'ms']);

  function clean(tok) {
    return tok.toLowerCase().replace(/[“”"()\[\],.!?:;…]/g, '').replace(/[‘’]/g, "'").replace(/^'+|'+$/g, '');
  }
  function candidates(w) {
    const c = [w];
    if (IRREGULAR[w]) c.push(IRREGULAR[w]);
    if (w.endsWith("'s")) c.push(w.slice(0, -2));
    if (w.endsWith('ies') && w.length > 4) c.push(w.slice(0, -3) + 'y');
    if (w.endsWith('es') && w.length > 3) c.push(w.slice(0, -2));
    if (w.endsWith('s') && w.length > 2) c.push(w.slice(0, -1));
    if (w.endsWith('ied') && w.length > 4) c.push(w.slice(0, -3) + 'y');
    if (w.endsWith('ed') && w.length > 3) { c.push(w.slice(0, -2)); c.push(w.slice(0, -1)); if (w[w.length - 3] === w[w.length - 4]) c.push(w.slice(0, -3)); }
    if (w.endsWith('ing') && w.length > 4) { c.push(w.slice(0, -3)); c.push(w.slice(0, -3) + 'e'); if (w[w.length - 4] === w[w.length - 5]) c.push(w.slice(0, -4)); }
    if (w.endsWith('er') && w.length > 3) { c.push(w.slice(0, -2)); c.push(w.slice(0, -1)); if (w[w.length - 3] === w[w.length - 4]) c.push(w.slice(0, -3)); }
    if (w.endsWith('est') && w.length > 4) { c.push(w.slice(0, -3)); c.push(w.slice(0, -2)); if (w[w.length - 4] === w[w.length - 5]) c.push(w.slice(0, -4)); }
    if (w.endsWith('ier') && w.length > 4) c.push(w.slice(0, -3) + 'y');
    if (w.endsWith('iest') && w.length > 5) c.push(w.slice(0, -4) + 'y');
    if (w.endsWith('ly') && w.length > 3) { c.push(w.slice(0, -2)); if (w.endsWith('ily')) c.push(w.slice(0, -3) + 'y'); }
    return c;
  }
  function lookup(token, glossary) {
    const w = clean(token);
    if (!w) return null;
    if (/^\d+$/.test(w)) return null;
    for (const k of candidates(w)) if (glossary[k] !== undefined) return { key: k, uz: glossary[k] };
    return null;
  }
  function isName(token) { return NAMES.has(clean(token)); }
  return { lookup, clean, isName, IRREGULAR, NAMES };
});
