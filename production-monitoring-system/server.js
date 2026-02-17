const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./config/db');

dotenv.config();

const app = express();

// Create HTTP Server
const httpServer = http.createServer(app);

// Create HTTPS Server (if certificates exist)
let httpsServer = null;
const useHttps = process.env.HTTPS === 'true';

if (useHttps) {
    try {
        const privateKey = fs.readFileSync(process.env.SSL_KEY_PATH, 'utf8');
        const certificate = fs.readFileSync(process.env.SSL_CERT_PATH, 'utf8');
        const credentials = { key: privateKey, cert: certificate };
        httpsServer = https.createServer(credentials, app);
        console.log('HTTPS Server configuration initialized');
    } catch (err) {
        console.error('HTTPS Initialization Error:', err.message);
    }
}

// Attach Socket.io to the appropriate server
const server = httpsServer || httpServer;
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authController = require('./controllers/authController');

// Middleware
/*
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'", "https://cdn.jsdelivr.net"], // Allow CDN connect for maps if needed
        },
    },
})); // Secure HTTP headers
*/
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
    origin: (origin, callback) => {
        console.log(`[CORS DEBUG] Request from Origin: ${origin}`);
        const allowed = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'];
        if (!origin || allowed.includes(origin) || allowed.includes('*')) {
            callback(null, true);
        } else {
            console.log(`[CORS BLOCKED] Origin ${origin} not in ${allowed}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.path} from ${req.ip}`);
    next();
});
app.use(express.json());

// Rate Limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiter to auth routes
app.use('/api/auth', authLimiter);

app.use(session({
    secret: process.env.SESSION_SECRET || 'production-monitoring-secret-dev',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        httpOnly: true, // Prevents client-side JS from reading the cookie
        secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
        sameSite: 'lax'
    }
}));

// Initialize Admin User
db.query("SELECT 1").then(() => authController.initAdmin());

// Public Routes
app.use('/api/auth', require('./routes/authRoutes'));

// Auth Middleware for Static Files & API
app.use((req, res, next) => {
    // Allow login page, assets, and auth API
    if (req.path === '/login.html' ||
        req.path.startsWith('/css/') ||
        req.path.startsWith('/js/') ||
        req.path.startsWith('/api/auth')) {
        return next();
    }

    // Authenticated?
    if (req.session && req.session.userId) {
        return next();
    }

    // If API request, return 401
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // Otherwise redirect to login
    res.redirect('/login.html');
});

app.use(express.static('public'));

// Protected Routes
app.use('/api/machines', require('./routes/machineRoutes'));
const productionRoutes = require('./routes/productionRoutes');
app.use('/api/production', productionRoutes);
app.use('/api/reports', require('./routes/reportRoutes'));

// Services
// Services
const SimulationService = require('./services/simulationService');
const modbusService = require('./services/modbusService');
const s7Service = require('./services/s7Service');

// Main Control Loop
const DATA_INTERVAL = 2000; // Read every 2 seconds

async function startDataAcquisition() {
    console.log('Starting Production Monitoring System...');

    // Start Simulation (for machines marked as 'simulation')
    const simService = new SimulationService(io);
    simService.start();

    // Start Real PLC Polling
    /*
    setInterval(async () => {
        try {
            const [machines] = await db.query('SELECT * FROM machines');

            for (const machine of machines) {
                let data = null;

                if (machine.plc_type === 'Modbus') {
                    data = await modbusService.readData(machine);
                } else if (machine.plc_type === 'S7') {
                    data = await s7Service.readData(machine);
                }

                if (data) {
                    // Apply Offsets for real PLCs
                    const adjustedGood = Math.max(0, data.good_count - (machine.good_offset || 0));
                    const adjustedReject = Math.max(0, data.reject_count - (machine.reject_offset || 0));

                    // Update Database
                    await db.query(`INSERT INTO production_data 
                        (machine_id, shift_id, good_count, reject_count, timestamp) 
                        VALUES (?, 
                            (SELECT id FROM shifts WHERE CURRENT_TIME BETWEEN start_time AND end_time LIMIT 1), 
                        ?, ?, CURRENT_TIMESTAMP)`,
                        [machine.id, adjustedGood, adjustedReject]
                    );

                    // Update Status
                    await db.query('UPDATE machines SET status = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?',
                        [data.status, machine.id]);

                    // Emit to Frontend
                    io.emit('machine_update', {
                        machine_id: machine.id,
                        status: data.status,
                        good_count_inc: 0, // Differential update logic would be better, but for now absolute
                        total_good: data.good_count,
                        total_reject: data.reject_count,
                        shift: 'Current' // Simplification
                    });
                } else {
                    // Connection Failed - Set OFFLINE and Notify Frontend
                    await db.query('UPDATE machines SET status = ? WHERE id = ?', ['OFFLINE', machine.id]);
                    io.emit('machine_update', {
                        machine_id: machine.id,
                        status: 'OFFLINE'
                    });
                }
            }
        } catch (err) {
            console.error('Data Acquisition Loop Error:', err.message);
        }
    }, DATA_INTERVAL);
    */
}

startDataAcquisition();

// Socket.io connection
io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Export app for Vercel
module.exports = app;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
