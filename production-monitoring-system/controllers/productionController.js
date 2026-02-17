const db = require('../config/db');

exports.getShiftProduction = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                s.shift_name,
                SUM(d.good_count) as total_good,
                SUM(d.reject_count) as total_reject
            FROM production_data d
            JOIN shifts s ON d.shift_id = s.id
            WHERE date(d.timestamp) = date('now', 'localtime')
            GROUP BY s.shift_name
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getHourlyProduction = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                strftime('%H', timestamp) as hour,
                SUM(good_count) as total_good
            FROM production_data
            WHERE date(timestamp) = date('now', 'localtime')
            GROUP BY strftime('%H', timestamp)
            ORDER BY hour ASC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
