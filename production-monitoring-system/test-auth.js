const bcrypt = require('bcryptjs');
const session = require('express-session');
const db = require('./config/db');

console.log('Modules loaded successfully');

async function test() {
    try {
        const hash = await bcrypt.hash('test', 10);
        console.log('Hash generated:', hash);

        // Test DB connection
        const users = await db.query('SELECT * FROM users');
        console.log('Users table accessed:', users);

    } catch (e) {
        console.error('Test Failed:', e);
    }
}

test();
