const socket = io();

// Charts
let plantGauge;
let oeeBarChart;
let machines = [];
const cellFilter = document.getElementById('cellFilter');
const shiftFilter = document.getElementById('shiftFilter');
const oeeDate = document.getElementById('oeeDate');
const loadBtn = document.getElementById('loadOeeBtn');

// State
let displayData = []; // Normalized data for display (Aggregated by Cell)
let isHistorical = false;

// Set default date to today
oeeDate.valueAsDate = new Date();

// Init Charts
function initCharts() {
    // Plant Gauge (Doughnut)
    const ctxGauge = document.getElementById('plantOeeGauge').getContext('2d');
    plantGauge = new Chart(ctxGauge, {
        type: 'doughnut',
        data: {
            labels: ['Efficiency', 'Loss'],
            datasets: [{
                data: [0, 100],
                backgroundColor: ['#00e676', '#1b202e'],
                borderWidth: 0,
                cutout: '80%'
            }]
        },
        options: {
            plugins: { tooltip: { enabled: false }, legend: { display: false } },
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Bar Chart
    const ctxBar = document.getElementById('oeeBarChart').getContext('2d');
    Chart.defaults.color = '#8b9bb4';
    Chart.defaults.font.family = "'Exo 2', sans-serif";

    oeeBarChart = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'OEE %',
                data: [],
                backgroundColor: '#00bcd4',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 100, grid: { color: '#2c3344' } },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function calculateOEE(cellData) {
    const good = cellData.good_count || 0;
    const reject = cellData.reject_count || 0;
    const total = good + reject;

    return {
        oee: total > 0 ? Math.round((good / total) * 100) : 0,
        availability: 'N/A',
        performance: 'N/A',
        quality: total > 0 ? Math.round((good / total) * 100) + '%' : '0%'
    };
}

function fetchData() {
    const date = oeeDate.value;
    const today = new Date().toISOString().split('T')[0];
    isHistorical = date !== today;

    if (!isHistorical) {
        fetch('/api/machines')
            .then(res => res.json())
            .then(data => {
                machines = data;
                updateDisplayData();
                render();
            });
    } else {
        fetch(`/api/reports/daily?date=${date}`)
            .then(res => res.json())
            .then(data => {
                machines = data.map(row => ({
                    id: row.machine_id || 0,
                    machine_name: row.machine_name,
                    cell: row.cell,
                    good_count: row.total_good,
                    reject_count: row.total_reject,
                    shift_name: row.shift_name,
                    status: 'OFFLINE'
                }));
                updateDisplayData();
                render();
            });
    }
}

function updateDisplayData() {
    const selectedCell = cellFilter.value;
    const selectedShift = shiftFilter.value;

    // Filter machines by shift first if needed
    let filteredMachines = machines;
    if (selectedShift) {
        filteredMachines = filteredMachines.filter(m => m.shift_name === selectedShift);
    }

    // Aggregate by Cell
    const cellGroups = {};
    filteredMachines.forEach(m => {
        const cellName = m.cell || 'Unknown';
        if (!cellGroups[cellName]) {
            cellGroups[cellName] = {
                cell_name: cellName,
                good_count: 0,
                reject_count: 0,
                machines: []
            };
        }
        cellGroups[cellName].good_count += (m.good_count || 0);
        cellGroups[cellName].reject_count += (m.reject_count || 0);
        cellGroups[cellName].machines.push(m);
    });

    displayData = Object.values(cellGroups);

    // Filter by Cell name if selected
    if (selectedCell !== 'all') {
        displayData = displayData.filter(c => c.cell_name === selectedCell);
    }
}

function render() {
    const tbody = document.getElementById('oeeTableBody');
    tbody.innerHTML = displayData.map(c => {
        const metrics = calculateOEE(c);
        let color = '#ff3d00';
        if (metrics.oee > 85) color = '#00e676';
        else if (metrics.oee > 60) color = '#ff9100';

        return `
            <tr>
                <td style="font-weight:600;">${c.cell_name}</td>
                <td style="color:#8b9bb4;">-</td>
                <td style="color:#8b9bb4;">-</td>
                <td>${metrics.quality}</td>
                <td style="color:${color}; font-weight:700;">${metrics.oee}%</td>
            </tr>
        `;
    }).join('');

    const totalOEE = displayData.reduce((acc, c) => acc + calculateOEE(c).oee, 0);
    const avgOEE = displayData.length > 0 ? Math.round(totalOEE / displayData.length) : 0;

    plantGauge.data.datasets[0].data = [avgOEE, 100 - avgOEE];
    plantGauge.data.datasets[0].backgroundColor = [
        avgOEE > 85 ? '#00e676' : avgOEE > 60 ? '#ff9100' : '#ff3d00',
        '#1b202e'
    ];
    document.getElementById('plantOeeValue').innerText = avgOEE + '%';
    document.getElementById('plantOeeValue').style.color = avgOEE > 85 ? '#00e676' : avgOEE > 60 ? '#ff9100' : '#ff3d00';
    plantGauge.update();

    oeeBarChart.data.labels = displayData.map(c => c.cell_name);
    oeeBarChart.data.datasets[0].data = displayData.map(c => calculateOEE(c).oee);
    oeeBarChart.update();
}

// Initial Fetch and Populate Cell Filter
fetch('/api/machines')
    .then(res => res.json())
    .then(data => {
        const cells = [...new Set(data.map(m => m.cell))].filter(Boolean);
        cells.forEach(cell => {
            const opt = document.createElement('option');
            opt.value = cell;
            opt.innerText = cell;
            cellFilter.appendChild(opt);
        });
        fetchData();
    });

socket.on('machines_data', (data) => {
    if (!isHistorical) {
        machines = data;
        updateDisplayData();
        render();
    }
});

socket.on('machine_update', (update) => {
    if (!isHistorical) {
        const m = machines.find(x => x.id === update.machine_id);
        if (m) {
            m.status = update.status;
            if (update.total_good !== undefined) m.good_count = update.total_good;
            if (update.total_reject !== undefined) m.reject_count = update.total_reject;
            updateDisplayData();
            render();
        }
    }
});

cellFilter.addEventListener('change', () => {
    updateDisplayData();
    render();
});

shiftFilter.addEventListener('change', () => {
    updateDisplayData();
    render();
});

loadBtn.addEventListener('click', fetchData);

initCharts();
