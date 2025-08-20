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
        cryptocurrency: 'bitcoin',
        buySignal: 1,
        sellSignal: 5,
        holdSignal: 9,
        initialCapital: 10000,
        startDate: '2018-01-01',
        endDate: '2025-08-12',
        teslaFilter: true,
        sequenceFilter: true,
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
    document.getElementById('cryptocurrency')?.addEventListener('change', onCryptocurrencyChange);
    document.getElementById('buy-signal')?.addEventListener('change', updateConfigFromForm);
    document.getElementById('sell-signal')?.addEventListener('change', updateConfigFromForm);
    document.getElementById('hold-signal')?.addEventListener('change', updateConfigFromForm);
    document.getElementById('initial-capital')?.addEventListener('input', updateConfigFromForm);
    document.getElementById('start-date')?.addEventListener('change', updateConfigFromForm);
    document.getElementById('end-date')?.addEventListener('change', updateConfigFromForm);
    document.getElementById('tesla-filter')?.addEventListener('change', updateConfigFromForm);
    document.getElementById('sequence-filter')?.addEventListener('change', updateConfigFromForm);


    
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
        cryptocurrency: document.getElementById('cryptocurrency')?.value || 'bitcoin',
        buySignal: parseInt(document.getElementById('buy-signal')?.value || 1),
        sellSignal: parseInt(document.getElementById('sell-signal')?.value || 5),
        holdSignal: parseInt(document.getElementById('hold-signal')?.value || 9),
        initialCapital: parseInt(document.getElementById('initial-capital')?.value || 10000),
        startDate: document.getElementById('start-date')?.value || '2018-01-01',
        endDate: document.getElementById('end-date')?.value || '2025-08-12',
        teslaFilter: document.getElementById('tesla-filter')?.checked || false,
        sequenceFilter: document.getElementById('sequence-filter')?.checked || false,
        feePercent: 0.10,
        slippageBps: 5
    };
}

/**
 * Handle cryptocurrency selection change
 */
async function onCryptocurrencyChange() {
    updateConfigFromForm();
    console.log(`[app] Cryptocurrency changed to: ${appState.config.cryptocurrency}`);
    
    // Clear existing data and chart
    processedData = null;
    if (tradingViewChart) {
        // Clear chart data
        tradingViewChart.remove();
        tradingViewChart = null;
    }
    
    // Hide results while loading new data
    hideResults();
    
    // Reload data for new cryptocurrency
    await loadHistoricalData();
    
    // Update date ranges to match new cryptocurrency data
    if (processedData && processedData.dailyData) {
        updateDateInputLimits(processedData.dailyData, true); // true = update input values
    }
    
    // Update chart title or other UI elements as needed
    const cryptoName = appState.config.cryptocurrency === 'bitcoin' ? 'Bitcoin (BTC)' : 'Solana (SOL)';
    showNotification(`Switched to ${cryptoName} - dates updated to available range`, 'info');
}

/**
 * Reset configuration to defaults
 */
