const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Register a new user (Internal/Admin only)
exports.register = async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hashedPassword, role || 'operator']);
        res.status(201).json({ message: 'User created' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.login = async (req, res) => {
    const { username, password } = req.body;
    console.log(`[LOGIN ATTEMPT] Username: ${username}, Password length: ${password ? password.length : 0}`);

    try {
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        console.log(`[LOGIN DEBUG] Users found: ${users.length}`);

        if (users.length === 0) {
            console.log('[LOGIN FAILED] User not found');
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];
        console.log(`[LOGIN DEBUG] User found: ${user.username}, Hash: ${user.password}`);

        const isMatch = await bcrypt.compare(password, user.password);
        console.log(`[LOGIN DEBUG] Password match: ${isMatch}`);

        if (!isMatch) {
            console.log('[LOGIN FAILED] Password mismatch');
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Set Session
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;

        console.log('[LOGIN SUCCESS] Session set');

        res.json({ message: 'Login successful', user: { username: user.username, role: user.role } });
    } catch (error) {
        console.error('[LOGIN ERROR]', error);
        res.status(500).json({ message: error.message });
    }
};

exports.logout = (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ message: 'Could not log out' });
        res.json({ message: 'Logout successful' });
    });
};

exports.checkAuth = (req, res) => {
    if (req.session.userId) {
        res.json({ authenticated: true, user: req.session.username });
    } else {
        res.json({ authenticated: false });
    }
};

// Middleware to protect routes
exports.isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.status(401).json({ message: 'Unauthorized' });
};

// Initialize Admin on startup if none exists (Called from server.js)
exports.initAdmin = async () => {
    try {
        const [users] = await db.query("SELECT * FROM users WHERE username = 'admin'");
        if (users.length === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await db.query("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['admin', hashedPassword, 'admin']);
            console.log('Default admin user created: admin / admin123');
        }
    } catch (err) {
        console.error('Admin Init Error:', err);
    }
};
// Change Password
exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.session.userId;
    console.log(`[AUTH] Change Password attempt for user ID: ${userId}`);

    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        // Get user from DB
        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        const user = users[0];

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        console.log(`[AUTH] Current password match: ${isMatch}`);

        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update DB
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

        console.log(`[AUTH] Password changed successfully for user: ${user.username}`);
        res.json({ message: 'Password changed successfully' });

    } catch (error) {
        console.error('[AUTH] Change Password Error:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

// Verify action password (for settings/resets)
exports.verifyAction = async (req, res) => {
    const { password } = req.body;
    const userId = req.session.userId;
    console.log(`[AUTH] Action verification attempt for user ID: ${userId}`);

    if (!userId) {
        console.log('[AUTH] No user session found');
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            console.log(`[AUTH] User ${userId} not found in DB`);
            return res.status(404).json({ message: 'User not found' });
        }

        const user = users[0];
        console.log(`[AUTH] Verifying password for user: ${user.username}`);

        const isMatch = await bcrypt.compare(password, user.password);
        console.log(`[AUTH] Password match: ${isMatch}`);

        if (isMatch) {
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, message: 'Invalid password' });
        }
    } catch (error) {
        console.error('[AUTH] Verify Action Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = exports;
