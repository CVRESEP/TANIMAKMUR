const { createClient } = require('@libsql/client');
const turso = createClient({
  url:'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken:'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function main() {
    const users = (await turso.execute("SELECT name FROM users WHERE role = 'KIOS'")).rows.map(r => r.name.toUpperCase().trim());
    const pylKiosks = (await turso.execute("SELECT DISTINCT kios FROM penyaluran")).rows.map(r => r.kios.toUpperCase().trim());
    
    console.log("Mengecek sinkronisasi nama kios...");
    
    const missing = pylKiosks.filter(k => !users.includes(k));
    console.log("Kios di Penyaluran tapi tidak di Users:", missing);
    
    // Fuzzy match
    missing.forEach(m => {
        const matches = users.filter(u => {
            // Levenshtein or simple distance
            return u.includes(m) || m.includes(u);
        });
        if (matches.length > 0) {
            console.log(`Mungkin ${m} adalah salah satu dari: ${matches.join(', ')}`);
        }
    });
}
main();
