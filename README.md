# Beginner 25 — Imamov Academy

25 kunlik bepul boshlangʻich ingliz tili kursi: ilova (PWA) + Telegram referral bot **@InglizTili0danBot**.
AI yoʻq — hamma mashq kalit boʻyicha tekshiriladi.

## Qanday ishlaydi
1. Oʻquvchi botga kiradi → shaxsiy havola oladi.
2. 3 ta doʻsti shu havola orqali botga kirib, **ikkala kanalga** (@jamshid_akhatkulov_en va @Imamov_academy) aʼzo boʻladi va «Tekshirish»ni bosadi.
3. 3 ta doʻst tasdiqlangach bot **ilova kodini** (`B25-XXXXX`) va **yopiq kanalga 1 martalik havola** beradi.
4. Oʻquvchi ilovani ochib kodni kiritadi; natijalari avtomatik botga yoziladi (`/holat`), siz `/natija` va `/stat` bilan koʻrasiz.

## Fayllar
| Fayl | Nima |
| --- | --- |
| `index.html` | Ilova (build natijasi — qoʻlda tahrirlanmaydi) |
| `src/index.template.html`, `src/app.js` | Ilovaning manbasi (dizayn, mantiq) |
| `course.js` | Kontent bitta faylda (build natijasi) |
| `data/day01…day25.json` | Har kunning kontenti — **shu yerda tahrirlanadi** |
| `data/config.json` | Kurs nomi, ballar, bot nomi, aloqa |
| `data/glossary_base.json` | Umumiy lugʻat (matnda bosilganda chiqadigan tarjimalar) |
| `netlify/functions/bot.js` | Telegram webhook (referral, kod, yopiq kanal, admin) |
| `netlify/functions/verify.js` | Ilova kodni tekshiradi |
| `netlify/functions/progress.js` | Ilova natijalarni yuboradi |
| `tools/validate.js`, `tools/build.js`, `tools/test_bot.js` | Tekshiruv, yigʻish, bot testi |
| `manifest.json`, `sw.js`, `assets/` | PWA (oʻrnatish, oflayn) |

## Oʻrnatish (bir marta)
### 1. Telegram
- @BotFather → `/newbot` → username `InglizTili0danBot` → **token**ni saqlang.
- Botni **uchala kanalga admin** qiling: @jamshid_akhatkulov_en, @Imamov_academy (aʼzolikni tekshirish uchun) va yopiq kanal (havola yaratish huquqi bilan).
- Yopiq kanalning ID sini oling (`-100…`): kanalga biror xabar yuborib, @userinfobot / @getidsbot orqali, yoki botni admin qilgach `https://api.telegram.org/bot<TOKEN>/getUpdates` dan.
- Oʻz Telegram ID ingizni oling (@userinfobot) — admin buyruqlari uchun.

### 2. Firebase
- Firebase Console → loyiha → Firestore Database yoqing (production mode).
- Project settings → Service accounts → **Generate new private key** → JSON fayl.

### 3. Netlify
- GitHub repo → Netlify «New site from Git». Build command boʻsh, publish `.` (netlify.toml da bor).
- Site settings → Environment variables:

| Oʻzgaruvchi | Qiymat |
| --- | --- |
| `BOT_TOKEN` | BotFather bergan token |
| `BOT_USERNAME` | `InglizTili0danBot` |
| `CHANNEL_1` | `@jamshid_akhatkulov_en` |
| `CHANNEL_2` | `@Imamov_academy` |
| `CLOSED_CHANNEL_ID` | `-100…` (yopiq kanal) |
| `APP_URL` | `https://<sayt>.netlify.app` |
| `ADMIN_IDS` | sizning Telegram ID (vergul bilan bir nechta) |
| `MASTER_CODE` | masalan `B25-ADMIN` — siz uchun doimiy kod |
| `WEBHOOK_SECRET` | istalgan uzun tasodifiy satr |
| `FIREBASE_SERVICE_ACCOUNT` | service-account JSON (butun matn yoki base64) |
| `REQUIRED_INVITES` | `3` |

- Deploy tugagach webhookni ulang (brauzerda oching):
  `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<sayt>.netlify.app/.netlify/functions/bot&secret_token=<WEBHOOK_SECRET>`
- Tekshirish: botga `/start` yozing.

## Bot buyruqlari
Oʻquvchi: `/start`, `/tekshir`, `/havola`, `/holat`, `/kod`.
Admin: `/stat` (statistika), `/natija` (oʻquvchilar natijalari), `/kun N` (ilovada N-kungacha ochish — rebuild shart emas), `/kodber <user_id>` (kodni majburan berish).

## Kontentni oʻzgartirish
1. `data/dayNN.json` ni tahrirlang (format: `tools/CONTENT_SPEC.md`).
2. `node tools/validate.js` → 0 errors.
3. `node tools/build.js` → `course.js` va `index.html` yangilanadi.
4. GitHub ga push → Netlify avtomatik chiqaradi.

## Ilova
- Kod bilan kirish; `DEMO` kodi — serversiz sinov (natija yuborilmaydi).
- Orqaga: telefon «orqaga» tugmasi va kompyuterda **Esc** — bir qadam orqaga; bosh sahifada chiqish uchun ikki marta bosiladi.
- Oʻrnatish: bosh sahifadagi «Ilovani oʻrnatish» — Android/kompyuterda tugma, iPhone’da koʻrsatma.
- Shadowing brauzer ovozi bilan (TTS). Oʻz ovozingizni qoʻshish uchun `shadowing[].audio` maydoniga MP3 yoʻlini qoʻyish mumkin (keyingi versiyada).
