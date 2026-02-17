const db = require('./config/db');

async function checkUser() {
    try {
        const [users] = await db.query("SELECT id, username, role FROM users");
        console.log('Users in database:');
        console.log(users);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkUser();
