// Application State
const appState = {
    isLoggedIn: false,
    account: null,
    balance: 0,
    symbol: 'EURUSD',
    timeframe: 'M15',
    priceData: [],
    activeTrades: [],
    tradesToday: 0,
    activeStrategies: new Set(), // Strategies that are monitoring and will auto-execute
    lastSignals: {} // Track last signal from each strategy to avoid duplicate executions
};

// Initialize Chart
let priceChart = null;

// DOM Elements
const loginModal = document.getElementById('loginModal');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const closeLogin = document.getElementById('closeLogin');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    initializeChart();
    checkLoginStatus();
});

// Event Listeners
function initializeEventListeners() {
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    closeLogin.addEventListener('click', () => {
        loginModal.style.display = 'none';
    });

    // Strategy card clicks - activate/deactivate monitoring
    document.getElementById('smcSignal').addEventListener('click', () => toggleStrategy('SMC'));
    document.getElementById('ictSignal').addEventListener('click', () => toggleStrategy('ICT'));
    document.getElementById('customSignal').addEventListener('click', () => toggleStrategy('CUSTOM'));

    // Symbol and timeframe changes
    document.getElementById('symbolSelect').addEventListener('change', (e) => {
        appState.symbol = e.target.value;
        fetchMarketData();
    });
    document.getElementById('timeframeSelect').addEventListener('change', (e) => {
        appState.timeframe = e.target.value;
        fetchMarketData();
    });

    // Remove trade form listener - no manual trading
}

// Check Login Status
function checkLoginStatus() {
    const savedLogin = localStorage.getItem('mt5Login');
    if (savedLogin) {
        const loginData = JSON.parse(savedLogin);
        appState.isLoggedIn = true;
        appState.account = loginData.account;
        showDashboard();
        fetchMarketData();
        startDataUpdates();
    } else {
        showLoginModal();
    }
}

// Show Login Modal
function showLoginModal() {
    loginModal.style.display = 'flex';
    dashboard.classList.add('hidden');
}

// Show Dashboard
function showDashboard() {
    loginModal.style.display = 'none';
    dashboard.classList.remove('hidden');
    updateAccountDisplay();
    updateStrategyUI();
    updateActiveStrategiesList();
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    const account = document.getElementById('account').value;
    const password = document.getElementById('password').value;
    const server = document.getElementById('server').value;
    const statusDiv = document.getElementById('loginStatus');

    statusDiv.textContent = 'Connecting...';
    statusDiv.className = 'status-message';

    // Simulate login (in real app, this would call backend API)
    setTimeout(() => {
        appState.isLoggedIn = true;
        appState.account = account;
        appState.balance = 10000; // Mock balance

        localStorage.setItem('mt5Login', JSON.stringify({
            account,
            server
        }));

        statusDiv.textContent = 'Connected successfully!';
        statusDiv.className = 'status-message success';

        setTimeout(() => {
            showDashboard();
            fetchMarketData();
            startDataUpdates();
        }, 1000);
    }, 1500);
}

// Handle Logout
function handleLogout() {
    appState.isLoggedIn = false;
    appState.account = null;
    localStorage.removeItem('mt5Login');
    showLoginModal();
    if (priceChart) {
        priceChart.destroy();
        priceChart = null;
    }
}

// Update Account Display
function updateAccountDisplay() {
    document.getElementById('accountDisplay').textContent = appState.account || '-';
    document.getElementById('balanceDisplay').textContent = `$${appState.balance.toFixed(2)}`;
    document.getElementById('equity').textContent = `$${appState.balance.toFixed(2)}`;
}

// Initialize Chart
function initializeChart() {
    const ctx = document.getElementById('priceChart');
    if (!ctx) return;

    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Price',
                data: [],
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                }
            }
        }
    });
}

// Fetch Market Data (Mock)
function fetchMarketData() {
    // Generate mock data
    const now = new Date();
    const data = [];
    
    for (let i = 99; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 15 * 60 * 1000);
        const basePrice = 1.10 + Math.random() * 0.1;
        data.push({
            time: time,
            open: basePrice,
            high: basePrice + Math.random() * 0.005,
            low: basePrice - Math.random() * 0.005,
            close: basePrice + (Math.random() - 0.5) * 0.01
        });
    }

    appState.priceData = data;
    updatePriceDisplay();
    updateChart();
    updateDataTable();
    updateSignals();
}

// Update Price Display
function updatePriceDisplay() {
    if (appState.priceData.length === 0) return;

    const latest = appState.priceData[appState.priceData.length - 1];
    const bid = latest.close - 0.0001;
    const ask = latest.close + 0.0001;
    const spread = (ask - bid) * 10000;

    document.getElementById('bidPrice').textContent = bid.toFixed(5);
    document.getElementById('askPrice').textContent = ask.toFixed(5);
    document.getElementById('spread').textContent = spread.toFixed(1) + ' pips';
}

