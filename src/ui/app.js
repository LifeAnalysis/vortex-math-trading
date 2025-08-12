/**
 * Vortex Trading Backtester - Streamlined Frontend
 * Clean interface focused on backtesting workflow
 */

// Application data
let processedData = null;
let backtestResults = null;
let tradingViewChart = null;

// Application state
const appState = {
    activeTab: 'chart',
    config: {
        buySignal: 1,
        sellSignal: 5,
        holdSignal: 9,
        initialCapital: 10000,
        startDate: '2020-01-01',
        endDate: '2023-12-31',
        teslaFilter: true,
        sequenceFilter: true,
        positionSize: 1.0,
        stopLoss: 10,
        takeProfit: 20,
        feePercent: 0.10,
        slippageBps: 5
    },
    isRunning: false
};

/**
 * Initialize the application
 */
function initializeApp() {
    setupEventListeners();
    hideResults();
    updateConfigFromForm();
    loadHistoricalData();
}

/**
 * Setup all event listeners for the UI
 */
function setupEventListeners() {
    // Configuration inputs
    document.getElementById('buy-signal')?.addEventListener('change', updateConfigFromForm);
    document.getElementById('sell-signal')?.addEventListener('change', updateConfigFromForm);
    document.getElementById('hold-signal')?.addEventListener('change', updateConfigFromForm);
    document.getElementById('initial-capital')?.addEventListener('input', updateConfigFromForm);
    document.getElementById('start-date')?.addEventListener('change', updateConfigFromForm);
    document.getElementById('end-date')?.addEventListener('change', updateConfigFromForm);
    document.getElementById('tesla-filter')?.addEventListener('change', updateConfigFromForm);
    document.getElementById('sequence-filter')?.addEventListener('change', updateConfigFromForm);
    document.getElementById('position-size')?.addEventListener('input', updateConfigFromForm);
    document.getElementById('stop-loss')?.addEventListener('input', updateConfigFromForm);
    document.getElementById('take-profit')?.addEventListener('input', updateConfigFromForm);
    document.getElementById('fee-percent')?.addEventListener('input', updateConfigFromForm);
    document.getElementById('slippage-bps')?.addEventListener('input', updateConfigFromForm);
    
    // Action buttons
    document.getElementById('run-backtest')?.addEventListener('click', runBacktest);
    document.getElementById('reset-config')?.addEventListener('click', resetConfig);
    
    // Tab navigation (for results)
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            if (tabName) switchTab(tabName);
        });
    });
}

/**
 * Hide results section initially
 */
function hideResults() {
    const resultsSection = document.getElementById('results-section');
    if (resultsSection) {
        resultsSection.style.display = 'none';
    }
}

/**
 * Show results section after backtest
 */
function showResults() {
    const resultsSection = document.getElementById('results-section');
    if (resultsSection) {
        resultsSection.style.display = 'block';
    }
}

/**
 * Update configuration from form inputs
 */
function updateConfigFromForm() {
    appState.config = {
        buySignal: parseInt(document.getElementById('buy-signal')?.value || 1),
        sellSignal: parseInt(document.getElementById('sell-signal')?.value || 5),
        holdSignal: parseInt(document.getElementById('hold-signal')?.value || 9),
        initialCapital: parseInt(document.getElementById('initial-capital')?.value || 10000),
        startDate: document.getElementById('start-date')?.value || '2020-01-01',
        endDate: document.getElementById('end-date')?.value || '2023-12-31',
        teslaFilter: document.getElementById('tesla-filter')?.checked || false,
        sequenceFilter: document.getElementById('sequence-filter')?.checked || false,
        positionSize: parseFloat(document.getElementById('position-size')?.value || 1.0),
        stopLoss: parseFloat(document.getElementById('stop-loss')?.value || 10),
        takeProfit: parseFloat(document.getElementById('take-profit')?.value || 20),
        feePercent: parseFloat(document.getElementById('fee-percent')?.value || 0.10),
        slippageBps: parseInt(document.getElementById('slippage-bps')?.value || 5)
    };
}

/**
 * Reset configuration to defaults
 */
function resetConfig() {
    document.getElementById('buy-signal').value = 1;
    document.getElementById('sell-signal').value = 5;
    document.getElementById('hold-signal').value = 9;
    document.getElementById('initial-capital').value = 10000;
    document.getElementById('start-date').value = '2020-01-01';
    document.getElementById('end-date').value = '2023-12-31';
    document.getElementById('tesla-filter').checked = true;
    document.getElementById('sequence-filter').checked = true;
    document.getElementById('position-size').value = 1.0;
    document.getElementById('stop-loss').value = 10;
    document.getElementById('take-profit').value = 20;
    document.getElementById('fee-percent').value = 0.10;
    document.getElementById('slippage-bps').value = 5;
    
    updateConfigFromForm();
    hideResults();
    backtestResults = null;
    
    showNotification('Configuration reset to defaults', 'info');
}

