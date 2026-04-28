const admin = require('firebase-admin');

// Firebase Config (Embedded)
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
};

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const firestore = admin.firestore();

async function peek() {
  console.log('--- MENGINTIP 10 DATA TERBARU KAS ANGKUTAN ---');
  const snapshot = await firestore.collection('kasAngkutan').limit(10).get();
  snapshot.docs.forEach(doc => {
    console.log(`ID: ${doc.id}`);
    console.log(JSON.stringify(doc.data(), null, 2));
    console.log('-----------------------------------');
  });
  process.exit();
}

peek();
