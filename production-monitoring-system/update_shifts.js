const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Revert to A, B, C (using "Shift A" for better UI, or just "A"? User said "shift A B C". Let's use "Shift A")
    db.run("UPDATE shifts SET shift_name = 'Shift A' WHERE shift_name = '1st Shift'");
    db.run("UPDATE shifts SET shift_name = 'Shift B' WHERE shift_name = '2nd Shift'");
    db.run("UPDATE shifts SET shift_name = 'Shift C' WHERE shift_name = '3rd Shift'");
    // Handle case where they might still be A, B, C (idempotent-ish)
    db.run("UPDATE shifts SET shift_name = 'Shift A' WHERE shift_name = 'A'");
    db.run("UPDATE shifts SET shift_name = 'Shift B' WHERE shift_name = 'B'");
    db.run("UPDATE shifts SET shift_name = 'Shift C' WHERE shift_name = 'C'");

    console.log("Shifts renamed to Shift A, Shift B, Shift C.");
});

db.close();
