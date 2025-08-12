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
    console.log('[app] initializeApp');
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
    // Render chart when showing results
    tryRenderChart();
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
        console.log('[app] Loading historical BTC data from local JSON...');
        const res = await fetch('/src/data/btc-historical-data.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();

        // Use browser-global DataProcessor if available
        const DP = window.DataProcessor;
        if (!DP) throw new Error('DataProcessor not available on window');
        processedData = DP.processRawData(raw);

        console.log('[app] Loaded records:', processedData.metadata.totalRecords);
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
    if (appState.isRunning) return;
    try {
        appState.isRunning = true;
        const button = document.getElementById('run-backtest');
        if (button) { button.textContent = '⏳ Running...'; button.disabled = true; }
        updateConfigFromForm();
        console.log('[app] Running backtest with config:', appState.config);
        showNotification('Running vortex math backtest...', 'info');

        if (!processedData) {
            await loadHistoricalData();
        }

        const Strategy = window.VortexStrategy;
        if (!Strategy) throw new Error('VortexStrategy not available on window');

        const strategy = new Strategy({
            buySignal: appState.config.buySignal,
            sellSignal: appState.config.sellSignal,
            holdSignal: appState.config.holdSignal,
            useTeslaFilter: appState.config.teslaFilter,
            useSequenceFilter: appState.config.sequenceFilter,
            maxPositionSize: appState.config.positionSize,
            stopLossPercent: appState.config.stopLoss,
            takeProfitPercent: appState.config.takeProfit
        });

        console.log('[app] Running strategy on', processedData.dailyData.length, 'daily points');
        backtestResults = strategy.backtest(processedData.dailyData, appState.config.initialCapital);
        console.log('[app] Backtest done. Final capital:', backtestResults.finalCapital);
        console.log('[app] Backtest results structure:', Object.keys(backtestResults));
        console.log('[app] Performance data:', backtestResults.performance);

        // Calculate buy and hold comparison
        calculateBuyAndHoldComparison();
        
        updatePerformanceMetrics();
        showResults();

        // Render chart with vortex labels
        if (window.renderPriceChartWithVortex) {
            const seriesData = processedData.dailyData.map(d => ({
                timestamp: d.timestamp,
                price: d.price,
                digitalRoot: d.digitalRoot,
                date: d.date
            }));
            console.log('[app] Rendering chart with points:', seriesData.length);
            console.log('[app] Sample data points:', seriesData.slice(0, 3));
            window.renderPriceChartWithVortex(seriesData);
            const status = document.getElementById('chart-status');
            if (status) status.textContent = `Chart loaded with ${seriesData.length} candles with vortex labels.`;
        } else {
            console.error('[app] renderPriceChartWithVortex function not available');
            const status = document.getElementById('chart-status');
            if (status) status.textContent = 'Chart rendering function not available';
        }

        if (button) { button.textContent = '🚀 Run Backtest'; button.disabled = false; }
        appState.isRunning = false;
        showNotification('Backtest completed successfully!', 'success');
    } catch (error) {
        console.error('Error running backtest:', error);
        showNotification('Error running backtest. Please check console for details.', 'error');
        const button = document.getElementById('run-backtest');
        if (button) { button.textContent = '🚀 Run Backtest'; button.disabled = false; }
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
 * Calculate buy and hold strategy comparison
 */
function calculateBuyAndHoldComparison() {
    if (!processedData || !backtestResults) return;
    
    const firstPrice = processedData.dailyData[0].price;
    const lastPrice = processedData.dailyData[processedData.dailyData.length - 1].price;
    
    const buyAndHoldReturn = ((lastPrice - firstPrice) / firstPrice) * 100;
    const buyAndHoldFinalCapital = appState.config.initialCapital * (lastPrice / firstPrice);
    
    backtestResults.buyAndHold = {
        return: buyAndHoldReturn,
        finalCapital: buyAndHoldFinalCapital,
        startPrice: firstPrice,
        endPrice: lastPrice
    };
    
    console.log('[app] Buy and hold comparison:', backtestResults.buyAndHold);
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
    
    // Update buy and hold comparison if available
    if (backtestResults.buyAndHold) {
        document.getElementById('buy-hold-return').textContent = `${backtestResults.buyAndHold.return.toFixed(2)}%`;
        document.getElementById('buy-hold-capital').textContent = `$${backtestResults.buyAndHold.finalCapital.toLocaleString()}`;
        
        const outperformance = backtestResults.totalReturn - backtestResults.buyAndHold.return;
        const outperformanceElement = document.getElementById('strategy-outperformance');
        outperformanceElement.textContent = `${outperformance >= 0 ? '+' : ''}${outperformance.toFixed(2)}%`;
        
        // Color code the outperformance
        if (outperformance >= 0) {
            outperformanceElement.classList.add('positive');
            outperformanceElement.classList.remove('negative');
        } else {
            outperformanceElement.classList.add('negative');
            outperformanceElement.classList.remove('positive');
        }
        
        // Color code buy and hold return
        const buyHoldElement = document.getElementById('buy-hold-return');
        if (backtestResults.buyAndHold.return >= 0) {
            buyHoldElement.classList.add('positive');
            buyHoldElement.classList.remove('negative');
        } else {
            buyHoldElement.classList.add('negative');
            buyHoldElement.classList.remove('positive');
        }
    }
    
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
        
        // Calculate average trade return for performance summary
        if (backtestResults.trades && backtestResults.trades.length > 0) {
            const avgTradeReturn = backtestResults.trades
                .filter(t => t.profit !== undefined)
                .reduce((sum, t) => sum + (t.profitPercent || 0), 0) / backtestResults.trades.length;
            backtestResults.performance.averageTradeReturn = avgTradeReturn;
        }
        
        tryRenderChart();
}

/**
 * Try to render chart with vortex labels using Lightweight Charts
 */
function tryRenderChart() {
    try {
        console.log('[app] tryRenderChart called');
        if (!processedData) {
            console.log('[app] No processed data available for chart');
            return;
        }
        if (!window.renderPriceChartWithVortex) {
            console.log('[app] renderPriceChartWithVortex function not available');
            return;
        }
        if (!window.LightweightCharts) {
            console.error('[app] LightweightCharts library not loaded');
            return;
        }
        
        // Build minimal OHLC-like array from processed data
        const seriesData = processedData.dailyData.map(d => ({
            timestamp: d.timestamp,
            price: d.price,
            digitalRoot: d.digitalRoot,
            date: d.date
        }));
        
        console.log('[app] tryRenderChart with data points:', seriesData.length);
        window.renderPriceChartWithVortex(seriesData);
        const status = document.getElementById('chart-status');
        if (status) status.textContent = `Chart rendered with ${seriesData.length} data points and vortex labels`;
    } catch (err) {
        console.error('Chart render error:', err);
        const status = document.getElementById('chart-status');
        if (status) status.textContent = `Chart error: ${err.message}`;
    }
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
    
    // Calculate average holding period for completed trades
    const completedTrades = backtestResults.trades.filter(trade => 
        trade.type === 'CLOSE' && trade.entryDate && trade.date
    );
    
    let avgHoldingPeriod = 0;
    if (completedTrades.length > 0) {
        const totalHoldingDays = completedTrades.reduce((sum, trade) => {
            const entryDate = new Date(trade.entryDate);
            const exitDate = new Date(trade.date);
            const holdingDays = Math.round((exitDate - entryDate) / (1000 * 60 * 60 * 24));
            return sum + holdingDays;
        }, 0);
        avgHoldingPeriod = totalHoldingDays / completedTrades.length;
    }
    
    let html = `
        <div class="trade-history-header">
            <h3>Trade History</h3>
            <div class="avg-holding-time">
                <span class="metric-label">Average Held Position Time:</span>
                <span class="metric-value">${avgHoldingPeriod.toFixed(1)} days</span>
            </div>
        </div>
        <table class="trades-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Action</th>
                    <th>Price</th>
                    <th>Digital Root</th>
                    <th>Portfolio</th>
                    <th>P&L</th>
                    <th>P&L %</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    backtestResults.trades.forEach(trade => {
        // Handle different trade object structures
        const profitLoss = trade.profit !== undefined ? trade.profit : (trade.profitLoss || 0);
        const profitLossPercent = trade.profitPercent !== undefined ? trade.profitPercent : (trade.profitLossPercent || 0);
        
        const pnlClass = profitLoss >= 0 ? 'positive' : 'negative';
        const pnlPercent = profitLossPercent ? profitLossPercent.toFixed(2) : '-';
        
        // Get portfolio value at this trade (use capital field from trade)
        const portfolioValue = trade.capital || 0;
        
        html += `
            <tr>
                <td>${trade.date}</td>
                <td><span class="trade-${trade.action.toLowerCase()}">${trade.action}</span></td>
                <td>$${trade.price.toFixed(2)}</td>
                <td>${trade.digitalRoot}</td>
                <td class="portfolio-value">$${portfolioValue.toLocaleString()}</td>
                <td class="${pnlClass}">$${profitLoss.toFixed(2)}</td>
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
    if (processedData && processedData.statistics && processedData.statistics.digitalRootDistribution) {
        const distribution = processedData.statistics.digitalRootDistribution.frequencies;
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
    } else {
        distributionElement.innerHTML = '<p>Statistical data not available</p>';
    }
    
    // Strategy performance summary
    const performanceElement = document.getElementById('strategy-performance');
    if (backtestResults && backtestResults.performance) {
        // Calculate average trade return if not already available
        const avgTradeReturn = backtestResults.performance.averageTradeReturn || 
                               (backtestResults.performance.totalTrades > 0 ? 
                                (backtestResults.performance.avgWin || 0) : 0);
        
        performanceElement.innerHTML = `
            <div class="performance-summary">
                <p><strong>Strategy:</strong> Buy on digital root ${appState.config.buySignal}, Sell on digital root ${appState.config.sellSignal}</p>
                <p><strong>Test Period:</strong> ${appState.config.startDate} to ${appState.config.endDate}</p>
                <p><strong>Total Trades:</strong> ${backtestResults.performance.totalTrades}</p>
                <p><strong>Winning Trades:</strong> ${backtestResults.performance.winningTrades}</p>
                <p><strong>Average Trade:</strong> ${avgTradeReturn.toFixed(2)}%</p>
            </div>
        `;
    } else {
        performanceElement.innerHTML = '<p>Run backtest to see performance analysis</p>';
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