async function testDeployedInsert() {
  const table = 'drivers';
  const data = {
    id: 'DRV-REMOTE-' + Date.now(),
    name: 'REMOTE TEST',
    plat: 'B 1234 ABC',
    branch: 'SRAGEN'
  };

  const url = 'https://tanimakmur.pages.dev/api/insert-record'; // Assuming this is the URL
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, data })
    });
    const result = await res.json();
    console.log('Result:', result);
  } catch (e) {
    console.error('Error:', e.message);
  }
}

// testDeployedInsert(); 
// Wait, I can't fetch tanimakmur.pages.dev from here if it has CORS or something? 
// Actually, I can try to fetch the Turso API directly using the token from here.
