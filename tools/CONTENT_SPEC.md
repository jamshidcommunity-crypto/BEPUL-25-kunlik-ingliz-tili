# Beginner 25 — content spec (READ FULLY BEFORE WRITING)

Course: free 25-day online English course for absolute beginners (Uzbek speakers), Imamov Academy.
Teacher explains grammar in a lesson; the app gives exercises. **No AI** — every exercise has a fixed key.
Level: **Round-Up 2 (Pearson) — the simplest cases only.** No exceptions, no advanced uses. Vocabulary: very common
words only (family, home, food, school, daily routine, town, weather, clothes, travel). Sentences 3–8 words.

## Characters (use ONLY these, consistently)
- **Dilnoza** — 23, English teacher, lives in Usmat (a small town in Jizzax region, Uzbekistan)
- **Bekzod** — 17, Dilnoza's brother, student
- **Karim** (father, farmer, 55) and **Nodira** (mother, nurse, 50); **Hamida** (grandmother, 70)
- **Aziz** — 19, Dilnoza's student, from Samarkand; **Malika** — 20, student, from Tashkent
- **Mr Kim** — 40, English teacher from Korea; a cat called **Tom**; places: Usmat, Jizzax, Samarkand, Tashkent

## Uzbek orthography (STRICT)
- Latin script ONLY. **Zero Cyrillic characters anywhere.**
- oʻ / gʻ use the okina **ʻ (U+02BB)**: oʻqituvchi, gʻisht, koʻk, oʻn.
- The tutuq belgisi in aʼlo / eʼlon / maʼno is **ʼ (U+02BC)**.
- Never use a straight apostrophe ' or ` or ‘ ’ in Uzbek words. (English contractions like *I'm* use the straight ' .)

## Files
One file per day: `data/dayNN.json` (day01 … day25). JSON, UTF-8, 2-space indent.

```json
{
  "day": 2,
  "title": "Personal pronouns · to be",
  "units": [ { ...unit... }, { ...unit... } ],
  "shadowing": [ {"en": "I'm a student.", "uz": "Men oʻquvchiman."}, ... 8 items ... ],
  "test": null
}
```

### Unit object
```json
{
  "id": 2,
  "code": "G",
  "title": "Personal pronouns",
  "rule": "Oʻzbekcha tushuntirish, 3–5 qisqa gap. Qoidani oddiy ayting, 1–2 misol bilan.",
  "examples": ["I am a student.", "..."],
  "words": [ {"en": "student", "uz": "oʻquvchi"}, ... exactly 8 ... ],
  "text": { "title": "Dilnoza's family", "en": "40–60 words, 4–8 short sentences, uses this unit's grammar and words." },
  "exercises": {
    "choice": [ {"q": "I ___ a student.", "o": ["am", "is", "are"], "a": 0}, ... exactly 6 ... ],
    "order":  [ {"w": ["am", "I", "a", "student"], "a": "I am a student."}, ... exactly 4 ... ],
    "text":   [ {"q": "Dilnoza is a teacher.", "o": ["True", "False"], "a": 0}, ... exactly 4 ... ],
    "fill":   [ {"q": "I ___ from Usmat.", "a": ["am", "'m"], "hint": "be"}, ... exactly 4 ... ]
  },
  "glossary": { "student": "oʻquvchi", "teacher": "oʻqituvchi", ... }
}
```

Rules per field:
- `id`: global unit number (1–34), in course order. `code`: "G" (grammar) or "S" (vocabulary/skills).
- `rule`: Uzbek, plain, 3–5 sentences, may contain English examples in *asterisks*. Explain the simplest form only.
- `examples`: exactly 6 English sentences showing the rule. 3–8 words each.
- `words`: exactly 8 — the unit's key words/phrases with Uzbek translation. Common words only.
- `text.en`: 40–60 words. Uses ONLY: this unit's grammar + grammar of earlier units. Characters above. Short sentences.
  Dialogue is allowed ("Dilnoza: ... / Aziz: ..."); newline between lines with `\n`.