// Update Chart
function updateChart() {
    if (!priceChart || appState.priceData.length === 0) return;

    const labels = appState.priceData.map(d => {
        const date = new Date(d.time);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    });
    const prices = appState.priceData.map(d => d.close);

    priceChart.data.labels = labels;
    priceChart.data.datasets[0].data = prices;
    priceChart.update('none');
}

// Update Data Table
function updateDataTable() {
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = '';

    // Show last 10 candles
    const recentData = appState.priceData.slice(-10).reverse();
    
    recentData.forEach(candle => {
        const row = document.createElement('tr');
        const time = new Date(candle.time);
        row.innerHTML = `
            <td>${time.toLocaleString()}</td>
            <td>${candle.open.toFixed(5)}</td>
            <td>${candle.high.toFixed(5)}</td>
            <td>${candle.low.toFixed(5)}</td>
            <td>${candle.close.toFixed(5)}</td>
        `;
        tbody.appendChild(row);
    });
}

// Strategy Detectors (from Untitled-1.py) - Enhanced with SELL signals
class SMCDetector {
    detectBOS(candles) {
        if (candles.length < 2) return { buy: false, sell: false };
        const latest = candles[candles.length - 1];
        const previous = candles[candles.length - 2];
        return {
            buy: latest.close > previous.high,
            sell: latest.close < previous.low
        };
    }

    detectOrderBlock(candle) {
        return {
            buy: candle.close > candle.open,
            sell: candle.close < candle.open
        };
    }

    detectFVG(candles) {
        if (candles.length < 3) return { buy: false, sell: false };
        const latest = candles[candles.length - 1];
        const third = candles[candles.length - 3];
        return {
            buy: third.high < latest.low,
            sell: third.low > latest.high
        };
    }

    signal(candles) {
        const bos = this.detectBOS(candles);
        const fvg = this.detectFVG(candles);
        
        if (bos.buy && fvg.buy) {
            return 'BUY';
        }
        if (bos.sell && fvg.sell) {
            return 'SELL';
        }
        return null;
    }
}

class ICTDetector {
    detectLiquiditySweep(candles) {
        if (candles.length < 2) return { buy: false, sell: false };
        const latest = candles[candles.length - 1];
        const previous = candles[candles.length - 2];
        return {
            buy: latest.low < previous.low, // Sweep low = potential buy
            sell: latest.high > previous.high // Sweep high = potential sell
        };
    }

    detectKillzone() {
        const hour = new Date().getHours();
        return hour >= 7 && hour <= 10;
    }

    signal(candles) {
        const ls = this.detectLiquiditySweep(candles);
        const kz = this.detectKillzone();
        
        if (ls.buy && kz) {
            return 'BUY';
        }
        if (ls.sell && kz) {
            return 'SELL';
        }
        return null;
    }
}

class CustomStrategy {
    signal(candles) {
        if (candles.length === 0) return null;
        const latest = candles[candles.length - 1];
        if (latest.close > latest.open) {
            return 'BUY';
        }
        if (latest.close < latest.open) {
            return 'SELL';
        }
        return null;
    }
}

// Toggle Strategy Activation
function toggleStrategy(strategyName) {
    if (appState.activeStrategies.has(strategyName)) {
        appState.activeStrategies.delete(strategyName);
        delete appState.lastSignals[strategyName]; // Reset last signal
        showNotification(`${strategyName} strategy deactivated`, 'success');
    } else {
        appState.activeStrategies.add(strategyName);
        showNotification(`${strategyName} strategy activated - Monitoring for signals...`, 'success');
    }
    updateStrategyUI();
    updateActiveStrategiesList();
}

// Update Strategy UI
function updateStrategyUI() {
    ['SMC', 'ICT', 'CUSTOM'].forEach(strategy => {
        const card = document.getElementById(`${strategy.toLowerCase()}Signal`);
        const monitoringBadge = document.getElementById(`${strategy.toLowerCase()}Monitoring`);
        const statusEl = document.getElementById(`${strategy.toLowerCase()}Status`);
        
        if (appState.activeStrategies.has(strategy)) {
            card.classList.add('active');
            monitoringBadge.style.display = 'flex';
            statusEl.textContent = 'Monitoring...';
            statusEl.className = 'signal-status monitoring';
        } else {
            card.classList.remove('active');
            monitoringBadge.style.display = 'none';
            statusEl.textContent = 'Click to Activate';
            statusEl.className = 'signal-status inactive';
        }
    });
}

