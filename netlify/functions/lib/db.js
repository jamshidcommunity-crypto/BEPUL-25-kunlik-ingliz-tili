// Firestore access (firebase-admin). Service account JSON comes from env FIREBASE_SERVICE_ACCOUNT
// (either raw JSON or base64 of the JSON).
const admin = require('firebase-admin');

let db = null;
function getDb() {
  if (db) return db;
  if (!admin.apps.length) {
    let raw = process.env.FIREBASE_SERVICE_ACCOUNT || '';
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env var is missing');
    if (!raw.trim().startsWith('{')) raw = Buffer.from(raw, 'base64').toString('utf8');
    const sa = JSON.parse(raw);
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
  db = admin.firestore();
  return db;
}
const col = (name) => getDb().collection(name);
const now = () => admin.firestore.FieldValue.serverTimestamp();
const inc = (n) => admin.firestore.FieldValue.increment(n);

module.exports = { getDb, col, now, inc, admin };
