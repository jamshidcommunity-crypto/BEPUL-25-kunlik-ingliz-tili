# Beginner 25 — Imamov Academy

25 kunlik bepul boshlangʻich ingliz tili kursi: ilova (PWA) + Telegram referral bot **@InglizTili0danBot**.
AI yoʻq — hamma mashq kalit boʻyicha tekshiriladi.

## Qanday ishlaydi
1. Oʻquvchi botga kiradi → shaxsiy havola oladi.
2. 3 ta doʻsti shu havola orqali botga kirib (Start), **ikkala kanalga** (@jamshid_akhatkulov_en va @Imamov_academy) qoʻshiladi — bot qoʻshilganini oʻzi koʻradi, hech qanday tugma bosish shart emas; doʻst avtomatik hisobga oʻtadi.
3. 3 ta doʻst tasdiqlangach bot **ilova kodini** (`B25-XXXXX`) va **yopiq kanalga 1 martalik havola** beradi.
4. Oʻquvchi ilovani ochib kodni kiritadi; natijalari avtomatik botga yoziladi (`/holat`), siz `/natija` va `/stat` bilan koʻrasiz.
5. **Kunlar qanday ochiladi.** Siz botda `/boshlash 2026-10-27` deb kurs boshlanish sanasini qoʻyasiz (Day 1). Shundan keyin har yarim tunda kalendar boʻyicha bitta yangi kun ochiladi va 08:00 da hammaga eʼlon ketadi. Lekin oʻquvchi **keyingi kunga faqat oldingi kunning hamma darslarini (18 ta mashqning hammasi bajarilgan boʻlsa — ball muhim emas) va shadowingini tugatgandan keyin** oʻtadi. Ball 14 dan past boʻlsa, «Xatolar tahlili» koʻrsatiladi va «Tushundim» bosilmaguncha keyingi tugma ishlamaydi; qayta ishlab ballni oshirish mumkin — ya'ni ikkita qulf bor: kalendar (oldinga sakrab boʻlmaydi) va bajarilganlik (tashlab ketib boʻlmaydi). Orqada qolgan oʻquvchi bir kunda bir nechta kunni ketma-ket bajarib yetib olishi mumkin.

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
| `CLOSED_CHANNEL_ID` | `-100…` (yopiq kanal; `-100` siz yozsangiz ham bot oʻzi toʻgʻrilaydi) |
| `CLOSED_INVITE_LINK` | *ixtiyoriy* — yopiq kanalning doimiy havolasi; bot bir martalik havola yarata olmasa shu beriladi |
| `APP_URL` | `https://<sayt>.netlify.app` |
| `ADMIN_IDS` | sizning Telegram ID (vergul bilan bir nechta) |
| `MASTER_CODE` | masalan `B25-ADMIN` — siz uchun doimiy kod |
| `WEBHOOK_SECRET` | istalgan uzun tasodifiy satr |
| `FIREBASE_SERVICE_ACCOUNT` | service-account JSON (butun matn yoki base64) |
| `REQUIRED_INVITES` | `3` |

- Deploy tugagach webhookni ulang — brauzerda bitta havolani oching:
  `https://<sayt>.netlify.app/.netlify/functions/setup?key=<WEBHOOK_SECRET>`
  Sahifa «✅ Bot ulandi» deb, bot qaysi kanallarda admin ekanini va **yopiq kanalga havola yarata olishini** ham koʻrsatadi (yopiq kanalda botga «Invite users via link» huquqi kerak). (Bu havola webhookni *chat_member* hodisalari bilan ulaydi — avtomatik hisoblash uchun shart.)
- Netlify’da **Project configuration → Access & security → Team protection** oʻchirilgan boʻlsin (aks holda Telegram 401 oladi).
- Tekshirish: botga `/start` yozing.

## Avtomatik xabarlar
- 08:00 — yangi kun eʼloni: «Kecha N kishi Day X ni tugatdi 👏»; oldingi kunni tugatmaganlarga «avval uni yakunlang» eslatmasi.
- 19:00 — 2 kun faol boʻlmaganlarga eslatma; yakshanba — haftaning top-5.
- Ilovada «Reyting» sahifasida «Sizning jamoangiz» — oʻquvchi, uni taklif qilgan doʻsti va u taklif qilganlar mini-reytingi.
- Yakuniy testdan oʻtganda — tabrik + «Keyingi bosqichga yozilish» tugmasi; sertifikat sahifasida ham shu.

## Bot buyruqlari
Oʻquvchi: `/start`, `/havola`, `/holat`, `/kod`, `/keyingi` (keyingi bosqich — Elementary kursiga ariza; sizga karta keladi), `/yopiq` (yopiq kanal havolasi — kod bilan birga keladi, kelmagan boʻlsa shu buyruq qayta urinadi). Kanalga qoʻshilgan doʻst avtomatik hisoblanadi (bot ikkala kanalda admin boʻlishi shart).
Admin: `/stat` (statistika + boshlanish sanasi), `/natija` (oʻquvchilar natijalari), `/boshlash YYYY-MM-DD` (kurs boshlanish sanasi = Day 1), `/kun N` (bugunni Day N deb belgilash), `/eslat` (bugungi kun eʼlonini hozir yuborish), `/sorov [savol]` (onlayn darsdan keyin 1 savollik soʻrov: 👍/😐/👎 — hammaga ketadi), `/sorovnatija` (oxirgi soʻrov natijasi), `/arizalar` (keyingi bosqichga yozilganlar), `/yopiqtest` (yopiq kanal havolasi ishlashini tekshirish), `/yopiqyubor` (kod olib havola olmaganlarga yopiq kanal havolasini yuborish; `/yopiqyubor hammaga` — barcha kod egalariga), `/kodber <user_id>` (kodni majburan berish).

## Kontentni oʻzgartirish
1. `data/dayNN.json` ni tahrirlang (format: `tools/CONTENT_SPEC.md`).
2. `node tools/validate.js` → 0 errors.
3. `node tools/build.js` → `course.js` va `index.html` yangilanadi.
4. GitHub ga push → Netlify avtomatik chiqaradi.

## Ilova
- Kod bilan kirish; `DEMO` kodi — serversiz sinov (natija yuborilmaydi).
- Orqaga: telefon «orqaga» tugmasi va kompyuterda **Esc** — bir qadam orqaga; bosh sahifada chiqish uchun ikki marta bosiladi.
- Oʻrnatish: kirish sahifasida va birinchi kirishdan keyin «Ilova qilib oʻrnating» — Android/kompyuterda bir tugma, iPhone’da Safari koʻrsatmasi, Telegram ichida ochilsa «Brauzerda ochish» koʻrsatmasi. Bot kodni `?code=` bilan havola qilib yuboradi — ilova kodni oʻzi toʻldiradi.
- Shadowing brauzer ovozi bilan (TTS). Oʻz ovozingizni qoʻshish uchun `shadowing[].audio` maydoniga MP3 yoʻlini qoʻyish mumkin (keyingi versiyada).