/**
 * Switch between result tabs
 * @param {string} tabName - Name of the tab to switch to
 */
function switchTab(tabName) {
    // Update active tab button
    document.querySelectorAll('.tab').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`.tab[data-tab="${tabName}"]`);
    activeBtn?.classList.add('active');

    // Update active tab content
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    const activePanel = document.getElementById(`${tabName}-tab`);
    activePanel?.classList.add('active');
    
    appState.activeTab = tabName;
}

/**
 * Load historical data (simulated - in real implementation would fetch from file)
 */
async function loadHistoricalData() {
    try {
        console.log('Loading historical BTC data from local JSON...');
        const res = await fetch('/src/data/btc-historical-data.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();

        // Use browser-global DataProcessor if available
        const DP = window.DataProcessor;
        if (!DP) throw new Error('DataProcessor not available on window');
        processedData = DP.processRawData(raw);

        console.log(`Loaded ${processedData.metadata.totalRecords} BTC daily records`);
        showNotification(`Loaded ${processedData.metadata.totalRecords} BTC daily records`, 'success');
    } catch (error) {
        console.error('Error loading historical data:', error);
        showNotification('Error loading data. Please check console for details.', 'error');
    }
}

/**
 * Run backtest with current configuration and TradingView chart
 */
async function runBacktest() {
    if (appState.isRunning) {
        return;
    }
    
    try {
        appState.isRunning = true;
        
        // Update button state
        const button = document.getElementById('run-backtest');
        if (button) {
            button.textContent = '⏳ Running...';
            button.disabled = true;
        }
        
        updateConfigFromForm();
        showNotification('Running vortex math backtest...', 'info');
        
        // Initialize TradingView chart if not already done
        if (!tradingViewChart) {
            tradingViewChart = new TradingViewChart('tradingview-chart');
        }
        
        // Load chart data with vortex math
        const chartData = await tradingViewChart.loadDataAndDisplay({
            startDate: appState.config.startDate,
            endDate: appState.config.endDate,
            buySignal: appState.config.buySignal,
            sellSignal: appState.config.sellSignal
        });
        
        // Generate trading signals from chart data
        const tradingSignals = tradingViewChart.generateTradingSignals(
            chartData.vortexData,
            appState.config.buySignal,
            appState.config.sellSignal
        );
        
        // Calculate backtest performance
        const performance = calculateBacktestPerformance(tradingSignals, appState.config.initialCapital);
        
            backtestResults = {
            totalReturn: performance.totalReturn,
            finalCapital: performance.finalCapital,
                performance: {
                totalTrades: tradingSignals.length,
                winRate: performance.winRate,
                maxDrawdown: performance.maxDrawdown,
                sharpeRatio: performance.sharpeRatio
            },
            trades: tradingSignals,
            config: {...appState.config},
            chartData: chartData
        };
        
        // Update UI with results
        updateResultsDisplay();
        showResults();
        
        // Update chart status
        document.getElementById('chart-status').textContent = `Chart loaded with ${chartData.candleData.length} candles. Each candle shows vortex math digital root (1-9).`;
        
        // Reset button
        if (button) {
            button.textContent = '🚀 Run Backtest';
            button.disabled = false;
        }
        
        appState.isRunning = false;
        showNotification('Backtest completed successfully!', 'success');
        
    } catch (error) {
        console.error('Error running backtest:', error);
        showNotification('Error running backtest. Please check console for details.', 'error');
        
        // Reset button on error
        const button = document.getElementById('run-backtest');
        if (button) {
            button.textContent = '🚀 Run Backtest';
            button.disabled = false;
        }
        appState.isRunning = false;
    }
}

/**
 * Calculate backtest performance from trading signals
 */
function calculateBacktestPerformance(signals, initialCapital) {
    let capital = initialCapital;
    let maxCapital = initialCapital;
    let minCapital = initialCapital;
    let winningTrades = 0;
    let totalTrades = 0;
    
    signals.forEach(signal => {
        if (signal.pnl !== 0) {
            totalTrades++;
            capital += signal.pnl;
            
            if (signal.pnl > 0) {
                winningTrades++;
            }
            
            maxCapital = Math.max(maxCapital, capital);
            minCapital = Math.min(minCapital, capital);
        }
    });
    
    const totalReturn = ((capital - initialCapital) / initialCapital) * 100;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const maxDrawdown = ((maxCapital - minCapital) / maxCapital) * 100;
    
    // Simple Sharpe ratio calculation (assuming risk-free rate of 2%)
    const avgReturn = totalReturn / (signals.length > 0 ? signals.length : 1);
    const sharpeRatio = avgReturn / Math.max(Math.sqrt(maxDrawdown), 1);
    
    return {
        totalReturn,
        finalCapital: capital,
        winRate,
        maxDrawdown,
        sharpeRatio: Math.max(-2, Math.min(3, sharpeRatio)) // Cap between -2 and 3
    };
}

/**
 * Update performance metrics in the UI
 */
function updatePerformanceMetrics() {
    if (!backtestResults) return;
    
    // Update metric cards
    document.getElementById('total-return').textContent = `${backtestResults.totalReturn.toFixed(2)}%`;
    document.getElementById('win-rate').textContent = `${backtestResults.performance.winRate.toFixed(1)}%`;
    document.getElementById('total-trades').textContent = backtestResults.performance.totalTrades;
    document.getElementById('max-drawdown').textContent = `${backtestResults.performance.maxDrawdown.toFixed(2)}%`;
    document.getElementById('sharpe-ratio').textContent = backtestResults.performance.sharpeRatio.toFixed(2);
    document.getElementById('final-capital').textContent = `$${backtestResults.finalCapital.toLocaleString()}`;
    
    // Update return color
    const totalReturnElement = document.getElementById('total-return');
    if (backtestResults.totalReturn >= 0) {
        totalReturnElement.classList.add('positive');
        totalReturnElement.classList.remove('negative');
    } else {
        totalReturnElement.classList.add('negative');
        totalReturnElement.classList.remove('positive');
    }
    
    // Update tab content
    updateTradesTable();
    updateAnalysisTab();
}

/**
 * Update the trades table
 */
function updateTradesTable() {
    const tradesContainer = document.getElementById('trades-table');
    
    if (!backtestResults || !backtestResults.trades || backtestResults.trades.length === 0) {
        tradesContainer.innerHTML = '<p>No trades executed during the backtest period.</p>';
        return;
    }
    
    let html = `
        <table class="trades-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Action</th>
                    <th>Price</th>
                    <th>Digital Root</th>
                    <th>P&L</th>
                    <th>P&L %</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    backtestResults.trades.forEach(trade => {
        const pnlClass = trade.profitLoss >= 0 ? 'positive' : 'negative';
        const pnlPercent = trade.profitLossPercent ? trade.profitLossPercent.toFixed(2) : '-';
        
        html += `
            <tr>
                <td>${trade.date}</td>
                <td><span class="trade-${trade.action.toLowerCase()}">${trade.action}</span></td>
                <td>$${trade.price.toFixed(2)}</td>
                <td>${trade.digitalRoot}</td>
                <td class="${pnlClass}">$${trade.profitLoss.toFixed(2)}</td>
                <td class="${pnlClass}">${pnlPercent}%</td>
                </tr>
        `;
    });
    
    html += '</tbody></table>';
    tradesContainer.innerHTML = html;
}

/**
 * Update the analysis tab
 */
function updateAnalysisTab() {
    // Digital root distribution
    const distributionElement = document.getElementById('root-distribution');
    if (processedData) {
        const distribution = processedData.statistics.digitalRootFrequency;
        let html = '<div class="distribution-chart">';
        for (let i = 1; i <= 9; i++) {
            const count = distribution[i] || 0;
            const percentage = ((count / processedData.metadata.totalRecords) * 100).toFixed(1);
            html += `
                <div class="distribution-bar">
                    <div class="bar-label">${i}</div>
                    <div class="bar-fill" style="height: ${percentage * 2}px;"></div>
                    <div class="bar-value">${percentage}%</div>
                </div>
            `;
        }
        html += '</div>';
        distributionElement.innerHTML = html;
    }
    
    // Strategy performance summary
    const performanceElement = document.getElementById('strategy-performance');
    if (backtestResults) {
        performanceElement.innerHTML = `
            <div class="performance-summary">
                <p><strong>Strategy:</strong> Buy on digital root ${appState.config.buySignal}, Sell on digital root ${appState.config.sellSignal}</p>
                <p><strong>Test Period:</strong> ${appState.config.startDate} to ${appState.config.endDate}</p>
                <p><strong>Total Trades:</strong> ${backtestResults.performance.totalTrades}</p>
                <p><strong>Winning Trades:</strong> ${backtestResults.performance.winningTrades}</p>
                <p><strong>Average Trade:</strong> ${backtestResults.performance.averageTradeReturn.toFixed(2)}%</p>
            </div>
        `;
    }
}

/**
 * Show notification to user
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, warning, info)
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 24px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '500',
        zIndex: '10000',
        maxWidth: '400px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
    });
    
    // Set background color based on type
    switch (type) {
        case 'success':
            notification.style.background = '#28a745';
            break;
        case 'error':
            notification.style.background = '#dc3545';
            break;
        case 'warning':
            notification.style.background = '#ffc107';
            notification.style.color = '#212529';
            break;
        case 'info':
        default:
            notification.style.background = '#17a2b8';
            break;
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 3000);
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);