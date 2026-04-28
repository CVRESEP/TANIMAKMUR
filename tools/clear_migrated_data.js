const { createClient } = require("@libsql/client");

const TURSO_URL = 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag';
const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

async function clearData() {
    console.log("🧹 Clearing Migrated Data from Turso...");

    try {
        const tables = ['penebusan', 'pengeluaran', 'penyaluran', 'kas_angkutan', 'kas_umum', 'products'];
        
        for (const table of tables) {
            console.log(`Deleting all from ${table}...`);
            await turso.execute(`DELETE FROM "${table}"`);
        }

        // For users, only delete KIOS role to keep admins safe
        console.log("Deleting users with role 'KIOS'...");
        await turso.execute(`DELETE FROM users WHERE role = 'KIOS'`);

        console.log("✨ All migrated data cleared successfully!");
    } catch (error) {
        console.error("💥 Error during clear:", error);
    } finally {
        process.exit();
    }
}

clearData();
