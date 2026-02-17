const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function testLogin() {
    const username = 'admin';
    const password = 'admin123';

    console.log('Testing DB connection...');
    try {
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        console.log('DB Query result:', users);

        if (users.length === 0) {
            console.error('User not found!');
            return;
        }

        const user = users[0];
        console.log('User found:', user.username);
        console.log('Stored hash:', user.password);

        console.log('Testing bcrypt.compare...');
        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Password match result:', isMatch);

        if (isMatch) {
            console.log('LOGIN SUCCESS!');
        } else {
            console.log('LOGIN FAILED!');
        }

    } catch (error) {
        console.error('ERROR:', error);
    }
}

testLogin();
