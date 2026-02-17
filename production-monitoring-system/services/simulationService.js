const db = require('../config/db');

class SimulationService {
    constructor(io) {
        this.io = io;
        this.running = false;
    }

    start() {
        if (this.running) return;
        this.running = true;
        console.log('Starting Simulation Service...');

        // Run every 5 seconds
        setInterval(() => this.runSimulation(), 5000);
    }

    async runSimulation() {
        try {
            // Get all machines with type 'simulation'
            const [machines] = await db.query("SELECT * FROM machines WHERE plc_type = 'simulation'");
            if (machines.length === 0) return;

            // Determine current shift
            // Logic: A (6-14), B (14-22), C (22-6)
            // MySQL TIME comparison might be tricky with midnight crossing
            // Let's do it in JS for safety/ease
            const now = new Date();
            const hour = now.getHours();
            let shiftName = 'A';
            if (hour >= 14 && hour < 22) shiftName = 'B';
            else if (hour >= 22 || hour < 6) shiftName = 'C';

            const [shifts] = await db.query("SELECT * FROM shifts WHERE shift_name = ?", [shiftName]);
            const currentShift = shifts[0] || { id: 1 };

            for (const machine of machines) {
                // Simulate random status change (mostly RUN 80%)
                const status = Math.random() > 0.2 ? 'RUN' : 'STOP';

                // Simulate production counts if RUN
                let goodCountInc = 0;
                let rejectCountInc = 0;

                if (status === 'RUN') {
                    goodCountInc = Math.floor(Math.random() * 5) + 1; // 1-5 parts
                    rejectCountInc = Math.random() > 0.95 ? 1 : 0; // 5% chance of reject
                }

                // Update machine status in DB
                await db.query("UPDATE machines SET status = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?", [status, machine.id]);

                // Insert raw tick data (simulating 5 seconds of activity)
                await db.query(`
                    INSERT INTO production_data (machine_id, shift_id, good_count, reject_count, runtime_seconds, downtime_seconds)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [machine.id, currentShift.id, goodCountInc, rejectCountInc, status === 'RUN' ? 5 : 0, status === 'STOP' ? 5 : 0]);

                // Emit update via Socket.io
                this.io.emit('machine_update', {
                    machine_id: machine.id,
                    status: status,
                    good_count_inc: goodCountInc,
                    reject_count_inc: rejectCountInc,
                    shift: shiftName
                });
            }
        } catch (error) {
            console.error('Simulation Error:', error);
        }
    }
}

module.exports = SimulationService;
