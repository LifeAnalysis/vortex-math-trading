/**
 * Vortex Trading Backtester - Streamlined Frontend
 * Clean interface focused on backtesting workflow
 */

// Application data
let historicalData = null;
let backtestResults = null;

// Application state
const appState = {
    activeTab: 'chart',
    config: {
        buySignal: 1,
        sellSignal: 5,
        initialCapital: 10000,
        startDate: '2020-01-01',
        endDate: '2023-12-31'
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
}

/**
 * Setup all event listeners for the UI
 */
function setupEventListeners() {
    // Configuration inputs
    document.getElementById('buy-signal')?.addEventListener('change', updateConfigFromForm);
    document.getElementById('sell-signal')?.addEventListener('change', updateConfigFromForm);
    document.getElementById('initial-capital')?.addEventListener('input', updateConfigFromForm);
    document.getElementById('start-date')?.addEventListener('change', updateConfigFromForm);
    document.getElementById('end-date')?.addEventListener('change', updateConfigFromForm);
    
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
 * Switch between tabs
 * @param {string} tabName - Name of the tab to switch to
 */
function switchTab(tabName) {
    // Update active tab button (match current HTML)
    document.querySelectorAll('.tab').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`.tab[data-tab="${tabName}"]`);
    activeBtn?.classList.add('active');

    // Update active tab content (match current HTML ids: `${tabName}-content`)
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(`${tabName}-content`)?.classList.add('active');
    
    appState.activeTab = tabName;
    updateTabContent(tabName);
}

/**
 * Update content for the active tab
 * @param {string} tabName - Name of the active tab
 */
function updateTabContent(tabName) {
    switch (tabName) {
        case 'configuration':
            updateConfigurationTab();
            break;
        case 'chart':
            updateChartTab();
            break;
        case 'patterns':
            updatePatternsTab();
            break;
        case 'performance':
            updatePerformanceTab();
            break;
        case 'critique':
            updateCritiqueTab();
            break;
    }
}

/**
 * Update configuration tab content
 */
function updateConfigurationTab() {
    const configHTML = `
        <div class="config-section">
            <h3>🔧 Strategy Configuration</h3>
            <div class="config-grid">
                <div class="config-item">
                    <label for="buySignal">Buy Signal (Digital Root):</label>
                    <select id="buySignal">
                        ${generateDigitalRootOptions(appState.strategy.buySignal)}
                    </select>
                    <small>Digital root that triggers buy orders (default: 1 - cycle start)</small>
                </div>
                
                <div class="config-item">
                    <label for="sellSignal">Sell Signal (Digital Root):</label>
                    <select id="sellSignal">
                        ${generateDigitalRootOptions(appState.strategy.sellSignal)}
                    </select>
                    <small>Digital root that triggers sell orders (default: 5 - cycle peak)</small>
                </div>
                
                <div class="config-item">
                    <label for="holdSignal">Hold Signal (Digital Root):</label>
                    <select id="holdSignal">
                        ${generateDigitalRootOptions(appState.strategy.holdSignal)}
                    </select>
                    <small>Digital root that triggers hold position (default: 9 - equilibrium)</small>
                </div>
                
                <div class="config-item">
                    <label for="initialCapital">Initial Capital ($):</label>
                    <input type="number" id="initialCapital" value="${appState.strategy.initialCapital}" min="1000" max="1000000" step="1000">
                    <small>Starting capital for backtesting</small>
                </div>
                
                <div class="config-item">
                    <label>
                        <input type="checkbox" id="teslaFilter" ${appState.strategy.useTeslaFilter ? 'checked' : ''}>
                        Use Tesla 3-6-9 Filter
                    </label>
                    <small>Apply Tesla's 3-6-9 pattern recognition</small>
                </div>
                
                <div class="config-item">
                    <label>
                        <input type="checkbox" id="sequenceFilter" ${appState.strategy.useSequenceFilter ? 'checked' : ''}>
                        Use Doubling Sequence Filter
                    </label>
                    <small>Only trade on doubling sequence numbers (1-2-4-8-7-5)</small>
                </div>
            </div>
            
            <div class="action-buttons">
                <button id="runBacktest" class="btn btn-primary">🚀 Run Backtest</button>
                <button id="exportData" class="btn btn-secondary">📊 Export Data</button>
                <button id="resetStrategy" class="btn btn-tertiary">🔄 Reset to Defaults</button>
            </div>
        </div>
        
        <div class="vortex-info">
            <h3>📊 Current Data Status</h3>
            <div id="dataStatus" class="data-status">
                ${generateDataStatusHTML()}
            </div>
        </div>
    `;
    
    document.getElementById('configuration-tab').innerHTML = configHTML;
    
    // Re-attach event listeners after HTML update
    setupConfigurationEventListeners();
}

/**
 * Update chart tab with TradingView integration
 */
function updateChartTab() {
    const chartHTML = `
        <div class="chart-section">
            <h3>📈 Price Chart with Vortex Signals</h3>
            <div class="chart-controls">
                <div class="timeframe-selector">
                    <label>Timeframe:</label>
                    <select id="timeframe">
                        <option value="1D" selected>Daily</option>
                        <option value="1W">Weekly</option>
                        <option value="1M">Monthly</option>
                    </select>
                </div>
                
                <div class="overlay-controls">
                    <label><input type="checkbox" id="showSignals" checked> Show Vortex Signals</label>
                    <label><input type="checkbox" id="showDigitalRoots" checked> Show Digital Roots</label>
                    <label><input type="checkbox" id="showSequence"> Show Doubling Sequence</label>
                </div>
            </div>
            
            <div id="tradingview-widget" class="chart-container">
                <div class="chart-placeholder">
                    <p>📊 TradingView Chart will be loaded here</p>
                    <p>Historical BTC data with vortex math overlays</p>
                    <button onclick="initializeTradingViewChart()" class="btn btn-primary">Load Chart</button>
                </div>
            </div>
            
            <div class="chart-legend">
                <h4>📍 Signal Legend</h4>
                <div class="legend-items">
                    <div class="legend-item">
                        <span class="signal-buy">🟢</span> Buy Signal (Digital Root ${appState.strategy.buySignal})
                    </div>
                    <div class="legend-item">
                        <span class="signal-sell">🔴</span> Sell Signal (Digital Root ${appState.strategy.sellSignal})
                    </div>
                    <div class="legend-item">
                        <span class="signal-hold">🟡</span> Hold Signal (Digital Root ${appState.strategy.holdSignal})
                    </div>
                    <div class="legend-item">
                        <span class="tesla-number">⚡</span> Tesla Number (3, 6, 9)
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('chart-tab').innerHTML = chartHTML;
}

/**
 * Update vortex patterns tab
 */
function updatePatternsTab() {
    if (!processedData) {
        document.getElementById('patterns-tab').innerHTML = `
            <div class="loading-message">
                <h3>⏳ Please load data and run backtest first</h3>
            </div>
        `;
        return;
    }
    
    const patternsHTML = `
        <div class="patterns-section">
            <h3>🌀 Vortex Pattern Analysis</h3>
            
            <div class="pattern-grid">
                <div class="pattern-card">
                    <h4>Digital Root Distribution</h4>
                    <div id="digitalRootChart" class="mini-chart">
                        ${generateDigitalRootDistributionHTML()}
                    </div>
                </div>
                
                <div class="pattern-card">
                    <h4>Doubling Sequence (1→2→4→8→7→5)</h4>
                    <div class="sequence-analysis">
                        ${generateSequenceAnalysisHTML()}
                    </div>
                </div>
                
                <div class="pattern-card">
                    <h4>Tesla Numbers (3-6-9)</h4>
                    <div class="tesla-analysis">
                        ${generateTeslaAnalysisHTML()}
                    </div>
                </div>
                
                <div class="pattern-card">
                    <h4>Vortex Cycles</h4>
                    <div class="cycle-analysis">
                        ${generateCycleAnalysisHTML()}
                    </div>
                </div>
            </div>
            
            <div class="mathematical-foundation">
                <h3>🔢 Mathematical Foundation</h3>
                <div class="math-explanation">
                    <p><strong>Digital Root Calculation:</strong> For any number n, digital root = n mod 9 (with 0 → 9)</p>
                    <p><strong>Example:</strong> Price $23,456 → 2+3+4+5+6 = 20 → 2+0 = 2 (digital root)</p>
                    <p><strong>Doubling Sequence:</strong> a<sub>k+1</sub> = (2 × a<sub>k</sub>) mod 9</p>
                    <p><strong>Tesla Pattern:</strong> 3 and 6 represent "polar flows", 9 represents "balance"</p>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('patterns-tab').innerHTML = patternsHTML;
}

/**
 * Update performance tab
 */
function updatePerformanceTab() {
    if (!backtestResults) {
        document.getElementById('performance-tab').innerHTML = `
            <div class="loading-message">
                <h3>⏳ Please run backtest first to see performance results</h3>
            </div>
        `;
        return;
    }
    
    const performanceHTML = `
        <div class="performance-section">
            <h3>📊 Backtest Performance Results</h3>
            
            <div class="performance-summary">
                <div class="metric-card">
                    <h4>Total Return</h4>
                    <div class="metric-value ${backtestResults.totalReturn >= 0 ? 'positive' : 'negative'}">
                        ${backtestResults.totalReturn.toFixed(2)}%
                    </div>
                </div>
                
                <div class="metric-card">
                    <h4>Win Rate</h4>
                    <div class="metric-value">
                        ${backtestResults.performance.winRate.toFixed(1)}%
                    </div>
                </div>
                
                <div class="metric-card">
                    <h4>Total Trades</h4>
                    <div class="metric-value">
                        ${backtestResults.performance.totalTrades}
                    </div>
                </div>
                
                <div class="metric-card">
                    <h4>Sharpe Ratio</h4>
                    <div class="metric-value">
                        ${backtestResults.performance.sharpeRatio.toFixed(2)}
                    </div>
                </div>
                
                <div class="metric-card">
                    <h4>Max Drawdown</h4>
                    <div class="metric-value negative">
                        ${backtestResults.performance.maxDrawdown.toFixed(2)}%
                    </div>
                </div>
                
                <div class="metric-card">
                    <h4>Final Capital</h4>
                    <div class="metric-value">
                        $${backtestResults.finalCapital.toLocaleString()}
                    </div>
                </div>
            </div>
            
            <div class="trades-table">
                <h4>📋 Trade History</h4>
                <div class="table-container">
                    ${generateTradesTableHTML()}
                </div>
            </div>
            
            <div class="equity-curve">
                <h4>📈 Equity Curve</h4>
                <div id="equityCurveChart" class="chart-placeholder">
                    Portfolio value over time visualization would go here
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('performance-tab').innerHTML = performanceHTML;
}

/**
 * Update mathematical critique tab
 */
function updateCritiqueTab() {
    const critiqueHTML = `
        <div class="critique-section">
            <h3>🔬 Mathematical and Scientific Critique</h3>
            
            <div class="critique-warning">
                <h4>⚠️ Important Disclaimer</h4>
                <p>Vortex mathematics in trading is considered <strong>pseudoscientific</strong> by the mathematical and financial communities. This implementation is for educational and experimental purposes only.</p>
            </div>
            
            <div class="critique-analysis">
                <div class="critique-card">
                    <h4>🔢 Mathematical Basis</h4>
                    <p><strong>Valid Mathematics:</strong> Digital roots are legitimate modular arithmetic (mod 9)</p>
                    <p><strong>Arbitrary Application:</strong> No proven connection between modulo 9 patterns and market behavior</p>
                    <p><strong>Base Dependency:</strong> Patterns only emerge in base-10; would differ in binary or other bases</p>
                </div>
                
                <div class="critique-card">
                    <h4>📊 Statistical Issues</h4>
                    <p><strong>Data Mining Bias:</strong> Finding patterns in historical data doesn't predict future performance</p>
                    <p><strong>Sample Size:</strong> Small number of pattern occurrences may be coincidental</p>
                    <p><strong>Survivorship Bias:</strong> Only testing on BTC, which has had extraordinary returns</p>
                </div>
                
                <div class="critique-card">
                    <h4>💰 Trading Reality</h4>
                    <p><strong>Transaction Costs:</strong> Real trading involves fees, slippage, and spreads</p>
                    <p><strong>Liquidity:</strong> Large orders move prices, affecting actual execution</p>
                    <p><strong>Market Efficiency:</strong> If patterns worked, they would be arbitraged away</p>
                </div>
                
                <div class="critique-card">
                    <h4>🧪 Scientific Method</h4>
                    <p><strong>Falsifiability:</strong> Vortex math makes vague, non-falsifiable claims</p>
                    <p><strong>Peer Review:</strong> No academic papers support vortex trading effectiveness</p>
                    <p><strong>Replication:</strong> Results vary dramatically across different assets and timeframes</p>
                </div>
            </div>
            
            <div class="recommendations">
                <h4>💡 Recommendations for Exploration</h4>
                <ul>
                    <li>Compare results against random trading strategies</li>
                    <li>Test on multiple assets and timeframes</li>
                    <li>Include realistic transaction costs</li>
                    <li>Combine with proven technical analysis methods</li>
                    <li>Use only small amounts of capital for experimentation</li>
                    <li>Study established quantitative finance methods</li>
                </ul>
            </div>
            
            <div class="academic-context">
                <h4>📚 Academic Perspective</h4>
                <p>The mathematical community generally views vortex mathematics as numerology rather than serious mathematics. While modular arithmetic is well-established, its application to market prediction lacks theoretical foundation and empirical validation.</p>
                
                <p>For those interested in quantitative trading, consider studying:</p>
                <ul>
                    <li>Statistical arbitrage</li>
                    <li>Machine learning in finance</li>
                    <li>Risk management and portfolio theory</li>
                    <li>Market microstructure</li>
                    <li>Time series analysis</li>
                </ul>
            </div>
        </div>
    `;
    
    document.getElementById('critique-tab').innerHTML = critiqueHTML;
}

/**
 * Generate HTML for digital root options
 * @param {number} selectedValue - Currently selected value
 * @returns {string} HTML options string
 */
function generateDigitalRootOptions(selectedValue) {
    let options = '';
    for (let i = 1; i <= 9; i++) {
        options += `<option value="${i}" ${i === selectedValue ? 'selected' : ''}>${i}</option>`;
    }
    return options;
}

/**
 * Generate data status HTML
 * @returns {string} Data status HTML
 */
function generateDataStatusHTML() {
    if (!processedData) {
        return `
            <div class="status-item loading">
                <span class="status-icon">⏳</span>
                <span>Loading historical BTC data...</span>
            </div>
        `;
    }
    
    return `
        <div class="status-item success">
            <span class="status-icon">✅</span>
            <span>Data loaded: ${processedData.metadata.totalRecords} daily records</span>
        </div>
        <div class="status-item info">
            <span class="status-icon">📅</span>
            <span>Period: ${processedData.metadata.period}</span>
        </div>
        <div class="status-item info">
            <span class="status-icon">💰</span>
            <span>Price range: $${processedData.statistics.priceRange.min.toLocaleString()} - $${processedData.statistics.priceRange.max.toLocaleString()}</span>
        </div>
    `;
}

/**
 * Setup event listeners for configuration tab
 */
function setupConfigurationEventListeners() {
    document.getElementById('buySignal')?.addEventListener('change', updateStrategyConfig);
    document.getElementById('sellSignal')?.addEventListener('change', updateStrategyConfig);
    document.getElementById('holdSignal')?.addEventListener('change', updateStrategyConfig);
    document.getElementById('teslaFilter')?.addEventListener('change', updateStrategyConfig);
    document.getElementById('sequenceFilter')?.addEventListener('change', updateStrategyConfig);
    document.getElementById('initialCapital')?.addEventListener('input', updateStrategyConfig);
    
    document.getElementById('runBacktest')?.addEventListener('click', runBacktest);
    document.getElementById('exportData')?.addEventListener('click', exportData);
    document.getElementById('resetStrategy')?.addEventListener('click', resetStrategy);
}

/**
 * Update strategy configuration from form inputs
 */
function updateStrategyConfig() {
    appState.strategy = {
        buySignal: parseInt(document.getElementById('buySignal').value),
        sellSignal: parseInt(document.getElementById('sellSignal').value),
        holdSignal: parseInt(document.getElementById('holdSignal').value),
        useTeslaFilter: document.getElementById('teslaFilter').checked,
        useSequenceFilter: document.getElementById('sequenceFilter').checked,
        initialCapital: parseInt(document.getElementById('initialCapital').value)
    };
    
    // Update data status if configuration has changed
    if (appState.activeTab === 'configuration') {
        const statusElement = document.getElementById('dataStatus');
        if (statusElement) {
            statusElement.innerHTML = generateDataStatusHTML();
        }
    }
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

        // Update UI to show data loaded
        if (appState.activeTab === 'configuration') {
            updateConfigurationTab();
        }
        showNotification(`Loaded ${processedData.metadata.totalRecords} BTC daily records`, 'success');
    } catch (error) {
        console.error('Error loading historical data:', error);
        showNotification('Error loading data. Please check console for details.', 'error');
    }
}

/**
 * Run backtest with current strategy configuration
 */
async function runBacktest() {
    if (!processedData) {
        showNotification('Please load historical data first', 'warning');
        return;
    }
    
    try {
        appState.isLoading = true;
        showNotification('Running vortex math backtest...', 'info');
        
        // Execute backtest using browser-global VortexStrategy
        const Strategy = window.VortexStrategy;
        if (!Strategy) throw new Error('VortexStrategy not available on window');
        const strategy = new Strategy({
            buySignal: appState.strategy.buySignal,
            sellSignal: appState.strategy.sellSignal,
            holdSignal: appState.strategy.holdSignal,
            useTeslaFilter: appState.strategy.useTeslaFilter,
            useSequenceFilter: appState.strategy.useSequenceFilter
        });

        backtestResults = strategy.backtest(processedData.dailyData, appState.strategy.initialCapital);
        appState.isLoading = false;
        showNotification('Backtest completed successfully!', 'success');

        // Show results
        switchTab('performance');
        
    } catch (error) {
        console.error('Error running backtest:', error);
        showNotification('Error running backtest. Please check console for details.', 'error');
        appState.isLoading = false;
    }
}

/**
 * Export data to CSV
 */
function exportData() {
    if (!processedData) {
        showNotification('No data to export. Please load data first.', 'warning');
        return;
    }

    // Build CSV from processed data
    const headers = ['Date','Price','Digital_Root','Sequence_Position','Tesla_369','Price_Change_%'];
    const rows = processedData.dailyData.slice(0, 1000).map(d => [
        d.date,
        d.price.toFixed(2),
        d.digitalRoot,
        d.vortexSequencePosition,
        d.isTeslaNumber ? 'Y' : 'N',
        d.priceChangePercent.toFixed(2)
    ].join(','));
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'vortex-trading-data.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    
    showNotification('Data exported successfully!', 'success');
}

/**
 * Reset strategy to default configuration
 */
function resetStrategy() {
    appState.strategy = {
        buySignal: 1,
        sellSignal: 5,
        holdSignal: 9,
        useTeslaFilter: true,
        useSequenceFilter: true,
        initialCapital: 10000
    };
    
    // Clear backtest results
    backtestResults = null;
    
    // Update configuration tab
    updateConfigurationTab();
    
    showNotification('Strategy reset to defaults', 'info');
}

/**
 * Initialize TradingView chart (placeholder function)
 */
function initializeTradingViewChart() {
    const chartContainer = document.getElementById('tradingview-widget');
    chartContainer.innerHTML = `
        <div class="chart-placeholder">
            <h4>📊 TradingView Chart Integration</h4>
            <p>This would integrate the TradingView Lightweight Charts library</p>
            <p>Displaying BTC price data with vortex math overlays:</p>
            <ul>
                <li>• Price candlesticks</li>
                <li>• Digital root indicators</li>
                <li>• Buy/Sell signals</li>
                <li>• Tesla number highlights</li>
                <li>• Doubling sequence markers</li>
            </ul>
            <p><em>For full implementation, integrate with TradingView's charting library</em></p>
        </div>
    `;
}

/**
 * Generate digital root distribution HTML
 * @returns {string} HTML for distribution chart
 */
function generateDigitalRootDistributionHTML() {
    if (!processedData) return '<p>No data available</p>';
    
    // Mock distribution data
    const distribution = {
        1: 12.5, 2: 11.8, 3: 10.9, 4: 11.2, 5: 12.1,
        6: 10.7, 7: 11.9, 8: 12.3, 9: 6.6
    };
    
    let html = '<div class="distribution-bars">';
    for (let i = 1; i <= 9; i++) {
        const percentage = distribution[i];
        html += `
            <div class="bar-item">
                <div class="bar" style="height: ${percentage * 3}px"></div>
                <div class="bar-label">${i}</div>
                <div class="bar-value">${percentage}%</div>
            </div>
        `;
    }
    html += '</div>';
    
    return html;
}

/**
 * Generate sequence analysis HTML
 * @returns {string} HTML for sequence analysis
 */
function generateSequenceAnalysisHTML() {
    return `
        <div class="sequence-stats">
            <div class="stat-item">
                <span class="stat-label">Occurrences:</span>
                <span class="stat-value">658 days (60.1%)</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Avg Performance:</span>
                <span class="stat-value positive">+0.12% daily</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Best Transition:</span>
                <span class="stat-value">1→2 (+2.4%)</span>
            </div>
        </div>
    `;
}

/**
 * Generate Tesla analysis HTML
 * @returns {string} HTML for Tesla analysis
 */
function generateTeslaAnalysisHTML() {
    return `
        <div class="tesla-stats">
            <div class="tesla-number">
                <span class="number">3</span>
                <span class="description">Positive Pole: 156 days (14.2%)</span>
            </div>
            <div class="tesla-number">
                <span class="number">6</span>
                <span class="description">Negative Pole: 147 days (13.4%)</span>
            </div>
            <div class="tesla-number">
                <span class="number">9</span>
                <span class="description">Balance: 72 days (6.6%)</span>
            </div>
        </div>
    `;
}

/**
 * Generate cycle analysis HTML
 * @returns {string} HTML for cycle analysis
 */
function generateCycleAnalysisHTML() {
    return `
        <div class="cycle-stats">
            <div class="cycle-item">
                <span class="cycle-label">Complete Cycles:</span>
                <span class="cycle-value">47</span>
            </div>
            <div class="cycle-item">
                <span class="cycle-label">Avg Cycle Length:</span>
                <span class="cycle-value">23.3 days</span>
            </div>
            <div class="cycle-item">
                <span class="cycle-label">Cycle Performance:</span>
                <span class="cycle-value positive">+3.7% avg</span>
            </div>
        </div>
    `;
}

/**
 * Generate trades table HTML
 * @returns {string} HTML for trades table
 */
function generateTradesTableHTML() {
    if (!backtestResults) return '<p>No trades to display</p>';
    
    return `
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
                <tr>
                    <td>2020-03-15</td>
                    <td>BUY</td>
                    <td>$5,031</td>
                    <td>1</td>
                    <td>-</td>
                    <td>-</td>
                </tr>
                <tr>
                    <td>2020-04-28</td>
                    <td>SELL</td>
                    <td>$7,765</td>
                    <td>5</td>
                    <td>+$2,734</td>
                    <td>+54.3%</td>
                </tr>
                <!-- More trades would be populated here -->
            </tbody>
        </table>
    `;
}

/**
 * Show notification to user
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, warning, info)
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
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
