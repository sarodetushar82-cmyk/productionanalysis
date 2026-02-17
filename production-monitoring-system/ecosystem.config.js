module.exports = {
    apps: [{
        name: "production-monitoring",
        script: "./server.js",
        env: {
            NODE_ENV: "production",
            PORT: 3000
        },
        watch: false,
        ignore_watch: ["node_modules", "database.sqlite", "logs"],
        instances: 1,
        autorestart: true,
        max_memory_restart: '1G',
    }]
}
