const db = require('./config/db');

async function migrateMachines() {
    try {
        console.log('Migrating machine IO settings...');

        // Update io_good if null, using io_good_count or default '0'
        await db.query(`UPDATE machines SET io_good = COALESCE(io_good_count, '0') WHERE io_good IS NULL`);

        // Update io_reject if null, using io_reject_count or default '1'
        await db.query(`UPDATE machines SET io_reject = COALESCE(io_reject_count, '1') WHERE io_reject IS NULL`);

        // Update io_status if null (though it seemed populated)
        await db.query(`UPDATE machines SET io_status = '2' WHERE io_status IS NULL`);

        console.log('Migration completed.');

        const [machines] = await db.query('SELECT * FROM machines LIMIT 5');
        console.log('Sample Data:', machines);

    } catch (error) {
        console.error('Migration Error:', error);
    }
}

migrateMachines();
