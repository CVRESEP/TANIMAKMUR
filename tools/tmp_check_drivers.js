const { createClient } = require('@libsql/client');
const turso = createClient({
  url: 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function run() {
  try {
    const tableInfo = await turso.execute('PRAGMA table_info(drivers)');
    console.log(tableInfo.rows);
    const cols = tableInfo.rows.map(r => r.name);
    if (!cols.includes('branch')) {
      console.log('Adding branch column to drivers table...');
      await turso.execute('ALTER TABLE drivers ADD COLUMN branch TEXT');
      console.log('Done!');
    } else {
      console.log('Branch column already exists');
    }
  } catch (e) {
    console.error(e);
  }
}
run();