function resetConfig() {
    document.getElementById('cryptocurrency').value = 'bitcoin';
    document.getElementById('buy-signal').value = 1;
    document.getElementById('sell-signal').value = 5;
    document.getElementById('hold-signal').value = 9;
    document.getElementById('initial-capital').value = 10000;
    document.getElementById('start-date').value = '2018-01-01';
    document.getElementById('end-date').value = '2025-08-12';
    document.getElementById('tesla-filter').checked = true;
    document.getElementById('sequence-filter').checked = true;


    
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
 * Load historical data for the selected cryptocurrency
 */
async function loadHistoricalData() {
    try {
        const crypto = appState.config.cryptocurrency || 'bitcoin';
        const cryptoName = crypto === 'bitcoin' ? 'Bitcoin' : 'Solana';
        const cryptoSymbol = crypto === 'bitcoin' ? 'BTC' : 'SOL';
        const fileName = crypto === 'bitcoin' ? 'btc-historical-data.json' : 'sol-historical-data.json';
        
        console.log(`[app] Loading complete ${cryptoName} dataset...`);
        const res = await fetch(`/src/data/${fileName}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();

        // Use browser-global DataProcessor if available
        const DP = window.DataProcessor;
        if (!DP) throw new Error('DataProcessor not available on window');
        processedData = DP.processRawData(raw);

        console.log('[app] Loaded records:', processedData.metadata.totalRecords);
        console.log('[app] Date range:', raw.metadata.period);
        const prices = raw.prices.map(([_, price]) => price);
        console.log('[app] Price range: $' + 
            Math.min(...prices).toFixed(2) + 
            ' - $' + 
            Math.max(...prices).toFixed(2)
        );
        console.log('[app] Total return:', (((prices[prices.length-1] - prices[0]) / prices[0]) * 100).toFixed(2) + '%');
        showNotification(`Loaded ${processedData.metadata.totalRecords} ${cryptoSymbol} daily records (${raw.metadata.period})`, 'success');
        
        // Set dynamic date ranges based on actual data
        updateDateInputLimits(processedData.dailyData);
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

        });

        // Filter data by configured date range
        const filteredData = filterDataByDateRange(processedData.dailyData, appState.config.startDate, appState.config.endDate);
        console.log('[app] Running strategy on', filteredData.length, 'daily points (filtered from', processedData.dailyData.length, 'total)');
        console.log('[app] Date range:', appState.config.startDate, 'to', appState.config.endDate);
        
        if (filteredData.length === 0) {
            throw new Error('No data available for the selected date range');
        }
        
        backtestResults = strategy.backtest(filteredData, appState.config.initialCapital);
        console.log('[app] Backtest done. Final capital:', backtestResults.finalCapital);
        console.log('[app] Backtest results structure:', Object.keys(backtestResults));
        console.log('[app] Performance data:', backtestResults.performance);

        // Calculate buy and hold comparison using filtered data
        calculateBuyAndHoldComparison(filteredData);
        
        updatePerformanceMetrics();
        showResults();

        // Render chart with vortex labels using filtered data
        if (window.renderPriceChartWithVortex) {
            try {
                const seriesData = filteredData.map(d => ({
                    timestamp: d.timestamp,
                    price: d.price,
                    digitalRoot: d.digitalRoot,
                    date: d.date
                }));
                console.log('[app] Rendering chart with points:', seriesData.length);
                console.log('[app] Chart date range:', seriesData[0]?.date, 'to', seriesData[seriesData.length-1]?.date);
                console.log('[app] Sample data points:', seriesData.slice(0, 3));
                
                // Handle async chart rendering
                await window.renderPriceChartWithVortex(seriesData);
                
                const status = document.getElementById('chart-status');
                if (status) status.textContent = `Chart loaded with ${seriesData.length} candles with vortex labels.`;
            } catch (chartError) {
                console.error('[app] Chart rendering error:', chartError);
                const status = document.getElementById('chart-status');
                if (status) status.textContent = `Chart error: ${chartError.message}`;
            }
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
 * @param {Array} filteredData - The filtered data array matching the backtest period
 */
function calculateBuyAndHoldComparison(filteredData) {
    if (!filteredData || !backtestResults || filteredData.length === 0) return;
    
    const firstPrice = filteredData[0].price;
    const lastPrice = filteredData[filteredData.length - 1].price;
    
    const buyAndHoldReturn = ((lastPrice - firstPrice) / firstPrice) * 100;
    const buyAndHoldFinalCapital = appState.config.initialCapital * (lastPrice / firstPrice);
    
    console.log('[app] Buy & Hold comparison for period:', filteredData[0].date, 'to', filteredData[filteredData.length - 1].date);
    console.log('[app] Buy & Hold: $' + firstPrice.toFixed(2), '→ $' + lastPrice.toFixed(2), '(' + buyAndHoldReturn.toFixed(2) + '%)');
    
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
    document.getElementById('sortino-ratio').textContent = backtestResults.performance.sortinoRatio.toFixed(2);
    document.getElementById('final-capital').textContent = `$${backtestResults.finalCapital.toLocaleString()}`;
    
    // Add worst drawdown day info
    if (backtestResults.dailyPortfolio && backtestResults.dailyPortfolio.length > 0) {
        let maxDD = 0;
        let worstDay = null;
        
        backtestResults.dailyPortfolio.forEach(day => {
            if (day.drawdown > maxDD) {
                maxDD = day.drawdown;
                worstDay = day;
            }
        });
        
        if (worstDay) {
            const maxDDElement = document.getElementById('max-drawdown');
            maxDDElement.title = `Worst day: ${worstDay.date} (Price: $${worstDay.price.toLocaleString()})`;
            maxDDElement.style.cursor = 'help';
        }
    }
    
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
async function tryRenderChart() {
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
        await window.renderPriceChartWithVortex(seriesData);
        const status = document.getElementById('chart-status');
        if (status) status.textContent = `Chart rendered with ${seriesData.length} data points and vortex labels`;
    } catch (err) {
        console.error('Chart render error:', err);
        const status = document.getElementById('chart-status');
        if (status) status.textContent = `Chart error: ${err.message}`;
    }
}

/**
 * Update date input limits based on actual data availability
 * @param {Array} dailyData - The processed daily data array
 * @param {boolean} updateValues - Whether to update the actual input values to span the full range
 */
function updateDateInputLimits(dailyData, updateValues = false) {
    if (!dailyData || dailyData.length === 0) return;
    
    const firstDate = new Date(dailyData[0].timestamp).toISOString().split('T')[0];
    const lastDate = new Date(dailyData[dailyData.length - 1].timestamp).toISOString().split('T')[0];
    
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    
    if (startDateInput) {
        startDateInput.min = firstDate;
        startDateInput.max = lastDate;
        
        // Update the actual values if requested (e.g., when changing cryptocurrencies)
        if (updateValues) {
            startDateInput.value = firstDate;
            console.log('[app] Updated start date value to:', firstDate);
        }
        
        console.log('[app] Set start date limits:', firstDate, 'to', lastDate);
    }
    
    if (endDateInput) {
        endDateInput.min = firstDate;
        endDateInput.max = lastDate;
        
        // Update the actual values if requested (e.g., when changing cryptocurrencies)
        if (updateValues) {
            endDateInput.value = lastDate;
            console.log('[app] Updated end date value to:', lastDate);
        }
        
        console.log('[app] Set end date limits:', firstDate, 'to', lastDate);
    }
    
    // Update app state config if values were changed
    if (updateValues) {
        appState.config.startDate = firstDate;
        appState.config.endDate = lastDate;
        console.log('[app] Updated app state dates:', firstDate, 'to', lastDate);
    }
}

/**
 * Filter data by date range
 * @param {Array} data - Array of daily data points
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Array} Filtered data array
 */
function filterDataByDateRange(data, startDate, endDate) {
    if (!data || !Array.isArray(data)) {
        console.warn('[app] Invalid data provided to filterDataByDateRange');
        return [];
    }
    
    const startTimestamp = new Date(startDate).getTime();
    const endTimestamp = new Date(endDate).getTime();
    
    console.log('[app] Filtering data from', startDate, 'to', endDate);
    console.log('[app] Timestamp range:', startTimestamp, 'to', endTimestamp);
    
    const filtered = data.filter(point => {
        if (!point || !point.timestamp) return false;
        return point.timestamp >= startTimestamp && point.timestamp <= endTimestamp;
    });
    
    console.log('[app] Filtered', data.length, 'points down to', filtered.length, 'points');
    return filtered;
}

/**
 * Create a visual trade chart showing buy/sell points
 */
function createTradeChart() {
    console.log('[trades] Creating trade chart...');
    
    const chartContainer = document.getElementById('trade-chart');
    if (!chartContainer) {
        console.error('[trades] Chart container not found');
        return;
    }
    
    // Check for required data
    if (!backtestResults) {
        console.log('[trades] No backtest results available');
        chartContainer.innerHTML = '<p style="color: #ffc107; padding: 20px; text-align: center;">Run a backtest to see trade visualization</p>';
        return;
    }
    
    if (!processedData || !processedData.dailyData) {
        console.error('[trades] No processed data available');
        chartContainer.innerHTML = '<p style="color: #ff6b6b; padding: 20px; text-align: center;">No price data available</p>';
        return;
    }
    
    if (!backtestResults.trades || backtestResults.trades.length === 0) {
        console.log('[trades] No trades to display');
        chartContainer.innerHTML = '<p style="color: #ffc107; padding: 20px; text-align: center;">No trades executed in this backtest period</p>';
        return;
    }
    
    // Check for LightweightCharts library
    if (!window.LightweightCharts) {
        console.error('[trades] LightweightCharts library not loaded');
        chartContainer.innerHTML = '<p style="color: #ff6b6b; padding: 20px; text-align: center;">Chart library not loaded. Please refresh the page.</p>';
        return;
    }
    
    // Clear any existing chart
    chartContainer.innerHTML = '';
    
    try {
        console.log('[trades] Available data:', {
            trades: backtestResults.trades.length,
            dailyData: processedData.dailyData.length,
            startDate: appState.config.startDate,
            endDate: appState.config.endDate
        });
        
        // Create the chart - copy from charts.js
        const chart = window.LightweightCharts.createChart(chartContainer, {
            width: chartContainer.clientWidth || 800,
            height: 450,
            autoSize: true,
            layout: {
                background: { type: 'solid', color: '#000000' },
                textColor: '#e0e0e0',
                fontSize: 12,
                fontFamily: 'JetBrains Mono, monospace'
            },
            grid: {
                vertLines: { color: 'rgba(0, 255, 136, 0.1)', style: 1 },
                horzLines: { color: 'rgba(0, 255, 136, 0.1)', style: 1 }
            },
            rightPriceScale: {
                borderVisible: true,
                borderColor: 'rgba(0, 255, 136, 0.3)',
                textColor: '#00ff88'
            },
            timeScale: {
                borderVisible: true,
                borderColor: 'rgba(0, 255, 136, 0.3)',
                textColor: '#00ff88',
                timeVisible: true,
                secondsVisible: false
            },
            crosshair: {
                mode: window.LightweightCharts.CrosshairMode?.Normal || 1,
                vertLine: { 
                    color: '#00ff88', 
                    width: 1, 
                    style: window.LightweightCharts.LineStyle?.Dashed || 2 
                },
                horzLine: { 
                    color: '#00ff88', 
                    width: 1, 
                    style: window.LightweightCharts.LineStyle?.Dashed || 2 
                }
            },
            handleScroll: true,
            handleScale: true
        });
        
        // Filter data to match backtest period
        const startDate = appState.config.startDate;
        const endDate = appState.config.endDate;
        const filteredData = processedData.dailyData.filter(d => 
            d.date >= startDate && d.date <= endDate
        );
        
        console.log('[trades] Filtered data points:', filteredData.length);
        
        if (filteredData.length === 0) {
            chartContainer.innerHTML = '<p style="color: #ffc107; padding: 20px; text-align: center;">No price data available for the selected date range</p>';
            return;
        }
        
        // Prepare price data for chart
        const priceData = filteredData.map(d => ({
            time: Math.floor(d.timestamp / 1000),
            value: d.price
        }));
        
        // Create series - copy the exact approach from charts.js
        let priceSeries;
        try {
            // Use official TradingView v5+ API syntax - same as charts.js
            console.log('[trades] Creating line series with official v5 API');
            
            priceSeries = chart.addSeries(window.LightweightCharts.LineSeries, {
                color: '#87CEEB',
                lineWidth: 2,
                priceLineVisible: true,
                lastValueVisible: true
            });
            
            console.log('[trades] Line series created successfully');
            
        } catch (lineError) {
            console.error('[trades] Line series failed, trying area series:', lineError);
            
            try {
                // Fallback to area series using v5 API
                priceSeries = chart.addSeries(window.LightweightCharts.AreaSeries, {
                    lineColor: '#87CEEB',
                    topColor: 'rgba(135, 206, 235, 0.4)',
                    bottomColor: 'rgba(135, 206, 235, 0.0)',
                    lineWidth: 2
                });
                
                console.log('[trades] Area series created as fallback');
                
            } catch (areaError) {
                console.error('[trades] Both series types failed:', areaError);
                chartContainer.innerHTML = '<p style="color: #ff6b6b; padding: 20px; text-align: center;">Unable to create chart series</p>';
                return;
            }
        }
        
        priceSeries.setData(priceData);
        
        // Build trade pairs to compute P&L
        const tradePairs = buildTradePairs(backtestResults.trades || []);
        const sellOutcomeByTs = new Map();
        tradePairs.forEach(p => {
            if (p.exit && p.exit.timestamp) {
                sellOutcomeByTs.set(p.exit.timestamp, { pnl: p.pnl, pnlPercent: p.pnlPercent });
            }
        });

        // Add trade markers - color coded by outcome when available
        const markers = [];
        backtestResults.trades.forEach(trade => {
            const tradeDate = new Date(trade.date);
            const timestamp = Math.floor(tradeDate.getTime() / 1000);
            
            if (trade.action === 'BUY') {
                markers.push({
                    time: timestamp,
                    position: 'belowBar',
                    color: '#00c77a',
                    shape: 'arrowUp',
                    text: 'BUY',
                    price: trade.price
                });
            } else if (trade.action === 'SELL') {
                const outcome = sellOutcomeByTs.get(timestamp);
                const outcomeColor = outcome ? (outcome.pnl > 0 ? '#00ff88' : (outcome.pnl < 0 ? '#ff4757' : '#ffc107')) : '#dc3545';
                const text = outcome && typeof outcome.pnlPercent === 'number' ? `SELL ${(outcome.pnlPercent >= 0 ? '+' : '')}${Math.round(outcome.pnlPercent)}%` : 'SELL';
                markers.push({
                    time: timestamp,
                    position: 'aboveBar',
                    color: outcomeColor,
                    shape: 'arrowDown',
                    text,
                    price: trade.price
                });
            }
        });
        
        if (markers.length > 0) {
            try {
                priceSeries.setMarkers(markers);
                console.log(`[trades] Added ${markers.length} trade markers successfully`);
            } catch (markerError) {
                console.error('[trades] setMarkers failed:', markerError);
                console.log('[trades] Falling back to manual marker rendering');
                
                // Fallback: manually draw markers like charts.js does with vortex labels
                drawTradeMarkers(chartContainer, chart, priceSeries, markers);
            }
        }
        


        // Fit content and store chart reference
        chart.timeScale().fitContent();
        chartContainer._tradeChart = chart;
        
        console.log(`[trades] Successfully created trade chart with ${markers.length} markers`);
        
    } catch (error) {
        console.error('[trades] Error creating trade chart:', error);
        chartContainer.innerHTML = `<p style="color: #ff6b6b; padding: 20px; text-align: center;">Chart error: ${error.message}</p>`;
    }
}

/**
 * Manually draw trade markers on the chart (fallback for when setMarkers fails)
 */
function drawTradeMarkers(container, chart, series, markers) {
    // Remove old markers if any
    const oldMarkers = container.querySelectorAll('.trade-marker');
    oldMarkers.forEach(el => el.remove());

    const timeScale = chart.timeScale();
    
    try {
        const updateMarkers = () => {
            // Clear existing markers
            const existingMarkers = container.querySelectorAll('.trade-marker');
            existingMarkers.forEach(el => el.remove());

            // Get visible time range to only draw visible markers
            const visibleRange = timeScale.getVisibleRange();
            if (!visibleRange) return;

            // Filter markers to only visible ones and sample heavily for readability
            let visibleMarkers = markers.filter(marker => {
                return marker.time >= visibleRange.from && marker.time <= visibleRange.to;
            });
            
            // Smart sampling: spread markers out evenly across time
            const timeSpan = visibleRange.to - visibleRange.from;
            const maxMarkers = 20; // Maximum markers to show at once
            
            if (visibleMarkers.length > maxMarkers) {
                const step = Math.floor(visibleMarkers.length / maxMarkers);
                visibleMarkers = visibleMarkers.filter((_, index) => index % step === 0);
            }
            
            // Further reduce if still too many
            if (visibleMarkers.length > maxMarkers) {
                visibleMarkers = visibleMarkers.slice(0, maxMarkers);
            }

            visibleMarkers.forEach(marker => {
                try {
                    // Use the exact same coordinate conversion as charts.js
                    const x = timeScale.timeToCoordinate(marker.time);
                    const y = series.priceToCoordinate(marker.price);
                    
                    if (x == null || y == null || x < 0 || y < 0) return;

                    // Create marker element exactly like charts.js vortex labels
                    const markerEl = document.createElement('div');
                    markerEl.className = 'trade-marker';
                    
                    // Apply styles exactly like charts.js
                    markerEl.style.position = 'absolute';
                    markerEl.style.left = `${Math.round(x)}px`;
                    
                    // Position above or below based on buy/sell
                    if (marker.position === 'belowBar') {
                        markerEl.style.top = `${Math.round(y + 15)}px`;
                        markerEl.style.transform = 'translate(-50%, 0%)';
                    } else {
                        markerEl.style.top = `${Math.round(y - 15)}px`;
                        markerEl.style.transform = 'translate(-50%, -100%)';
                    }
                    
                    markerEl.style.padding = '1px 4px';
                    markerEl.style.fontSize = '9px';
                    markerEl.style.fontWeight = 'bold';
                    markerEl.style.borderRadius = '3px';
                    markerEl.style.pointerEvents = 'none';
                    markerEl.style.background = marker.color;
                    markerEl.style.color = 'white';
                    markerEl.style.fontFamily = 'JetBrains Mono, monospace';
                    markerEl.style.whiteSpace = 'nowrap';
                    markerEl.style.zIndex = '1000';
                    markerEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
                    markerEl.style.border = '1px solid rgba(255,255,255,0.2)';
                    
                    // Add simplified text - just action and short price
                    const arrow = marker.position === 'belowBar' ? '↑' : '↓';
                    const shortPrice = marker.price ? `$${Math.round(marker.price / 1000)}k` : '';
                    markerEl.textContent = `${arrow}${marker.text.substring(0,1)} ${shortPrice}`;
                    
                    container.appendChild(markerEl);
                    
                    console.log(`[trades] Positioned ${marker.text} marker at x:${Math.round(x)}, y:${Math.round(y)}`);
                    
                } catch (err) {
                    console.warn('[trades] Failed to position marker:', err);
                }
            });

            console.log(`[trades] Drew ${visibleMarkers.length} manual trade markers`);
        };

        // Update markers initially
        updateMarkers();

        // Update markers when chart scrolls/zooms
        timeScale.subscribeVisibleTimeRangeChange(updateMarkers);

        // Store cleanup function
        container._cleanupTradeMarkers = () => {
            timeScale.unsubscribeVisibleTimeRangeChange(updateMarkers);
            const markers = container.querySelectorAll('.trade-marker');
            markers.forEach(el => el.remove());
        };

    } catch (error) {
        console.error('[trades] Error in manual marker rendering:', error);
    }
}

/**
 * Build buy→sell trade pairs to compute P&L
 */
function buildTradePairs(trades) {
    const pairs = [];
    if (!Array.isArray(trades) || trades.length === 0) return pairs;
    let current = null;
    trades.forEach(t => {
        const ts = Math.floor(new Date(t.date).getTime() / 1000);
        if (t.action === 'BUY' && !current) {
            current = { entry: { timestamp: ts, price: t.price, raw: t } };
        } else if (t.action === 'SELL' && current) {
            current.exit = { timestamp: ts, price: t.price, raw: t };
            const pnl = (current.exit.price - current.entry.price);
            const pnlPercent = (pnl / current.entry.price) * 100;
            current.pnl = pnl;
            current.pnlPercent = pnlPercent;
            pairs.push(current);
            current = null;
        }
    });
    return pairs;
}

/**
 * Build completed positions data for table view
 */
function buildCompletedPositions(trades) {
    const pairs = buildTradePairs(trades);
    return pairs.map(p => {
        const daysHeld = Math.max(1, Math.round((new Date(p.exit.raw.date) - new Date(p.entry.raw.date)) / (1000 * 60 * 60 * 24)));
        return {
            entry: { date: p.entry.raw.date, price: p.entry.price },
            exit: { date: p.exit.raw.date, price: p.exit.price },
            pnl: p.pnl,
            pnlPercent: p.pnlPercent,
            daysHeld
        };
    });
}

/**
 * Draw connecting lines between entry and exit trades via SVG overlay
 */
function drawTradeConnections(container, chart, series, tradePairs) {
    // Remove old overlay if any
    const old = container.querySelector('svg.trade-connections');
    if (old) old.remove();
    if (!tradePairs || tradePairs.length === 0) return;

    const timeScale = chart.timeScale();
    const width = container.clientWidth;
    const height = container.clientHeight;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'trade-connections');
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.style.position = 'absolute';
    svg.style.left = '0';
    svg.style.top = '0';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '900';

    const render = () => {
        // Clear previous children
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        tradePairs.forEach(p => {
            try {
                if (!p.entry || !p.exit) return;
                const x1 = timeScale.timeToCoordinate(p.entry.timestamp);
                const y1 = series.priceToCoordinate(p.entry.price);
                const x2 = timeScale.timeToCoordinate(p.exit.timestamp);
                const y2 = series.priceToCoordinate(p.exit.price);
                if (x1 == null || y1 == null || x2 == null || y2 == null) return;
                const color = p.pnl > 0 ? '#00ff88' : (p.pnl < 0 ? '#ff4757' : '#ffc107');
                const line = document.createElementNS(svgNS, 'line');
                line.setAttribute('x1', String(Math.round(x1)));
                line.setAttribute('y1', String(Math.round(y1)));
                line.setAttribute('x2', String(Math.round(x2)));
                line.setAttribute('y2', String(Math.round(y2)));
                line.setAttribute('stroke', color);
                line.setAttribute('stroke-width', '2');
                line.setAttribute('opacity', '0.7');
                svg.appendChild(line);
            } catch (err) {
                console.warn('[trades] drawTradeConnections line error:', err);
            }
        });
    };

    // Initial render
    render();
    container.appendChild(svg);

    // Update on zoom/scroll
    timeScale.subscribeVisibleTimeRangeChange(() => {
        render();
    });
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
    
    // Create the trade chart first
    createTradeChart();
    
    // Build completed positions table (entry→exit)
    const positions = buildCompletedPositions(backtestResults.trades);
    let positionsHtml = '';
    if (positions.length > 0) {
        // Calculate average holding period
        const avgHoldingDays = positions.reduce((sum, p) => sum + p.daysHeld, 0) / positions.length;
        
        positionsHtml += `
            <div class="positions-summary">
                <div class="positions-header">
                    <h4>✅ Completed Positions</h4>
                    <div class="avg-holding-time">
                        <span class="metric-label">Average Held Position Time:</span>
                        <span class="metric-value">${avgHoldingDays.toFixed(1)} days</span>
                    </div>
                </div>
                <table class="trades-table" id="positions-table-sortable">
                    <thead>
                        <tr>
                            <th class="sortable" data-column="entryDate" data-type="date">
                                Entry Date <span class="sort-indicator">⇅</span>
                            </th>
                            <th class="sortable" data-column="entryPrice" data-type="number">
                                Entry Price <span class="sort-indicator">⇅</span>
                            </th>
                            <th class="sortable" data-column="exitDate" data-type="date">
                                Exit Date <span class="sort-indicator">⇅</span>
                            </th>
                            <th class="sortable" data-column="exitPrice" data-type="number">
                                Exit Price <span class="sort-indicator">⇅</span>
                            </th>
                            <th class="sortable" data-column="daysHeld" data-type="number">
                                Days Held <span class="sort-indicator">⇅</span>
                            </th>
                            <th class="sortable" data-column="pnl" data-type="number">
                                P&L <span class="sort-indicator">⇅</span>
                            </th>
                            <th class="sortable" data-column="pnlPercent" data-type="number">
                                P&L % <span class="sort-indicator">⇅</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${positions.map(p => `
                            <tr>
                                <td data-value="${p.entry.date}">${p.entry.date}</td>
                                <td data-value="${p.entry.price}">$${p.entry.price.toLocaleString()}</td>
                                <td data-value="${p.exit.date}">${p.exit.date}</td>
                                <td data-value="${p.exit.price}">$${p.exit.price.toLocaleString()}</td>
                                <td data-value="${p.daysHeld}">${p.daysHeld}</td>
                                <td data-value="${p.pnl}" class="${p.pnl >= 0 ? 'positive' : 'negative'}">$${p.pnl.toFixed(2)}</td>
                                <td data-value="${p.pnlPercent}" class="${p.pnl >= 0 ? 'positive' : 'negative'}">${p.pnlPercent.toFixed(2)}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    tradesContainer.innerHTML = positionsHtml;
    
    // Add sort functionality for positions table
    setupTableSorting();
}

/**
 * Setup table sorting functionality
 */
function setupTableSorting() {
    // Setup sorting for positions table only
    const table = document.getElementById('positions-table-sortable');
    if (!table) return;
    
    const headers = table.querySelectorAll('th.sortable');
    let currentSort = { column: null, direction: 'asc' };
    
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.column;
            const type = header.dataset.type;
            
            // Toggle direction if same column, otherwise default to ascending
            if (currentSort.column === column) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.direction = 'asc';
            }
            currentSort.column = column;
            
            // Update sort indicators
            headers.forEach(h => {
                const indicator = h.querySelector('.sort-indicator');
                if (h === header) {
                    indicator.textContent = currentSort.direction === 'asc' ? '↑' : '↓';
                    h.classList.add('sorted');
                } else {
                    indicator.textContent = '⇅';
                    h.classList.remove('sorted');
                }
            });
            
            // Sort the positions table
            sortPositionsTable(table, column, type, currentSort.direction);
        });
    });
}

/**
 * Sort positions table by column
 */
function sortPositionsTable(table, column, type, direction) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    rows.sort((a, b) => {
        let aVal, bVal;
        
        // Get cell based on column index for positions table
        const columnIndex = {
            'entryDate': 0,
            'entryPrice': 1,
            'exitDate': 2,
            'exitPrice': 3,
            'daysHeld': 4,
            'pnl': 5,
            'pnlPercent': 6
        };
        
        const cellIndex = columnIndex[column];
        const aCells = a.querySelectorAll('td');
        const bCells = b.querySelectorAll('td');
        
        aVal = aCells[cellIndex]?.dataset.value;
        bVal = bCells[cellIndex]?.dataset.value;
        
        // Convert values based on type
        if (type === 'date') {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
        } else if (type === 'number') {
            aVal = parseFloat(aVal) || 0;
            bVal = parseFloat(bVal) || 0;
        }
        // string type uses values as-is
        
        // Handle null/undefined values
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        
        let comparison = 0;
        if (type === 'number' || type === 'date') {
            comparison = aVal - bVal;
        } else {
            comparison = aVal.toString().localeCompare(bVal.toString());
        }
        
        return direction === 'asc' ? comparison : -comparison;
    });
    
    // Clear tbody and append sorted rows
    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));
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
        
        // Find worst drawdown day details
        let worstDayInfo = '';
        if (backtestResults.dailyPortfolio && backtestResults.dailyPortfolio.length > 0) {
            let maxDD = 0;
            let worstDay = null;
            
            backtestResults.dailyPortfolio.forEach(day => {
                if (day.drawdown > maxDD) {
                    maxDD = day.drawdown;
                    worstDay = day;
                }
            });
            
            if (worstDay) {
                worstDayInfo = `
                    <p><strong>Worst Drawdown Day:</strong> ${worstDay.date}</p>
                    <p><strong>Price on Worst Day:</strong> $${worstDay.price.toLocaleString()}</p>
                    <p><strong>Portfolio Value:</strong> $${worstDay.portfolioValue.toLocaleString()}</p>
                    <p><strong>Position:</strong> ${worstDay.position}</p>
                `;
            }
        }
        
        performanceElement.innerHTML = `
            <div class="performance-summary">
                <p><strong>Strategy:</strong> Buy on digital root ${appState.config.buySignal}, Sell on digital root ${appState.config.sellSignal}</p>
                <p><strong>Test Period:</strong> ${appState.config.startDate} to ${appState.config.endDate}</p>
                <p><strong>Total Trades:</strong> ${backtestResults.performance.totalTrades}</p>
                <p><strong>Winning Trades:</strong> ${backtestResults.performance.winningTrades}</p>
                <p><strong>Average Trade:</strong> ${avgTradeReturn.toFixed(2)}%</p>
                <hr style="margin: 15px 0; border: 1px solid #333;">
                <h4>📉 Drawdown Analysis</h4>
                <p><strong>Max Drawdown:</strong> ${backtestResults.performance.maxDrawdown.toFixed(2)}%</p>
                ${worstDayInfo}
                <div style="background: #1a1a1a; padding: 15px; border-radius: 8px; margin: 10px 0;">
                    <h5>🎓 Understanding Drawdown:</h5>
                    <p><strong>Drawdown ≠ Daily Price Drop</strong></p>
                    <p>• <strong>Portfolio Peak:</strong> Your highest portfolio value ever reached</p>
                    <p>• <strong>Current Value:</strong> Portfolio value on the worst day</p>
                    <p>• <strong>Drawdown = (Peak - Current) / Peak</strong></p>
                    <p><em>Example: Peak $100K → Worst Day $30K = 70% drawdown</em></p>
                    <p><em>This happens when you're holding positions during market downturns, NOT from single-day crashes.</em></p>
                </div>
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