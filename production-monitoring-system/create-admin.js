const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function createAdmin() {
    try {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await db.query("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['admin', hashedPassword, 'admin']);
        console.log('SUCCESS: Admin user created manually.');
    } catch (e) {
        console.error('ERROR:', e.message);
    }
}

createAdmin();
