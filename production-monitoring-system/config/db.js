const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS shifts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shift_name TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS machines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            machine_name TEXT NOT NULL,
            cell TEXT NOT NULL,
            plc_type TEXT NOT NULL,
            ip_address TEXT NOT NULL,
            port INTEGER DEFAULT 502,
            rack INTEGER DEFAULT 0,
            slot INTEGER DEFAULT 1,
            status TEXT DEFAULT 'OFFLINE',
            last_seen TEXT,
            good_offset INTEGER DEFAULT 0,
            reject_offset INTEGER DEFAULT 0,
            io_good TEXT,
            io_reject TEXT,
            io_status TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS production_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            machine_id INTEGER,
            shift_id INTEGER,
            good_count INTEGER DEFAULT 0,
            reject_count INTEGER DEFAULT 0,
            runtime_seconds INTEGER DEFAULT 0,
            downtime_seconds INTEGER DEFAULT 0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (machine_id) REFERENCES machines(id),
            FOREIGN KEY (shift_id) REFERENCES shifts(id)
        )`);

        // Seed Shifts
        db.get("SELECT count(*) as count FROM shifts", (err, row) => {
            if (row.count === 0) {
                const stmt = db.prepare("INSERT INTO shifts (shift_name, start_time, end_time) VALUES (?, ?, ?)");
                stmt.run('A', '06:00:00', '14:00:00');
                stmt.run('B', '14:00:00', '22:00:00');
                stmt.run('C', '22:00:00', '06:00:00');
                stmt.finalize();
            }
        });

        // Seed Machines
        db.get("SELECT count(*) as count FROM machines", (err, row) => {
            if (row.count === 0) {
                const stmt = db.prepare("INSERT INTO machines (machine_name, cell, plc_type, ip_address) VALUES (?, ?, ?, ?)");
                for (let i = 1; i <= 10; i++) {
                    const cell = i <= 3 ? 'Cell 1' : i <= 6 ? 'Cell 2' : i <= 8 ? 'Cell 3' : 'Cell 4';
                    stmt.run(`Machine ${i}`, cell, 'simulation', '127.0.0.1');
                }
                stmt.finalize();
            }
        });
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT DEFAULT 'operator'
        )`);

    });
}

// Wrapper to support async/await interface similar to mysql2/promise
const promiseDb = {
    query: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            if (sql.trim().toUpperCase().startsWith('SELECT')) {
                db.all(sql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve([rows]); // Wrap in array to match mysql2 format [rows, fields] behavior approx
                });
            } else {
                db.run(sql, params, function (err) {
                    if (err) reject(err);
                    else resolve([{ insertId: this.lastID, affectedRows: this.changes }]);
                });
            }
        });
    }
};

module.exports = promiseDb;
