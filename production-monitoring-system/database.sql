CREATE DATABASE IF NOT EXISTS production_db;
USE production_db;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shifts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shift_name VARCHAR(10) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL
);

INSERT INTO shifts (shift_name, start_time, end_time) VALUES
('A', '06:00:00', '14:00:00'),
('B', '14:00:00', '22:00:00'),
('C', '22:00:00', '06:00:00')
ON DUPLICATE KEY UPDATE shift_name=shift_name;

CREATE TABLE IF NOT EXISTS machines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    machine_name VARCHAR(100) NOT NULL,
    cell VARCHAR(50) NOT NULL,
    plc_type ENUM('modbus', 's7-1200', 's7-1500', 'simulation') NOT NULL,
    ip_address VARCHAR(15) NOT NULL,
    port INT DEFAULT 502,
    rack INT DEFAULT 0,
    slot INT DEFAULT 1,
    status ENUM('RUN', 'STOP', 'OFFLINE') DEFAULT 'OFFLINE',
    last_seen TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS production_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    machine_id INT,
    shift_id INT,
    good_count INT DEFAULT 0,
    reject_count INT DEFAULT 0,
    runtime_seconds INT DEFAULT 0,
    downtime_seconds INT DEFAULT 0,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (machine_id) REFERENCES machines(id),
    FOREIGN KEY (shift_id) REFERENCES shifts(id)
);
