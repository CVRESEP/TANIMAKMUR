const XLSX = require('xlsx');
const path = require('path');

const files = [
    'Export_Penebusan.xlsx',
    'Export_Pengeluaran_DO.xlsx',
    'Export_Penyaluran_Kios.xlsx',
    'Export_Kas_Angkutan.xlsx'
];

files.forEach(file => {
    try {
        const wb = XLSX.readFile(path.join('backups_excel', file));
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        console.log(`\n--- ${file} ---`);
        console.log('Headers:', data[0]);
        console.log('Sample Row:', data[1]);
    } catch (e) {
        console.error(`Error reading ${file}:`, e.message);
    }
});
