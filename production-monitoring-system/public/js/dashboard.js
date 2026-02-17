// Socket Initialization with Error Handling
let socket = null;
try {
    if (typeof io !== 'undefined') {
        socket = io();
    } else {
        console.error('Socket.IO script not loaded!');
        alert('Network Error: Real-time connection failed. Please refresh.');
    }
} catch (e) {
    console.error('Socket initialization error:', e);
}

// State
let machines = [];
const machineGrid = document.getElementById('machineGrid');
const machineFilter = document.getElementById('machineFilter');
const cellFilter = document.getElementById('cellFilter');


// Chart Removed per user request

// Render Functions
function renderMachines() {
    const selectedCell = cellFilter.value;
    const selectedMachine = machineFilter.value;

    const filtered = machines.filter(m => {
        return (selectedCell === 'all' || m.cell === selectedCell) &&
            (selectedMachine === 'all' || m.id == selectedMachine);
    });

    machineGrid.innerHTML = filtered.map(m => {
        const status = m.status || 'OFFLINE';
        const statusClass = status === 'RUN' ? 'status-running' : status === 'STOP' ? 'status-stop' : 'status-offline';
        const good = m.good_count || 0;
        const reject = m.reject_count || 0;
        const total = good + reject;
        const oee = total > 0 ? Math.round((good / total) * 100) : 0;

        // Dynamic OEE Gauge Gradient
        const gradient = `conic-gradient(var(--accent-blue) ${oee}%, #1b202e ${oee}%)`;

        const isOnline = status !== 'OFFLINE';
        const connColor = isOnline ? 'var(--accent-green)' : 'var(--text-secondary)';

        return `
        <div class="machine-card ${status === 'RUN' ? 'running' : status === 'STOP' ? 'stop' : 'offline'}">
            <div class="card-header">
                <h3>${m.machine_name}</h3>
                <button class="edit-btn" onclick="openSettings('${m.id}')"><i class="fas fa-cog"></i></button>
            </div>
            
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-secondary); margin-bottom:0.8rem; background:rgba(0,0,0,0.2); padding:0.3rem; border-radius:4px;">
                 <span><i class="fas fa-network-wired"></i> ${m.ip_address}</span>
                 <span style="color:${connColor}; font-weight:bold;">
                    ${isOnline ? '<i class="fas fa-check-circle"></i> ONLINE' : '<i class="fas fa-times-circle"></i> OFFLINE'}
                 </span>
            </div>

            <div class="oee-gauge" style="background: ${gradient}">
                <div class="oee-value">${oee}%</div>
            </div>

            <div style="text-align: center; margin-bottom: 0.5rem;">
                <span class="status-indicator ${statusClass}">${status}</span>
            </div>

            <div class="small-labels">
                <span>Good: ${good}</span>
                <span>Reject: ${reject}</span>
            </div>
            <div class="small-labels" style="margin-top: 0;">
                <span>Cell: ${m.cell}</span>
            </div>
        </div>
        `;
    }).join('');
}

function renderCellSummary() {
    const cells = {};
    machines.forEach(m => {
        if (!cells[m.cell]) cells[m.cell] = 0;
        cells[m.cell] += (m.good_count || 0);
    });

    const container = document.getElementById('cellSummary');
    container.innerHTML = Object.entries(cells).map(([cell, count]) => `
        <div class="cell-summary-item">
            <span style="color: var(--text-secondary);"><i class="fas fa-cubes"></i> ${cell}</span>
            <span style="font-weight: 600; color: white;">${count.toLocaleString()} units</span>
        </div>
    `).join('');
}

function renderShiftSummary() {
    const totalGood = machines.reduce((sum, m) => sum + (m.good_count || 0), 0);
    const totalReject = machines.reduce((sum, m) => sum + (m.reject_count || 0), 0);
    const total = totalGood + totalReject;
    const eff = total > 0 ? Math.round((totalGood / total) * 100) : 0;

    document.getElementById('totalGood').innerText = totalGood.toLocaleString();
    document.getElementById('totalReject').innerText = totalReject.toLocaleString();
    document.getElementById('plantEfficiency').innerText = eff + '%';

    // Efficiency data color
    document.getElementById('plantEfficiency').style.color = eff > 80 ? 'var(--accent-green)' : eff > 50 ? 'var(--accent-orange)' : 'var(--accent-red)';
}