// Update Active Strategies List
function updateActiveStrategiesList() {
    const container = document.getElementById('activeStrategiesList');
    
    if (appState.activeStrategies.size === 0) {
        container.innerHTML = '<span class="no-active">No strategies active</span>';
        return;
    }
    
    container.innerHTML = Array.from(appState.activeStrategies).map(strategy => `
        <span class="active-strategy-tag">
            ${strategy}
            <i class="fas fa-times" onclick="event.stopPropagation(); toggleStrategy('${strategy}')"></i>
        </span>
    `).join('');
}

// Update Signals and Auto-Execute
function updateSignals() {
    if (appState.priceData.length < 3) return;

    const smcDetector = new SMCDetector();
    const ictDetector = new ICTDetector();
    const customStrategy = new CustomStrategy();

    // Check each active strategy and execute if signal detected
    appState.activeStrategies.forEach(strategyName => {
        let signal = null;
        let details = {};

        if (strategyName === 'SMC') {
            signal = smcDetector.signal(appState.priceData);
            const bos = smcDetector.detectBOS(appState.priceData);
            const ob = smcDetector.detectOrderBlock(appState.priceData[appState.priceData.length - 1]);
            const fvg = smcDetector.detectFVG(appState.priceData);
            details = {
                bos: (bos.buy || bos.sell) ? 'Yes' : 'No',
                ob: (ob.buy || ob.sell) ? 'Yes' : 'No',
                fvg: (fvg.buy || fvg.sell) ? 'Yes' : 'No'
            };
            updateSignalCard('smc', signal, details);
        } else if (strategyName === 'ICT') {
            signal = ictDetector.signal(appState.priceData);
            const ls = ictDetector.detectLiquiditySweep(appState.priceData);
            details = {
                ls: (ls.buy || ls.sell) ? 'Yes' : 'No',
                kz: ictDetector.detectKillzone() ? 'Yes' : 'No'
            };
            updateSignalCard('ict', signal, details);
        } else if (strategyName === 'CUSTOM') {
            signal = customStrategy.signal(appState.priceData);
            details = { sig: signal || 'None' };
            updateSignalCard('custom', signal, details);
        }

        // Auto-execute if signal detected and it's a new signal
        if (signal && appState.lastSignals[strategyName] !== signal) {
            appState.lastSignals[strategyName] = signal;
            executeTrade(signal, strategyName);
        }
    });

    // Update UI for all strategies (even inactive ones)
    if (!appState.activeStrategies.has('SMC')) {
        const smcSignal = smcDetector.signal(appState.priceData);
        const bos = smcDetector.detectBOS(appState.priceData);
        const ob = smcDetector.detectOrderBlock(appState.priceData[appState.priceData.length - 1]);
        const fvg = smcDetector.detectFVG(appState.priceData);
        updateSignalCard('smc', smcSignal, {
            bos: (bos.buy || bos.sell) ? 'Yes' : 'No',
            ob: (ob.buy || ob.sell) ? 'Yes' : 'No',
            fvg: (fvg.buy || fvg.sell) ? 'Yes' : 'No'
        });
    }
    if (!appState.activeStrategies.has('ICT')) {
        const ictSignal = ictDetector.signal(appState.priceData);
        const ls = ictDetector.detectLiquiditySweep(appState.priceData);
        updateSignalCard('ict', ictSignal, {
            ls: (ls.buy || ls.sell) ? 'Yes' : 'No',
            kz: ictDetector.detectKillzone() ? 'Yes' : 'No'
        });
    }
    if (!appState.activeStrategies.has('CUSTOM')) {
        const customSignal = customStrategy.signal(appState.priceData);
        updateSignalCard('custom', customSignal, { sig: customSignal || 'None' });
    }
}

// Update Signal Card
function updateSignalCard(strategy, signal, details) {
    const statusEl = document.getElementById(`${strategy}Status`);
    const cardEl = document.getElementById(`${strategy}Signal`);
    const isActive = appState.activeStrategies.has(strategy.toUpperCase());

    if (isActive) {
        if (signal) {
            statusEl.textContent = `Signal: ${signal}`;
            statusEl.className = `signal-status ${signal.toLowerCase()}`;
            cardEl.style.borderColor = signal === 'BUY' ? '#10b981' : '#ef4444';
        } else {
            statusEl.textContent = 'Monitoring...';
            statusEl.className = 'signal-status monitoring';
            cardEl.style.borderColor = '#2563eb';
        }
    } else {
        if (signal) {
            statusEl.textContent = `Signal: ${signal} (Inactive)`;
            statusEl.className = `signal-status ${signal.toLowerCase()}`;
            cardEl.style.borderColor = signal === 'BUY' ? '#10b981' : '#ef4444';
        } else {
            statusEl.textContent = 'Click to Activate';
            statusEl.className = 'signal-status inactive';
            cardEl.style.borderColor = '#334155';
        }
    }

    // Update details
    Object.keys(details).forEach(key => {
        const el = document.getElementById(`${strategy}${key.charAt(0).toUpperCase() + key.slice(1)}`);
        if (el) el.textContent = details[key];
    });
}