- `exercises.choice`: 6 items, 3 options, `a` = index of the correct option (vary 0/1/2 — not all the same). Only THIS unit's grammar.
- `exercises.order`: 4 items; `w` = the words of the answer, shuffled (include the final punctuation attached to the last word? NO — keep punctuation out of `w`; `a` is the full sentence with punctuation). 4–7 words.
- `exercises.text`: 4 questions about `text.en`; options are `["True","False"]` or 3 short options; `a` = index.
- `exercises.fill`: 4 gap sentences; `a` = list of ALL accepted answers (short and full forms, e.g. `["isn't","is not"]`); `hint` = Uzbek or base form shown in brackets. Only one gap per item (`___`).
- `glossary`: Uzbek translation for EVERY distinct word that appears in `text.en`, `examples`, and all exercise sentences (q, o, w, a) of this unit — base forms are enough (the app strips -s/-es/-ed/-ing/'s and maps irregular forms: went→go etc.), but contractions must be listed as they are (`"i'm": "men"`, `"isn't": "emas"`, `"don't": "...ma"`). Names (Dilnoza, Aziz …) and numbers are skipped automatically. Lowercase keys. Phrasal entries like `"get up": "turmoq"` are also used: if a two-word key matches, the app shows it.

### Day-level
- `title`: the day's topics as the teacher listed them (e.g. "Possessives · can · the imperative").
- `shadowing`: exactly 8 sentences using that day's grammar — 5 statements, 2 questions, 1 negative; each 3–8 words; `uz` natural Uzbek.
- `test`: `null` for days 1–24. Day 25 has `units: []` and a `test` object:
  ```json
  "test": { "choice": [40 items like exercises.choice, covering all 24 days, ~2 per day, in course order] }
  ```

## Level guard (what NOT to do)
- No present perfect continuous, no conditionals, no reported speech, no relative clauses, no "used to".
- Present perfect: only *have/has + past participle* with *ever/never/just/already/yet* in simple sentences.
- Passive: only present simple passive (*is made, are grown*).
- Past simple irregulars: only these 15 — went, had, saw, ate, bought, made, got, came, took, gave, met, wrote, read, slept, drank.
- Avoid rare words. If a word is not in a Round-Up 2 book, don't use it.
- Exercises test exactly what the rule says — a student who read the rule and examples must be able to do them.

## Day → unit map (teacher's plan; do not change)
| Day | Units (id. title) |
| --- | --- |
| 1 | 1. 3 golden rules of English (S) |
| 2 | 2. Personal pronouns · 3. to be |
| 3 | 4. Demonstrative pronouns (this/that/these/those) · 5. have got |
| 4 | 6. Possessives (my/your… + 's) · 7. can/can't · 8. The imperative |
| 5 | 9. Prepositions of place · 10. there is / there are |
| 6 | 11. Present simple |
| 7 | 12. Present continuous |
| 8 | 13. Prepositions of time (at/on/in) · 14. going to |
| 9 | 15. Future simple (will) |
| 10 | 16. Adverbs (of manner + frequency) · 17. some / any |
| 11 | 18. much / many · 19. a little / a few |
| 12 | 20. Reflexive pronouns (myself…) |
| 13 | 21. Would you like…? · 22. should |
| 14 | 23. may / might · 24. must / mustn't |
| 15 | 25. Past simple |
| 16 | 26. too / enough |
| 17 | 27. Comparatives and superlatives |
| 18 | 28. Present perfect |
| 19 | 29. Purpose: to + verb (I went to the shop to buy…) |
| 20 | 30. Past continuous |
| 21 | 31. How long does it take…? |
| 22 | 32. Do you know where…? / I don't know what… |
| 23 | 33. Infinitive / gerund (want to, like doing) |
| 24 | 34. Passive voice — present simple |
| 25 | Final test (40 choice items) |

Day 1 unit "3 golden rules": 1) Har gapda ega bor (I, you, he, she, it, we, they yoki ot). 2) Har gapda feʼl bor (be yoki boshqa feʼl). 3) Soʻz tartibi doim: Ega + Feʼl + qolgani. Teach with examples; exercises: find the subject / find the verb / order.

## Validation
Run `node tools/validate.js` — it checks counts, key indexes, answer-in-options, glossary coverage, Cyrillic, apostrophes. Fix every error it prints.
