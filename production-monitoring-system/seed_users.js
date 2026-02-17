const db = require('./config/db');

async function seedUser() {
    try {
        const [users] = await db.query("SELECT * FROM users WHERE username = 'Tushar_sarode'");
        if (users.length > 0) {
            console.log('User Tushar_sarode already exists.');
            process.exit(0);
        }

        await db.query("INSERT INTO users (username, password, role) VALUES ('Tushar_sarode', '123456789', 'admin')");
        console.log('User created successfully.');
        console.log('Username: Tushar_sarode');
        console.log('Password: 123456789');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding user:', error);
        process.exit(1);
    }
}

seedUser();
