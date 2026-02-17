const db = require('./config/db');

async function checkMachines() {
    try {
        const [machines] = await db.query('SELECT * FROM machines');
        console.log(`Machines found: ${machines.length}`);
        if (machines.length > 0) {
            console.log(machines);
        } else {
            console.log('No machines found. Seeding defaults...');
            await seedMachines();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function seedMachines() {
    try {
        for (let i = 1; i <= 10; i++) {
            const cell = i <= 3 ? 'Cell 1' : i <= 6 ? 'Cell 2' : i <= 8 ? 'Cell 3' : 'Cell 4';
            await db.query(`INSERT INTO machines (machine_name, cell, plc_type, ip_address) VALUES (?, ?, ?, ?)`,
                [`Machine ${i}`, cell, 'simulation', '127.0.0.1']);
        }
        console.log('Machines seeded successfully.');
    } catch (error) {
        console.error('Seeding error:', error);
    }
}

checkMachines();