// Execute Trade (Auto-execution from strategy)
function executeTrade(orderType, strategyName) {
    if (appState.tradesToday >= 3) {
        showNotification('Maximum trades per day reached (3)', 'error');
        return;
    }

    const volume = parseFloat(document.getElementById('volume').value) || 0.1;
    const stopLoss = document.getElementById('stopLoss').value;
    const takeProfit = document.getElementById('takeProfit').value;

    // Get current price
    const bidPrice = parseFloat(document.getElementById('bidPrice').textContent) || 1.10000;
    const askPrice = parseFloat(document.getElementById('askPrice').textContent) || 1.10010;

    // Simulate trade execution
    const trade = {
        id: Date.now(),
        symbol: appState.symbol,
        type: orderType,
        volume: volume,
        price: orderType === 'BUY' ? askPrice : bidPrice,
        stopLoss: stopLoss || null,
        takeProfit: takeProfit || null,
        time: new Date(),
        status: 'OPEN',
        strategy: strategyName
    };

    appState.activeTrades.push(trade);
    appState.tradesToday++;

    updateActiveTrades();
    updateStatistics();
    
    // Show success notification
    showNotification(
        `✅ ${strategyName} executed ${orderType} ${volume} lots of ${appState.symbol} at ${trade.price.toFixed(5)}`,
        'success'
    );
}

// Update Active Trades
function updateActiveTrades() {
    const container = document.getElementById('activeTrades');
    
    if (appState.activeTrades.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No active trades</p>
            </div>
        `;
        return;
    }

    container.innerHTML = appState.activeTrades.map(trade => `
        <div class="trade-item ${trade.type.toLowerCase()}">
            <div class="trade-info">
                <div class="trade-symbol">${trade.symbol} ${trade.type} <span style="font-size: 11px; color: var(--text-secondary);">(${trade.strategy})</span></div>
                <div class="trade-details">
                    Volume: ${trade.volume} | Price: ${trade.price.toFixed(5)}<br>
                    ${trade.stopLoss ? `SL: ${trade.stopLoss}` : 'No SL'} | 
                    ${trade.takeProfit ? `TP: ${trade.takeProfit}` : 'No TP'}
                </div>
            </div>
            <div class="trade-actions">
                <button class="btn-icon" onclick="closeTrade(${trade.id})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Close Trade
function closeTrade(tradeId) {
    appState.activeTrades = appState.activeTrades.filter(t => t.id !== tradeId);
    updateActiveTrades();
    updateStatistics();
}

// Update Statistics
function updateStatistics() {
    document.getElementById('tradesToday').textContent = appState.tradesToday;
    // Mock win rate and P/L
    const winRate = appState.tradesToday > 0 ? Math.floor(Math.random() * 30 + 50) : 0;
    document.getElementById('winRate').textContent = winRate + '%';
    
    const pnl = (Math.random() - 0.5) * 100;
    const pnlEl = document.getElementById('profitLoss');
    pnlEl.textContent = `$${pnl.toFixed(2)}`;
    pnlEl.style.color = pnl >= 0 ? '#10b981' : '#ef4444';
}

// Start Data Updates
function startDataUpdates() {
    // Update market data every 5 seconds
    setInterval(() => {
        if (appState.isLoggedIn) {
            fetchMarketData();
        }
    }, 5000);

    // Update prices every second
    setInterval(() => {
        if (appState.isLoggedIn && appState.priceData.length > 0) {
            const latest = appState.priceData[appState.priceData.length - 1];
            const newPrice = latest.close + (Math.random() - 0.5) * 0.0005;
            latest.close = newPrice;
            latest.high = Math.max(latest.high, newPrice);
            latest.low = Math.min(latest.low, newPrice);
            updatePriceDisplay();
            updateChart();
            updateSignals();
        }
    }, 1000);
}

// Show Notification
function showNotification(message, type = 'success') {
    const toast = document.getElementById('notificationToast');
    const icon = toast.querySelector('.toast-icon');
    const messageEl = toast.querySelector('.toast-message');
    
    messageEl.textContent = message;
    toast.className = `notification-toast ${type}`;
    
    if (type === 'success') {
        icon.className = 'toast-icon fas fa-check-circle';
    } else {
        icon.className = 'toast-icon fas fa-exclamation-circle';
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// Make functions available globally
window.closeTrade = closeTrade;
window.toggleStrategy = toggleStrategy;

