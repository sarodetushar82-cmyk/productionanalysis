const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function resetPassword() {
    try {
        console.log('Generating new hash for password: admin123');
        const hashedPassword = await bcrypt.hash('admin123', 10);

        console.log('Updating user admin...');
        await db.query("UPDATE users SET password = ? WHERE username = 'admin'", [hashedPassword]);

        console.log('Password reset successfully.');

        // Verify immediately
        const [users] = await db.query("SELECT * FROM users WHERE username = 'admin'");
        const user = users[0];
        const isMatch = await bcrypt.compare('admin123', user.password);
        console.log('Verification match:', isMatch);

    } catch (error) {
        console.error('Error:', error);
    }
}

resetPassword();
