const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error(err.message);
    else {
        console.log('Connected to the SQLite database.');
        checkSchema();
    }
});

function checkSchema() {
    db.all("PRAGMA table_info(machines)", [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return;
        }
        console.log('Machines Table Columns:');
        rows.forEach(row => console.log(`- ${row.name} (${row.type})`));
        process.exit();
    });
}
