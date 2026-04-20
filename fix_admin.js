const TURSO_URL = 'https://tanimakmur-cvresep.aws-ap-northeast-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag';

async function fixAdmin() {
    const requests = [
        // Delete all corrupted admin entries
        { type: "execute", stmt: { sql: "DELETE FROM users WHERE username LIKE 'admin%'", args: [] } },
        // Re-insert clean OWNER account
        { 
            type: "execute", 
            stmt: { 
                sql: "INSERT INTO users (username, name, role, branch, password) VALUES (?, ?, ?, ?, ?)", 
                args: [
                    { type: "text", value: "admin" },
                    { type: "text", value: "Administrator Utama" },
                    { type: "text", value: "OWNER" },
                    { type: "text", value: "ALL" },
                    { type: "text", value: "admin" }
                ] 
            } 
        }
    ];
    const res = await fetch(`${TURSO_URL}/v2/pipeline`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${TURSO_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}

fixAdmin();
