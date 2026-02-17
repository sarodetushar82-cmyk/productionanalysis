const db = require('./config/db');

async function checkSchema() {
    try {
        const [tables] = await db.query("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('Tables:', tables);

        const [machineSchema] = await db.query("PRAGMA table_info(machines)");
        console.log('\nMachines Table Schema:');
        console.log(machineSchema);

        const [machines] = await db.query("SELECT * FROM machines LIMIT 1");
        console.log('\nSample Machine:');
        console.log(machines);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSchema();
