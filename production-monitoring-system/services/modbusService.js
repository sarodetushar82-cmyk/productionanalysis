const ModbusRTU = require("modbus-serial");

class ModbusService {
    constructor() {
        this.clients = {}; // Map of machineId -> ModbusClient
    }

    async connect(machine) {
        // If client exists but IP changed, clear it first
        if (this.clients[machine.id] && this.clients[machine.id].ip !== machine.ip_address) {
            console.log(`Reconnecting ${machine.machine_name} due to IP change (${this.clients[machine.id].ip} -> ${machine.ip_address})`);
            try {
                this.clients[machine.id].client.close();
            } catch (e) { /* ignore */ }
            delete this.clients[machine.id];
        }

        if (!this.clients[machine.id]) {
            const client = new ModbusRTU();
            try {
                await client.connectTCP(machine.ip_address, { port: machine.port || 502 });
                client.setID(1); // Default Slave ID 1
                this.clients[machine.id] = { client, ip: machine.ip_address };
                console.log(`Connected to Modbus PLC: ${machine.machine_name} (${machine.ip_address})`);
            } catch (err) {
                console.error(`Failed to connect to Modbus PLC ${machine.machine_name}:`, err.message);
                delete this.clients[machine.id]; // Ensure cleanup on fail
            }
        }
    }

    async readData(machine) {
        if (!this.clients[machine.id]) {
            await this.connect(machine);
        }

        const connection = this.clients[machine.id];
        if (!connection || !connection.client) return null;
        const client = connection.client;

        try {
            // Read registers based on configuration (defaults to 0, 1, 2)
            const addrGood = parseInt(machine.io_good) || 0;
            const addrReject = parseInt(machine.io_reject) || 1;
            const addrStatus = parseInt(machine.io_status) || 2;

            // Find max address to know how many to read
            const maxAddr = Math.max(addrGood, addrReject, addrStatus);
            const { data } = await client.readHoldingRegisters(0, maxAddr + 1);

            return {
                good_count: data[addrGood],
                reject_count: data[addrReject],
                status: data[addrStatus] === 1 ? 'RUN' : 'STOP'
            };
        } catch (err) {
            console.error(`Error reading Modbus PLC ${machine.machine_name}:`, err.message);
            // Force reconnect next time
            client.close();
            delete this.clients[machine.id];
            return null;
        }
    }
}

module.exports = new ModbusService();
