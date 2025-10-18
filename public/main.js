// public/main.js
lucide.createIcons();

offcanvasBottomAddTransaction = document.getElementById('offcanvasBottomAddTransaction');
const tableBody = document.querySelector('#transactionTable tbody');
const totalAmountCell = document.getElementById('totalAmount');
const groupBySelect = document.getElementById('groupBySelect');

const addTransactionBtn = document.getElementById('addTransactionBtn');
const amountInput = document.getElementById('transactionAmount');
const descriptionInput = document.getElementById('transactionDescription');
const dateInput = document.getElementById('transactionDate');

// initialize date today
const today = new Date().toISOString().split('T')[0];
amountInput.value = 0.00;
descriptionInput.value = '';
dateInput.value = today;

const ctx = document.getElementById('chart').getContext('2d');
let chart;
let cumulativeAmount = 0;

function createChart() {
    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Balance',
                    data: [],
                    backgroundColor: [],
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    intersect: false,
                    callbacks: {
                        label: function (context) {
                            const [start, end] = context.raw;
                            const amount = end - start;
                            return `₱ ${amount.toFixed(2)} (₱${start.toFixed(2)} > ₱${end.toFixed(2)})`;
                        }
                    }
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Amount (₱)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Transaction Date'
                    }
                }
            }
        }
    });
}

function updateTotal() {
    let total = 0;
    tableBody.querySelectorAll('tr').forEach(row => {
        const amountCell = row.cells[1];
        const value = parseFloat(amountCell.textContent);
        total += value;
    });
    totalAmountCell.textContent = `₱ ${total.toFixed(2)}`;
}

function addTransactionTableRow(index, id, amount, description, date) {
    const type = parseFloat(amount) < 0 ? 'danger' : 'success';
    const row = `
        <tr class="table-${type}" data-id="${id}">
            <td>${index}</td>
            <td>${parseFloat(amount).toFixed(2)}</td>
            <td>${description}</td>
            <td>${date}</td>
        </tr>
    `;
    tableBody.insertAdjacentHTML('beforeend', row);
    updateTotal();
}

function addTransactionChartData(date, amount) {
    const val = parseFloat(amount);
    const start = cumulativeAmount;
    cumulativeAmount += val;
    const end = cumulativeAmount;

    chart.data.labels.push(date);
    chart.data.datasets[0].data.push([start, end]);
    chart.data.datasets[0].backgroundColor.push(
        val >= 0 ? 'rgba(60, 179, 113, 1)' : 'rgba(255, 0, 0, 1)'
    );
    chart.update();
}

async function loadTransactions() {
    try {
        const response = await fetch('/api/load');
        const data = await response.json();

        tableBody.innerHTML = '';
        cumulativeAmount = 0;
        createChart();

        const totalTransactions = data.transactions.length;
        data.transactions.forEach((transaction, index) => {
            const reverseIndex = totalTransactions - index;
            addTransactionTableRow(reverseIndex, transaction.id, transaction.amount, transaction.description, transaction.date);
        });

        // group transactions and ascending order in chart
        const grouped = groupTransactions(data.transactions, groupBySelect.value);
        grouped.forEach((transaction) => {
            addTransactionChartData(transaction.date, transaction.amount);
        });
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

async function saveTransaction(amount, description, date, inputPassword) {
    try {
        const response = await fetch('/api/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount, description, date, inputPassword })
        });
        const data = await response.json();

        if (response.status === 403) {
            alert('The password that you\'ve entered is incorrect. Please try again.');
            return false;
        }
        if (!response.ok) {
            console.error(data.error)
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error saving transaction:', error);
        return false;
    }
}

function groupTransactions(transactions, mode) {
    if (!mode) return transactions.slice().reverse();
    const groups = {};

    transactions.forEach(transaction => {
        const date = new Date(transaction.date);
        let key;
        let rangeStart;
        let rangeEnd;

        switch (mode) {
            case 'day':
                key = date.toISOString().split('T')[0];
                rangeStart = key;
                rangeEnd = key;
                break;
            case 'week':
                const weekStart = new Date(date);
                const day = (date.getDay() + 6) % 7;
                weekStart.setDate(date.getDate() - day);

                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);

                key = weekStart.toISOString().split('T')[0];
                rangeStart = weekStart.toISOString().split('T')[0];
                rangeEnd = weekEnd.toISOString().split('T')[0];
                break;
            case 'month':
                const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
                const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                rangeStart = monthStart.toISOString().split('T')[0];
                rangeEnd = monthEnd.toISOString().split('T')[0];
                break;
            case 'year':
                const yearStart = new Date(date.getFullYear(), 0, 1);
                const yearEnd = new Date(date.getFullYear(), 11, 31);

                key = `${date.getFullYear()}`;
                rangeStart = yearStart.toISOString().split('T')[0];
                rangeEnd = yearEnd.toISOString().split('T')[0];
                break;
            default:
                throw new Error('Invalid grouping mode');
        }

        if (!groups[key]) {
            groups[key] = { amount: 0, rangeStart, rangeEnd };
        }

        groups[key].amount += parseFloat(transaction.amount);
    });
    return Object.entries(groups)
        .map(([date, data]) => ({
            date,
            amount: data.amount,
            range: { start: data.rangeStart, end: data.rangeEnd }
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadTransactions();

    groupBySelect.addEventListener('change', async () => {
        await loadTransactions();
    });

    addTransactionBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        // prompt for password
        let inputPassword = localStorage.getItem('transactionPassword') || prompt("Enter password to confirm:");
        if (!inputPassword) {
            return alert('Password is required to confirm the transaction.');
        }

        const amount = parseFloat(amountInput.value);
        const description = descriptionInput.value;
        const date = dateInput.value;

        if (isNaN(amount)) {
            return alert('Transaction amount is required and must be a number.');
        }

        const success = await saveTransaction(amount, description, date, inputPassword);
        if (!success) return localStorage.removeItem('transactionPassword');
        localStorage.setItem('transactionPassword', inputPassword);

        await loadTransactions();

        amountInput.value = 0.00;
        descriptionInput.value = '';
        dateInput.value = today;

        const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasBottomAddTransaction);
        offcanvas.hide();
    });
});