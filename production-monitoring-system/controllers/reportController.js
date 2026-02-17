const db = require('../config/db');
const xlsx = require('xlsx');

exports.getDailyReport = async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0];

        const [rows] = await db.query(`
            SELECT 
                m.id as machine_id,
                m.machine_name,
                m.cell,
                s.shift_name,
                COALESCE(SUM(d.good_count), 0) as total_good,
                COALESCE(SUM(d.reject_count), 0) as total_reject,
                COALESCE(SUM(d.runtime_seconds), 0) as total_runtime,
                COALESCE(SUM(d.downtime_seconds), 0) as total_downtime
            FROM machines m
            CROSS JOIN shifts s
            LEFT JOIN production_data d ON d.machine_id = m.id AND d.shift_id = s.id AND DATE(d.timestamp) = ?
            GROUP BY m.id, s.id
            ORDER BY s.shift_name, m.machine_name
        `, [date]);

        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.exportReport = async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0];

        // 1. Fetch Machine Detailed Data
        const [machineRows] = await db.query(`
            SELECT 
                m.machine_name,
                m.cell,
                s.shift_name,
                COALESCE(SUM(d.good_count), 0) as good,
                COALESCE(SUM(d.reject_count), 0) as reject,
                COALESCE(SUM(d.runtime_seconds), 0) as runtime_sec,
                COALESCE(SUM(d.downtime_seconds), 0) as downtime_sec
            FROM machines m
            CROSS JOIN shifts s
            LEFT JOIN production_data d ON d.machine_id = m.id AND d.shift_id = s.id AND DATE(d.timestamp) = ?
            GROUP BY m.id, s.id
            ORDER BY s.shift_name, m.machine_name
        `, [date]);

        // 2. Fetch Cell Summary Data
        const [cellRows] = await db.query(`
            SELECT 
                m.cell,
                COALESCE(SUM(d.good_count), 0) as good,
                COALESCE(SUM(d.reject_count), 0) as reject,
                COALESCE(SUM(d.runtime_seconds), 0) as runtime,
                COALESCE(SUM(d.downtime_seconds), 0) as downtime
            FROM machines m
            LEFT JOIN production_data d ON d.machine_id = m.id AND DATE(d.timestamp) = ?
            GROUP BY m.cell
        `, [date]);

        // 3. Fetch 7-Day Trend Data
        const [trendRows] = await db.query(`
            SELECT 
                DATE(timestamp) as day,
                SUM(good_count) as good,
                SUM(reject_count) as reject,
                SUM(runtime_seconds) as runtime,
                SUM(downtime_seconds) as downtime
            FROM production_data
            WHERE timestamp >= DATE('now', '-7 days')
            GROUP BY DATE(timestamp)
            ORDER BY day DESC
        `);

        const wb = xlsx.utils.book_new();

        // --- Sheet 1: Production Detail ---
        const detailData = machineRows.map(r => {
            const total = (r.good || 0) + (r.reject || 0);
            const totalTime = (r.runtime_sec || 0) + (r.downtime_sec || 0);
            return {
                "Shift": r.shift_name,
                "Machine Name": r.machine_name,
                "Cell": r.cell,
                "Good": r.good,
                "Reject": r.reject,
                "Runtime (s)": r.runtime_sec,
                "Downtime (s)": r.downtime_sec,
                "Availability (%)": totalTime > 0 ? Math.round((r.runtime_sec / totalTime) * 100) + '%' : '0%',
                "OEE (%)": total > 0 ? Math.round((r.good / total) * 100) + '%' : '0%'
            };
        });
        const wsDetail = xlsx.utils.json_to_sheet(detailData);
        wsDetail['!cols'] = [{ wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }];
        wsDetail['!autofilter'] = { ref: `A1:I${detailData.length + 1}` };
        xlsx.utils.book_append_sheet(wb, wsDetail, "Production Detail");

        // --- Sheet 2: Cell Summary ---
        const cellSummary = cellRows.map(r => {
            const total = (r.good || 0) + (r.reject || 0);
            return {
                "Cell": r.cell,
                "Total Good": r.good,
                "Total Reject": r.reject,
                "Efficiency (%)": total > 0 ? Math.round((r.good / total) * 100) + '%' : '0%',
                "Total Runtime (s)": r.runtime,
                "Total Downtime (s)": r.downtime
            };
        });
        const wsCell = xlsx.utils.json_to_sheet(cellSummary);
        wsCell['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
        wsCell['!autofilter'] = { ref: `A1:F${cellSummary.length + 1}` };
        xlsx.utils.book_append_sheet(wb, wsCell, "Cell Summary");

        // --- Sheet 3: 7-Day Trends ---
        const trendData = trendRows.map(r => {
            const total = (r.good || 0) + (r.reject || 0);
            return {
                "Date": r.day,
                "Good Parts": r.good,
                "Bad Parts": r.reject,
                "OEE Trend (%)": total > 0 ? Math.round((r.good / total) * 100) + '%' : '0%'
            };
        });
        const wsTrend = xlsx.utils.json_to_sheet(trendData);
        wsTrend['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
        wsTrend['!autofilter'] = { ref: `A1:D${trendData.length + 1}` };
        xlsx.utils.book_append_sheet(wb, wsTrend, "7-Day Trends");

        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', `attachment; filename="Production_Report_${date}.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        console.error("Export Error:", error);
        res.status(500).json({ message: error.message });
    }
};
