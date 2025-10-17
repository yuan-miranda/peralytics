// public/main.js
lucide.createIcons();

offcanvasBottomAddTransaction = document.getElementById('offcanvasBottomAddTransaction');
const tableBody = document.querySelector('#transactionTable tbody');
const totalAmountCell = document.getElementById('totalAmount');

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

function generateRandomData(length, min, max) {
    const data = [];
    for (let i = 0; i < length; i++) {
        data.push((Math.random() * (max - min) + min).toFixed(2));
    }
    return data;
}

function addTransaction(id, amount, description, date) {
    const type = parseFloat(amount) < 0 ? 'danger' : 'success';
    const row = `
                <tr class="table-${type}">
                    <td>${id}</td>
                    <td>${parseFloat(amount).toFixed(2)}</td>
                    <td>${description}</td>
                    <td>${date}</td>
                </tr>
            `;
    tableBody.insertAdjacentHTML('beforeend', row);
    updateTotal();

    const val = parseFloat(amount);
    const expense = val < 0 ? val : 0;
    const earning = val >= 0 ? val : 0;

    chart.data.labels.push(id);
    chart.data.datasets[0].data.push(expense);
    chart.data.datasets[1].data.push(earning);
    chart.update();
}

function createChart() {
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Expenses',
                    data: [],
                    borderColor: 'red',
                    backgroundColor: 'rgba(255, 0, 0, 0.2)',
                    pointBackgroundColor: 'red',
                    borderWidth: 1
                },
                {
                    label: 'Earnings',
                    data: [],
                    borderColor: 'green',
                    backgroundColor: 'rgba(60, 179, 113, 0.2)',
                    pointBackgroundColor: 'green',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    intersect: false,
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
                        text: `Transaction #`
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

async function loadTransactions() {
    try {
        const response = await fetch('/api/load');
        const data = await response.json();

        tableBody.innerHTML = '';
        createChart();

        data.transactions.forEach(transaction => {
            addTransaction(transaction.id, transaction.amount, transaction.description, transaction.date);
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
    } catch (error) {
        console.error('Error saving transaction:', error);
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    createChart();
    await loadTransactions();

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

        if (!amount || isNaN(amount)) {
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