const db = require('../config/db');

exports.getAllMachines = async (req, res) => {
    try {
        const [machines] = await db.query('SELECT * FROM machines');
        res.json(machines);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createMachine = async (req, res) => {
    try {
        const { machine_name, cell, plc_type, ip_address, io_good, io_reject, io_status } = req.body;
        const [result] = await db.query('INSERT INTO machines (machine_name, cell, plc_type, ip_address, io_good, io_reject, io_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [machine_name, cell, plc_type, ip_address, io_good, io_reject, io_status]);
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getMachineStats = async (req, res) => {
    try {
        // Get aggregated stats for today per machine
        const [stats] = await db.query(`
            SELECT 
                data.machine_id,
                m.machine_name,
                SUM(data.good_count) as total_good,
                SUM(data.reject_count) as total_reject,
                SUM(data.runtime_seconds) as total_runtime,
                SUM(data.downtime_seconds) as total_downtime
            FROM production_data data
            JOIN machines m ON data.machine_id = m.id
            WHERE date(data.timestamp) = date('now', 'localtime')
            GROUP BY data.machine_id
        `);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateMachine = async (req, res) => {
    try {
        const { id } = req.params;
        const { machine_name, ip_address, plc_type, cell, io_good, io_reject, io_status } = req.body;

        // Dynamic update query
        await db.query(`UPDATE machines SET 
            machine_name = COALESCE(?, machine_name),
            ip_address = COALESCE(?, ip_address),
            plc_type = COALESCE(?, plc_type),
            cell = COALESCE(?, cell),
            io_good = COALESCE(?, io_good),
            io_reject = COALESCE(?, io_reject),
            io_status = COALESCE(?, io_status)
            WHERE id = ?`,
            [machine_name, ip_address, plc_type, cell, io_good, io_reject, io_status, id]);

        res.json({ message: 'Machine updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.resetAllCounters = async (req, res) => {
    try {
        // 1. For real PLCs, we set the current reading as the base offset
        // We sum up today's production data to find the current "absolute" dashboard value
        const [stats] = await db.query(`
            SELECT machine_id, SUM(good_count) as total_good, SUM(reject_count) as total_reject
            FROM production_data 
            WHERE date(timestamp) = date('now', 'localtime')
            GROUP BY machine_id
        `);

        if (stats && stats.length > 0) {
            for (const s of stats) {
                // Add today's total to the existing offset
                await db.query("UPDATE machines SET good_offset = good_offset + ?, reject_offset = reject_offset + ? WHERE id = ?",
                    [s.total_good || 0, s.total_reject || 0, s.machine_id]);
            }
        }

        // 2. Clear today's production data
        await db.query("DELETE FROM production_data WHERE date(timestamp) = date('now', 'localtime')");

        res.json({ message: 'All counters reset successfully' });
    } catch (error) {
        console.error('Reset Error:', error);
        res.status(500).json({ message: error.message });
    }
};