// Socket Listeners
if (socket) {
    socket.on('machines_data', (data) => {
        // Merge new data with existing machines to preserve local state if needed
        const firstLoad = machines.length === 0;

        machines = data;
        renderMachines();
        renderCellSummary();
        renderShiftSummary();

        if (firstLoad) {
            machines.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.innerText = m.machine_name;
                machineFilter.appendChild(opt);
            });
        }
    });

    socket.on('machine_update', (update) => {
        const machine = machines.find(m => m.id === update.machine_id);
        if (machine) {
            machine.status = update.status;
            if (update.total_good !== undefined) machine.good_count = update.total_good;
            if (update.total_reject !== undefined) machine.reject_count = update.total_reject;

            // Log alarm if stopped
            if (machine.status === 'STOP' && machine.status !== update.status) {
                const list = document.getElementById('alarmList');
                if (list) {
                    const item = document.createElement('li');
                    item.innerHTML = `<span style="color:red;">STOP</span> ${machine.machine_name} stopped.`;
                    list.prepend(item);
                }
            }

            renderMachines();
            renderCellSummary();
            renderShiftSummary();
            // renderOEETable();
        }
    });
}

// Event Listeners
machineFilter.addEventListener('change', renderMachines);
cellFilter.addEventListener('change', renderMachines);

document.getElementById('resetAllBtn').addEventListener('click', () => {
    requestVerification(async () => {
        if (confirm('Are you sure you want to reset ALL counters for ALL machines?')) {
            try {
                const res = await fetch('/api/machines/reset-all', { method: 'POST' });
                if (res.ok) {
                    alert('All counters have been reset.');
                    window.location.reload();
                } else {
                    alert('Failed to reset counters.');
                }
            } catch (err) {
                console.error(err);
                alert('Error resetting counters.');
            }
        }
    });
});

// Verification Logic
let verificationCallback = null;

function requestVerification(callback) {
    verificationCallback = callback;
    document.getElementById('verifyPassword').value = '';
    document.getElementById('verifyModal').style.display = 'flex';
    document.getElementById('verifyPassword').focus();
}

function closeVerify() {
    document.getElementById('verifyModal').style.display = 'none';
    verificationCallback = null;
}

document.getElementById('confirmVerifyBtn').addEventListener('click', async () => {
    const password = document.getElementById('verifyPassword').value;
    if (!password) return;

    try {
        const res = await fetch('/api/auth/verify-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        if (res.ok) {
            const data = await res.json();
            if (data.success) {
                const cb = verificationCallback;
                closeVerify();
                if (cb) cb();
            }
        } else {
            const errorData = await res.json().catch(() => ({}));
            if (res.status === 401 && errorData.message === 'Unauthorized') {
                alert('Session expired. Please log in again.');
                window.location.href = '/login.html';
            } else {
                alert(errorData.message || 'Invalid password');
            }
            document.getElementById('verifyPassword').value = '';
            document.getElementById('verifyPassword').focus();
        }
    } catch (err) {
        console.error(err);
        alert('Verification error');
    }
});

// Allow Enter key in verify modal
document.getElementById('verifyPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('confirmVerifyBtn').click();
});

// Settings Logic (Re-implemented for new modal)
function openSettings(id) {
    console.log('Open Settings Triggered for ID:', id);
    requestVerification(() => {
        // Use loose equality to match string/number IDs
        const machine = machines.find(m => m.id == id);
        if (!machine) {
            console.error('Machine not found for ID:', id);
            return;
        }

        document.getElementById('settingMachineId').value = machine.id;
        document.getElementById('settingName').value = machine.machine_name;
        document.getElementById('settingCell').value = machine.cell;
        document.getElementById('settingType').value = machine.plc_type;
        document.getElementById('settingIP').value = machine.ip_address;
        document.getElementById('settingIOGood').value = machine.io_good || '';
        document.getElementById('settingIOReject').value = machine.io_reject || '';
        document.getElementById('settingIOStatus').value = machine.io_status || '';

        document.getElementById('settingsModal').style.display = 'flex';
    });
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
}

async function saveSettings() {
    const id = document.getElementById('settingMachineId').value;
    const payload = {
        machine_name: document.getElementById('settingName').value,
        cell: document.getElementById('settingCell').value,
        plc_type: document.getElementById('settingType').value,
        ip_address: document.getElementById('settingIP').value,
        io_good: document.getElementById('settingIOGood').value,
        io_reject: document.getElementById('settingIOReject').value,
        io_status: document.getElementById('settingIOStatus').value
    };

    try {
        const res = await fetch(`/api/machines/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            // Optimistic update
            const machine = machines.find(m => m.id == id);
            if (machine) Object.assign(machine, payload);
            renderMachines();
            closeSettings();
        } else {
            alert('Failed to save settings');
        }
    } catch (err) {
        console.error(err);
        alert('Error saving settings');
    }
}

// Initial Data Fetch
fetch('/api/machines')
    .then(res => res.json())
    .then(data => {
        machines = data;
        renderMachines();
        renderCellSummary();
        renderShiftSummary();
        renderShiftSummary();
        // renderOEETable();

        machines.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.innerText = m.machine_name;
            machineFilter.appendChild(opt);
        });
    });

// initCharts();
// updateHourlyChart();
// setInterval(updateHourlyChart, 60000);
