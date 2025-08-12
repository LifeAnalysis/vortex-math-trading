/**
 * TradingView Integration for Vortex Math Trading System
 * Handles TradingView Lightweight Charts with BTC data and vortex overlays
 */

let chart = null;
let candlestickSeries = null;
let vortexLineSeries = null;
let historicalPriceData = null;
let backtestResults = null;

// Application state
const appState = {
    buySignal: 1,
    sellSignal: 5,
    initialCapital: 10000,
    isLoading: false
};

/**
 * Initialize the TradingView integration
 */
function initializeTradingViewApp() {
    console.log('Initializing TradingView integration...');
    
    // Setup event listeners
    setupEventListeners();
    
    // Load historical BTC data
    loadBTCData();
}

/**
 * Setup event listeners for UI controls
 */
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });
    
    // Backtest configuration controls
    const buySignalSelect = document.getElementById('buy-signal');
    const sellSignalSelect = document.getElementById('sell-signal');
    const initialCapitalInput = document.getElementById('initial-capital');
    const runBacktestBtn = document.getElementById('run-backtest');
    const resetConfigBtn = document.getElementById('reset-config');
    
    if (buySignalSelect) {
        buySignalSelect.addEventListener('change', (e) => {
            appState.buySignal = parseInt(e.target.value);
            updateChartMarkers();
        });
    }
    
    if (sellSignalSelect) {
        sellSignalSelect.addEventListener('change', (e) => {
            appState.sellSignal = parseInt(e.target.value);
            updateChartMarkers();
        });
    }
    
    if (initialCapitalInput) {
        initialCapitalInput.addEventListener('input', (e) => {
            appState.initialCapital = parseInt(e.target.value);
        });
    }
    
    if (runBacktestBtn) {
        runBacktestBtn.addEventListener('click', runBacktest);
    }
    
    if (resetConfigBtn) {
        resetConfigBtn.addEventListener('click', resetConfiguration);
    }
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`.tab[data-tab="${tabName}"]`)?.classList.add('active');
    
    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`)?.classList.add('active');
}

/**
 * Load historical BTC data and initialize chart
 */
async function loadBTCData() {
    try {
        console.log('Loading BTC historical data...');
        updateChartStatus('Loading BTC data...');
        
        // Load the historical data from JSON file
        const response = await fetch('/src/data/btc-historical-data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        historicalPriceData = data.prices;
        
        console.log(`Loaded ${historicalPriceData.length} data points`);
        
        // Format data for TradingView
        const formattedData = TradingViewDataFormatter.formatForTradingView(historicalPriceData);
        
        // Initialize TradingView chart
        initializeTradingViewChart(formattedData);
        
        updateChartStatus('Chart loaded successfully');
        
        // Show results section
        document.getElementById('results-section').style.display = 'block';
        
    } catch (error) {
        console.error('Error loading BTC data:', error);
        updateChartStatus('Error loading data: ' + error.message);
    }
}

/**
 * Initialize TradingView Lightweight Charts
 */
function initializeTradingViewChart(formattedData) {
    try {
        console.log('Initializing TradingView chart...');
        
        // Get chart container
        const chartContainer = document.getElementById('tradingview-chart');
        if (!chartContainer) {
            throw new Error('Chart container not found');
        }
        
        // Create chart
        chart = LightweightCharts.createChart(chartContainer, {
            width: chartContainer.clientWidth,
            height: 500,
            layout: {
                background: { color: '#ffffff' },
                textColor: '#333',
            },
            grid: {
                vertLines: { color: '#eeeeee' },
                horzLines: { color: '#eeeeee' },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
            rightPriceScale: {
                borderColor: '#cccccc',
            },
            timeScale: {
                borderColor: '#cccccc',
                timeVisible: true,
                secondsVisible: false,
            },
        });
        
        // Add candlestick series for price data
        candlestickSeries = chart.addCandlestickSeries({
            upColor: '#00C851',
            downColor: '#ff4444',
            borderDownColor: '#ff4444',
            borderUpColor: '#00C851',
            wickDownColor: '#ff4444',
            wickUpColor: '#00C851',
        });
        
        // Set price data
        candlestickSeries.setData(formattedData.candlestickData);
        
        // Add vortex line series for digital roots
        vortexLineSeries = chart.addLineSeries({
            color: '#ff6600',
            lineWidth: 2,
            priceScaleId: 'right',
            title: 'Vortex Numbers',
        });
        
        // Create separate price scale for vortex numbers (1-9)
        chart.priceScale('right').applyOptions({
            scaleMargins: {
                top: 0.7,
                bottom: 0.1,
            },
        });
        
        // Add vortex number overlay to a separate price scale
        const vortexPriceScale = chart.addPriceScale({
            position: 'left',
            scaleMargins: {
                top: 0.1,
                bottom: 0.7,
            },
        });
        
        vortexLineSeries.applyOptions({
            priceScaleId: 'left',
        });
        
        // Set vortex data
        vortexLineSeries.setData(formattedData.vortexOverlayData.map(point => ({
            time: point.time,
            value: point.value
        })));
        
        // Add signal markers
        updateChartMarkers();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            chart.applyOptions({ width: chartContainer.clientWidth });
        });
        
        console.log('TradingView chart initialized successfully');
        
    } catch (error) {
        console.error('Error initializing chart:', error);
        updateChartStatus('Error initializing chart: ' + error.message);
    }
}

/**
 * Update chart markers based on current signals
 */
function updateChartMarkers() {
    if (!candlestickSeries || !historicalPriceData) {
        return;
    }
    
    try {
        // Format data for signals
        const formattedData = TradingViewDataFormatter.formatForTradingView(historicalPriceData);
        
        // Create signal markers
        const markers = TradingViewDataFormatter.createSignalMarkers(
            formattedData.candlestickData,
            appState.buySignal,
            appState.sellSignal
        );
        
        // Set markers on the chart
        candlestickSeries.setMarkers(markers);
        
        console.log(`Updated chart with ${markers.length} signal markers`);
        
    } catch (error) {
        console.error('Error updating chart markers:', error);
    }
}

/**
 * Run backtest with current configuration
 */
async function runBacktest() {
    if (!historicalPriceData) {
        showNotification('Please wait for data to load first', 'warning');
        return;
    }
    
    try {
        appState.isLoading = true;
        updateBacktestButton(true);
        
        showNotification('Running vortex math backtest...', 'info');
        
        console.log('Running backtest with configuration:', appState);
        
        // Create strategy instance
        const strategy = new VortexStrategy({
            buySignal: appState.buySignal,
            sellSignal: appState.sellSignal,
            initialCapital: appState.initialCapital
        });
        
        // Run backtest
        backtestResults = await strategy.runBacktest(historicalPriceData);
        
        // Update results display
        displayBacktestResults(backtestResults);
        
        // Switch to results view
        switchTab('chart');
        
        showNotification('Backtest completed successfully!', 'success');
        
    } catch (error) {
        console.error('Error running backtest:', error);
        showNotification('Error running backtest: ' + error.message, 'error');
    } finally {
        appState.isLoading = false;
        updateBacktestButton(false);
    }
}

/**
 * Display backtest results in the UI
 */
function displayBacktestResults(results) {
    // Update performance metrics
    document.getElementById('total-return').textContent = results.totalReturn.toFixed(2) + '%';
    document.getElementById('win-rate').textContent = results.winRate.toFixed(1) + '%';
    document.getElementById('total-trades').textContent = results.totalTrades.toString();
    document.getElementById('max-drawdown').textContent = results.maxDrawdown.toFixed(2) + '%';
    document.getElementById('sharpe-ratio').textContent = results.sharpeRatio.toFixed(2);
    document.getElementById('final-capital').textContent = '$' + results.finalCapital.toLocaleString();
    
    // Update trades table
    updateTradesTable(results.trades);
    
    // Update pattern analysis
    updatePatternAnalysis(results);
}

/**
 * Update trades table
 */
function updateTradesTable(trades) {
    const tradesContainer = document.getElementById('trades-table');
    if (!tradesContainer || !trades || trades.length === 0) {
        if (tradesContainer) {
            tradesContainer.innerHTML = '<p>No trades executed with current configuration</p>';
        }
        return;
    }
    
    let tableHTML = `
        <table class="trades-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Action</th>
                    <th>Price</th>
                    <th>Digital Root</th>
                    <th>Quantity</th>
                    <th>P&L</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    trades.forEach(trade => {
        const pnlClass = trade.pnl > 0 ? 'positive' : trade.pnl < 0 ? 'negative' : '';
        tableHTML += `
            <tr>
                <td>${new Date(trade.timestamp).toLocaleDateString()}</td>
                <td><span class="trade-${trade.type.toLowerCase()}">${trade.type}</span></td>
                <td>$${trade.price.toLocaleString()}</td>
                <td>${trade.digitalRoot}</td>
                <td>${trade.quantity?.toFixed(6) || 'N/A'}</td>
                <td class="${pnlClass}">${trade.pnl ? '$' + trade.pnl.toLocaleString() : 'N/A'}</td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    tradesContainer.innerHTML = tableHTML;
}

/**
 * Update pattern analysis display
 */
function updatePatternAnalysis(results) {
    const rootDistribution = document.getElementById('root-distribution');
    const strategyPerformance = document.getElementById('strategy-performance');
    
    if (rootDistribution && results.digitalRootStats) {
        let distributionHTML = '<div class="distribution-grid">';
        for (let i = 1; i <= 9; i++) {
            const count = results.digitalRootStats.frequency[i] || 0;
            const percentage = results.digitalRootStats.percentages[i] || '0.00';
            distributionHTML += `
                <div class="root-item">
                    <span class="root-number">${i}</span>
                    <span class="root-count">${count} (${percentage}%)</span>
                </div>
            `;
        }
        distributionHTML += '</div>';
        rootDistribution.innerHTML = distributionHTML;
    }
    
    if (strategyPerformance) {
        strategyPerformance.innerHTML = `
            <div class="performance-stats">
                <div class="stat-item">
                    <span class="stat-label">Vortex Signals Used:</span>
                    <span class="stat-value">Buy: ${appState.buySignal}, Sell: ${appState.sellSignal}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Tesla Numbers (3,6,9):</span>
                    <span class="stat-value">${results.teslaNumberPercentage || 'N/A'}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Doubling Sequence:</span>
                    <span class="stat-value">${results.doublingSequencePercentage || 'N/A'}%</span>
                </div>
            </div>
        `;
    }
}

/**
 * Reset configuration to defaults
 */
function resetConfiguration() {
    appState.buySignal = 1;
    appState.sellSignal = 5;
    appState.initialCapital = 10000;
    
    // Update form values
    document.getElementById('buy-signal').value = '1';
    document.getElementById('sell-signal').value = '5';
    document.getElementById('initial-capital').value = '10000';
    
    // Update chart markers
    updateChartMarkers();
    
    // Clear results
    backtestResults = null;
    
    showNotification('Configuration reset to defaults', 'info');
}

/**
 * Update chart status message
 */
function updateChartStatus(message) {
    const statusElement = document.getElementById('chart-status');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

/**
 * Update backtest button state
 */
function updateBacktestButton(isLoading) {
    const button = document.getElementById('run-backtest');
    if (button) {
        if (isLoading) {
            button.textContent = '⏳ Running...';
            button.disabled = true;
        } else {
            button.textContent = '🚀 Run Backtest';
            button.disabled = false;
        }
    }
}

/**
 * Show notification to user
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span class="notification-icon">${getNotificationIcon(type)}</span>
        <span class="notification-message">${message}</span>
    `;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

/**
 * Get icon for notification type
 */
function getNotificationIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    return icons[type] || icons.info;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing TradingView app...');
    
    // Check if required libraries are loaded
    if (typeof LightweightCharts === 'undefined') {
        console.error('TradingView Lightweight Charts library not found');
        updateChartStatus('Error: TradingView library not loaded');
        return;
    }
    
    if (typeof VortexMath === 'undefined') {
        console.error('VortexMath library not found');
        updateChartStatus('Error: VortexMath library not loaded');
        return;
    }
    
    if (typeof TradingViewDataFormatter === 'undefined') {
        console.error('TradingViewDataFormatter library not found');
        updateChartStatus('Error: TradingView data formatter not loaded');
        return;
    }
    
    // Initialize the app
    initializeTradingViewApp();
});
