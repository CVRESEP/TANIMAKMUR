const admin = require("firebase-admin");
const { createClient } = require("@libsql/client");

// Turso Config
const TURSO_URL = 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag';
const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

// Firebase Config
const serviceAccount = {
  "type": "service_account",
  "project_id": "tani-makmur-zf400",
  "private_key_id": "927b6f407cbd5018c1f8f3411ca0b6325b4c609e",
  "private_key": "-----BEGIN PRIVATE KEY-----\n" + 
    "MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDpts//uIF49UOZ\n" +
    "reKN99/0+SwHvmYLx/uk5iGmEkfQ9Rm0y2j+KdaOf1uf6k0prfLKAA3QUl8aSYDh\n" + 
    "5mWUeFfsIvkX8IFzcQX6/CCQiWDUAT7b7zSZC3in9xS+3dLJhlHhwl1lBLnUwzWL\n" + 
    "foW0lhQg4WEpb+1Pj9heKmEwAP1wU3owFlkks/xrvbR3r7J1zv6PY8+pijfqvPfW\n" + 
    "aCD+2hK89Vmpi8hMzpnBgPXgB2312/LyWdkNz2kTVcAY5s3GxtFh0bzggrpMo2Z+\n" + 
    "vWj1nCN4IoknHgbyPaMUXgoHVFczqSGP/cCRruCqqgx8rG5m7ecv+rMYtgG9Buj5\n" + 
    "RDf7ipjzAgMBAAECggEAOqLho5Rsc2cBi1yLgzfl6gXb7KNx4dHOSmxsk8hxWTUt\n" + 
    "OmVwVZg0mvLMD56Otn7Mc664yIPqFWPMoKCX6ryYvod1vHJcYBTCvdok5254KyiW\n" + 
    "10I4DY/JuUZt34cy29nF0GDd4rrhTsadN/7J1+lxamBxap6IyRXbYKC8WnldHKFy\n" + 
    "NPyHky+hiRmKpaIwgFxo8x+L5og8Sp0G7NLKXmENiqGVmD6AjvXqBBKhNynjGeJL\n" + 
    "oLl1o4/bT0rhEwaXbyet/P46t54FDEvOLT/HLrfrKlxzR3zSdXON7stsW/NsOhUJ\n" + 
    "BV1t8itLsqGKtLZpQyXH6vjLlb5QmIBGDMmNeuBoMQKBgQD7dDWwE8sLXR7UgrLw\n" + 
    "WwFZVFOZXucumZlIA6E1tcf2NpNRM7g8mvI6aj0JUVLvnkonRcjV+kXvfiujjWvl\n" + 
    "9T86ER/w4BUJdbSYwOT27tEBzbKIIibgQXzHbL3X0qaegvNzS2xzWdmWIMOmgoag\n" + 
    "q0YwiY7PqMqen8sXLA+FFxofowKBgQDt8H+dhpiLqGIEmMuubJc9t4xwpPvoyXpq\n" + 
    "ZNaMO0cId/qyA4eh37yMhgSbR9Lfg6nnlvhnHgHr//u3fDwtUQSaeR36Rr54V1AK\n" + 
    "96nG9SzU0431FCDiwcFDvxVUhdBuQLr9AP9DdlsssXlEYdaORW2bgDny26tMVsm7\n" + 
    "4QAx0LT2cQKBgCAZT5kwjaTfuEXMgWcpVty+ZQWZFc3fEbAdtoCSufn2MYwWHBiw\n" + 
    "dud6FFySIxIvlKu6vs6B6leONaflL7blPbL96KPpFwZkHi+5wAC9r7SZO4chRPEv\n" + 
    "quwSN5HLdDWb5dP79tYqzBncCN3Cn8j21Djx9mcP1v20zEoi98A3mMAdAoGBAKoH\n" + 
    "Yio/NGMYQHLofSR3lNwVfdZBD4KZ91BwHqC2+1uh4RO0UgfqyeHhIwmTmaz/eTp1\n" + 
    "N6z4VIdAta+4p4f6jT+VrUZbp2B3hEtSD5CNQywSwS6Q468mpeSzd5qexQMEXprN\n" + 
    "S5v5x814RSAIijnAg0LLrp1NPGug2SfY8Tqn2akBAoGAVS7NHGZijxfH583tqg/Y\n" + 
    "vfT3yNkxE/Y3bm/ZilAwigUfTfhp3L92b9A1Ynogvc8E69yGGcE2Jn5aSS0WgWCY\n" + 
    "TIg6uVAVmz44UIwBsSCJuAREJVXzrkxJdSVtV0LbDyvLkxdy754MMaT1M9nCuJdb\n" + 
    "5ju6iwvOMxEE3eMDBL9zWxM=\n" +
    "-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@tani-makmur-zf400.iam.gserviceaccount.com",
  "client_id": "107638124364090226246",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40tani-makmur-zf400.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const firestore = admin.firestore();

async function migrate() {
  console.log("🚀 Starting Migration (Round 2) from Firestore...");

  try {
    // 1. PENYALURAN KIOS
    console.log("📦 Migrating Penyaluran Kios...");
    const pSnapshot = await firestore.collection("penyaluranKios").get();
    const pStatements = pSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        sql: `INSERT OR REPLACE INTO penyaluran (id, orderId, kios, product, qty, branch, date, status, driver, nominal, statusBayar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          doc.id,
          data.nomorPenyaluran || doc.id,
          data.namaKios || "",
          data.namaProduk || "",
          data.qty || 0,
          data.kabupaten || "MAGETAN",
          data.tanggal || "",
          "DIKIRIM",
          data.namaSopir || "",
          data.total || 0,
          data.keterangan || "BELUM LUNAS"
        ]
      };
    });
    if (pStatements.length) {
        const chunks = chunkArray(pStatements, 50);
        for (const chunk of chunks) await turso.batch(chunk, "write");
    }
    console.log(`✅ Migrated ${pStatements.length} penyaluran records.`);

    // 2. PENGELUARAN DO
    console.log("📦 Migrating Pengeluaran DO...");
    const gSnapshot = await firestore.collection("pengeluaranDo").get();
    const gStatements = gSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        sql: `INSERT OR REPLACE INTO pengeluaran (id, "do", date, keluar, tebus) VALUES (?, ?, ?, ?, ?)`,
        args: [
          `MIG-${doc.id}`,
          doc.id,
          data.tanggal || "",
          data.qty || 0,
          0
        ]
      };
    });
    if (gStatements.length) {
        const chunks = chunkArray(gStatements, 50);
        for (const chunk of chunks) await turso.batch(chunk, "write");
    }
    console.log(`✅ Migrated ${gStatements.length} pengeluaran records.`);

    console.log("\n✨ MIGRATION ROUND 2 COMPLETED!");

  } catch (error) {
    console.error("\n💥 Error during migration:", error);
  } finally {
    process.exit();
  }
}

function chunkArray(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

migrate();
