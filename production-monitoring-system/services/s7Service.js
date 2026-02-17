const nodes7 = require('nodes7');

class S7Service {
    constructor() {
        this.conns = {}; // Map of machineId -> S7Connection
    }

    async connect(machine) {
        const config = {
            ip: machine.ip_address,
            good: machine.io_good || 'DB1,INT0',
            reject: machine.io_reject || 'DB1,INT2',
            status: machine.io_status || 'DB1,INT4'
        };

        if (this.conns[machine.id]) {
            const oldConfig = this.conns[machine.id].config;
            const changed = oldConfig.ip !== config.ip ||
                oldConfig.good !== config.good ||
                oldConfig.reject !== config.reject ||
                oldConfig.status !== config.status;

            if (changed) {
                console.log(`Reconfiguring S7 PLC: ${machine.machine_name}`);
                this.conns[machine.id].conn.dropConnection();
                delete this.conns[machine.id];
            } else {
                return true;
            }
        }

        return new Promise((resolve, reject) => {
            const conn = new nodes7();
            conn.initiateConnection({
                port: machine.port || 102,
                host: machine.ip_address,
                rack: machine.rack || 0,
                slot: machine.slot || 1 // S7-1200/1500 typically slot 1
            }, (err) => {
                if (err) {
                    console.error(`Failed to connect to S7 PLC ${machine.machine_name}:`, err);
                    resolve(false);
                } else {
                    console.log(`Connected to S7 PLC: ${machine.machine_name}`);

                    conn.setTranslationCB((tag) => { return tag; });

                    conn.addItems([config.good, config.reject, config.status]);

                    this.conns[machine.id] = { conn, config };
                    resolve(true);
                }
            });
        });
    }

    getTranslation(tag) {
        // Simple mapping if needed, nodes7 handles most standard syntax 'DB1,INT0'
        return tag;
    }

    async readData(machine) {
        if (!this.conns[machine.id]) {
            await this.connect(machine);
        }

        const connection = this.conns[machine.id];
        if (!connection) return null;

        const config = connection.config;
        const conn = connection.conn;

        return new Promise((resolve) => {
            conn.readAllItems((err, values) => {
                if (err) {
                    console.error(`Error reading S7 PLC ${machine.machine_name}:`, err);
                    conn.dropConnection();
                    delete this.conns[machine.id];
                    resolve(null);
                } else {
                    // values is object { 'DB1,INT0': 123, ... }
                    resolve({
                        good_count: values[config.good],
                        reject_count: values[config.reject],
                        status: values[config.status] === 1 ? 'RUN' : 'STOP'
                    });
                }
            });
        });
    }
}

module.exports = new S7Service();
