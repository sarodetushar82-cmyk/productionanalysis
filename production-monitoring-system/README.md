# Industrial Production Monitoring System (Factory 4.0)

A robust, real-time production monitoring dashboard for industrial environments. This system tracks machine status (Run/Stop/Fault), production counts (Good/Reject), and OEE metrics, interfacing with Delta (Modbus TCP) and Siemens S7 PLCs.

## 🚀 Features

*   **Real-time Dashboard**: Live status updates via WebSocket.
*   **OEE Monitoring**: Dedicated page for Availability, Performance, and Quality metrics.
*   **Detailed Reports**: Daily shift-wise reports with Excel export.
*   **Secure Authentication**: Login system to protect sensitive data.
*   **User Management**: Ability to change passwords securely.
*   **PLC Integration**: Supports Modbus TCP and Siemens S7 protocols.
*   **Simulation Mode**: Built-in simulator for testing without hardware.

## 🔐 Getting Started

### 1. Installation

Ensure Node.js is installed. Then run:

```powershell
npm install
```

### 2. Running the Application

This project is configured to run with **PM2** for production reliability.

**Start the Server:**
```powershell
pm2 start ecosystem.config.js
```

**Check Status:**
```powershell
pm2 list
pm2 logs
```

**Stop Server:**
```powershell
pm2 stop production-monitoring
```

### 3. Accessing the Dashboard

Open your browser and navigate to:
**http://localhost:3000**

### 4. Login Credentials

By default, an admin user is created on first run:

*   **Username:** `admin`
*   **Password:** `admin123`

**⚠️ IMPORTANT:**
Please go to **Settings** immediately after login to change your password!

## ⚙️ Configuration

### machine-config (Database)
Machines are stored in the SQLite database (`database.sqlite`).
Use a SQLite viewer or the application logic to add machines.

### PLC Connection
Edit machine settings via the **Update Settings** modal on the dashboard (click the gear icon on a machine card) to switch between:
*   `Simulation`: Generates random data.
*   `Modbus`: Connects to Delta DVP series PLCs.
*   `S7`: Connects to Siemens S7-1200/1500 PLCs.

## 📊 Pages Overview

1.  **Dashboard**: Main overview of all machines and cells.
2.  **Reports**: Historical production data exportable to Excel (`.xlsx`).
3.  **OEE**: Overall Equipment Effectiveness calculations.
4.  **Settings**: Change password and manage personal preferences.

---
## ☁️ Vercel Deployment (Alternative)

This project can be deployed to Vercel for remote UI access. However, keep in mind:
*   **PLC Access:** Cloud deployment cannot connect to local PLCs.
*   **Database:** SQLite will not persist data between sessions on Vercel.

**Steps:**
1. Connect your repository to Vercel.
2. Vercel will automatically use `vercel.json` for configuration.
3. Ensure `NODE_ENV=production` and `VERCEL=true` environment variables are set in the Vercel Dashboard.

---
*Built for Industry 4.0 Standards*
