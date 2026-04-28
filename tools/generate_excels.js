const admin = require("firebase-admin");
const xlsx = require("xlsx");
const path = require("path");

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

async function generateExcels() {
  console.log("🚀 Exporting Firestore data to Excel...");

  try {
    // 1. KIOSKS
    const kiosksSnapshot = await firestore.collection("kiosks").get();
    const kiosksData = kiosksSnapshot.docs.map(doc => {
      const d = doc.data();
      return {
        "NAMA KIOS": d.name,
        "KABUPATEN": d.kabupaten,
        "KECAMATAN": d.kecamatan,
        "DESA": d.desa,
        "PENANGGUNG JAWAB": d.penanggungJawab,
        "NOMOR TELEPON": d.nomorTelepon || "",
        "PASSWORD": "123"
      };
    });
    saveExcel(kiosksData, "Export_Kiosks.xlsx");

    // 2. PRODUCTS
    const productsSnapshot = await firestore.collection("products").get();
    const productsData = productsSnapshot.docs.map(doc => {
      const d = doc.data();
      return {
        "Nama Produk": d.productName,
        "Supplier": d.supplier,
        "Harga Beli": d.hargaBeli,
        "Harga Jual": d.hargaJual
      };
    });
    saveExcel(productsData, "Export_Products.xlsx");

    // 3. PENEBUSAN
    const penebusanSnapshot = await firestore.collection("penebusan").get();
    const penebusanData = penebusanSnapshot.docs.map(doc => {
      const d = doc.data();
      return {
        "NO DO": d.noDo ? d.noDo.trim() : doc.id,
        "TANGGAL": d.tanggal,
        "KABUPATEN": d.kabupaten,
        "PRODUK": d.namaProduk,
        "QTY (TON)": d.qty,
        "TOTAL NILAI": d.totalPenebusan,
        "KETERANGAN": d.supplier
      };
    });
    saveExcel(penebusanData, "Export_Penebusan.xlsx");

    // 4. KAS UMUM
    const kasUmumSnapshot = await firestore.collection("kasUmum").get();
    const kasUmumData = kasUmumSnapshot.docs.map(doc => {
      const d = doc.data();
      return {
        "TANGGAL": d.tanggal,
        "KETERANGAN": d.uraian,
        "MASUK": d.pemasukan,
        "KELUAR": d.pengeluaran,
        "KABUPATEN": d.kabupaten
      };
    });
    saveExcel(kasUmumData, "Export_Kas_Umum.xlsx");

    // 5. KAS ANGKUTAN
    const kasAngkutanSnapshot = await firestore.collection("kasAngkutan").get();
    const kasAngkutanData = kasAngkutanSnapshot.docs.map(doc => {
      const d = doc.data();
      return {
        "TANGGAL": d.tanggal,
        "DOKUMEN": d.noDo || d.nomorPenyaluran || "",
        "KETERANGAN / SOPIR": d.keterangan || d.namaSopir || "",
        "MASUK": d.tipePengeluaran === 'PEMASUKAN' ? d.nominal : 0,
        "KELUAR": d.tipePengeluaran === 'PENGELUARAN' ? d.nominal : 0,
        "WILAYAH": d.kabupaten,
        "ADMIN": d.admin || 0,
        "SOLAR": d.solar || 0,
        "UPAH": d.upahSopir || 0,
        "MAKAN": d.uangMakan || 0,
        "PALANG": d.palang || 0,
        "LEMBUR": d.lembur || 0,
        "HELPER": d.helper || 0,
        "LAIN-LAIN": d.lainLain || 0
      };
    });
    saveExcel(kasAngkutanData, "Export_Kas_Angkutan.xlsx");

    // 6. PENYALURAN KIOS
    const penyaluranSnapshot = await firestore.collection("penyaluranKios").get();
    const penyaluranData = penyaluranSnapshot.docs.map(doc => {
      const d = doc.data();
      return {
        "TANGGAL": d.tanggal,
        "NO DO": d.noDo,
        "NOMOR PENYALURAN": d.nomorPenyaluran,
        "KIOS": d.namaKios,
        "PRODUK": d.namaProduk,
        "QTY (TON)": d.qty,
        "SOPIR": d.namaSopir,
        "TOTAL TAGIHAN": d.total,
        "STATUS BAYAR": d.keterangan,
        "WILAYAH": d.kabupaten
      };
    });
    saveExcel(penyaluranData, "Export_Penyaluran_Kios.xlsx");

    // 7. PENGELUARAN DO
    const pengeluaranSnapshot = await firestore.collection("pengeluaranDo").get();
    const pengeluaranData = pengeluaranSnapshot.docs.map(doc => {
      const d = doc.data();
      return {
        "TANGGAL": d.tanggal,
        "NO DO": doc.id,
        "JUMLAH KELUAR": d.qty
      };
    });
    saveExcel(pengeluaranData, "Export_Pengeluaran_DO.xlsx");

    console.log("✅ All Excel files generated successfully!");
  } catch (error) {
    console.error("💥 Error during export:", error);
  } finally {
    process.exit();
  }
}

function saveExcel(data, filename) {
  const ws = xlsx.utils.json_to_sheet(data);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "Data");
  xlsx.writeFile(wb, path.join(__dirname, filename));
  console.log(`Saved: ${filename}`);
}

generateExcels();
