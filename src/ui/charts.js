/**
 * TradingView Lightweight Charts integration
 * Renders daily candles and overlays vortex digital root labels per close
 */

let tvChart = null;
let tvSeries = null;

function renderPriceChartWithVortex(data) {
    console.log('[charts] renderPriceChartWithVortex: received', Array.isArray(data) ? data.length : 0, 'points');
    const container = document.getElementById('tradingview-chart');
    if (!container) {
        console.error('[charts] Chart container not found');
        return;
    }

    if (!window.LightweightCharts) {
        console.error('[charts] LightweightCharts library not loaded');
        return;
    }
    
    console.log('[charts] LightweightCharts object:', LightweightCharts);
    console.log('[charts] Available exports:', Object.keys(LightweightCharts));

    // Always recreate chart to avoid state issues
    if (tvChart) {
        console.log('[charts] Removing existing chart');
        // Cleanup label event listeners
        if (container._cleanupLabels) {
            container._cleanupLabels();
            container._cleanupLabels = null;
        }
        tvChart.remove();
        tvChart = null;
        tvSeries = null;
    }

    console.log('[charts] Creating new chart');
    try {
        tvChart = LightweightCharts.createChart(container, {
            width: container.clientWidth,
            height: 500,
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
                mode: 1, // Normal crosshair mode
                vertLine: { color: '#00ff88', width: 1, style: 2 },
                horzLine: { color: '#00ff88', width: 1, style: 2 }
            },
            handleScroll: true,
            handleScale: true
        });
        
        console.log('[charts] Chart object created:', tvChart);
        console.log('[charts] Available methods on chart:', Object.getOwnPropertyNames(tvChart));
        
        // Use candlestick series for professional trading visualization
        if (typeof tvChart.addCandlestickSeries === 'function') {
            console.log('[charts] Using addCandlestickSeries method');
            tvSeries = tvChart.addCandlestickSeries({
                upColor: '#00ff88',
                downColor: '#ff4757',
                borderUpColor: '#00ff88',
                borderDownColor: '#ff4757',
                wickUpColor: '#00ff88',
                wickDownColor: '#ff4757',
                borderVisible: true,
                wickVisible: true,
                priceLineVisible: true,
                lastValueVisible: true
            });
        } else if (typeof tvChart.addSeries === 'function') {
            console.log('[charts] Using addSeries method with CandlestickSeries');
            tvSeries = tvChart.addSeries(LightweightCharts.CandlestickSeries, {
                upColor: '#00ff88',
                downColor: '#ff4757'
            });
        } else {
            console.error('[charts] No suitable method found for adding candlestick series');
            console.log('[charts] LightweightCharts object:', LightweightCharts);
            return;
        }
        
        console.log('[charts] Series created:', tvSeries);
        console.log('[charts] Series type:', typeof tvSeries);
        if (!tvSeries) {
            console.error('[charts] Failed to create candlestick series');
            return;
        }
        console.log('[charts] Chart and series created successfully');
    } catch (err) {
        console.error('[charts] Error creating chart:', err);
        return;
    }

    // Map data to OHLC format for candlesticks
    const candleData = data.map(d => ({
        time: Math.floor(d.timestamp / 1000),
        open: d.open ?? d.price,
        high: d.high ?? d.price * 1.005, // Add small variation for better visualization
        low: d.low ?? d.price * 0.995,
        close: d.price,
        digitalRoot: d.digitalRoot,
        date: d.date
    })).filter(d => d.time && d.close && !isNaN(d.close));

    console.log('[charts] setting candle data', candleData.length);
    console.log('[charts] sample candle data:', candleData.slice(0, 3));
    
    if (candleData.length === 0) {
        console.error('[charts] No valid candle data to display');
        return;
    }
    
    if (!tvSeries) {
        console.error('[charts] Series not available for setting data');
        return;
    }
    
    try {
        tvSeries.setData(candleData);
        console.log('[charts] Chart data set successfully');
    } catch (err) {
        console.error('[charts] Error setting chart data:', err);
        console.error('[charts] tvSeries state:', tvSeries);
        return;
    }

    // Draw digital root labels above each candle
    drawVortexLabels(container, tvChart, candleData);
    
    // Add trade signals if available
    addTradeSignals(tvChart, tvSeries, candleData);
}

function addTradeSignals(chart, series, dataPoints) {
    try {
        // Create trade signals based on vortex math rules
        const buySignal = 1;  // Digital root 1 = cycle start
        const sellSignal = 5; // Digital root 5 = cycle peak
        const holdSignal = 9; // Digital root 9 = balance
        
        const markers = [];
        
        dataPoints.forEach(point => {
            if (point.digitalRoot === buySignal) {
                markers.push({
                    time: point.time,
                    position: 'belowBar',
                    color: '#28a745',
                    shape: 'arrowUp',
                    text: 'BUY'
                });
            } else if (point.digitalRoot === sellSignal) {
                markers.push({
                    time: point.time,
                    position: 'aboveBar',
                    color: '#dc3545',
                    shape: 'arrowDown',
                    text: 'SELL'
                });
            } else if (point.digitalRoot === holdSignal) {
                markers.push({
                    time: point.time,
                    position: 'inBar',
                    color: '#ffc107',
                    shape: 'circle',
                    text: 'HOLD'
                });
            }
        });
        
        if (markers.length > 0) {
            // Sample markers to avoid overcrowding (every 10th signal)
            const sampledMarkers = markers.filter((_, index) => index % 10 === 0);
            series.setMarkers(sampledMarkers);
            console.log(`[charts] Added ${sampledMarkers.length} trade signal markers`);
        }
    } catch (err) {
        console.error('[charts] Error adding trade signals:', err);
    }
}

function drawVortexLabels(container, chart, dataPoints) {
    // Remove old labels if any
    const old = container.querySelectorAll('.vortex-label');
    old.forEach(el => el.remove());

    const timeScale = chart.timeScale();
    
    try {
        // Get the candlestick series from chart
        const series = tvSeries;
        if (!series) {
            console.error('[charts] No series available for coordinate conversion');
            return;
        }

        const updateLabels = () => {
            // Clear existing labels
            const existingLabels = container.querySelectorAll('.vortex-label');
            existingLabels.forEach(el => el.remove());

            const coordinateToScreen = (time, price) => {
                try {
                    const x = timeScale.timeToCoordinate(time);
                    const y = series.priceToCoordinate(price);
                    return { x, y };
                } catch (err) {
                    console.warn('[charts] Coordinate conversion failed:', err);
                    return { x: null, y: null };
                }
            };

            // Only show buy (1) and sell (5) signals for cleaner visualization
            const buySignals = dataPoints.filter(point => point.digitalRoot === 1);
            const sellSignals = dataPoints.filter(point => point.digitalRoot === 5);
            
            // Draw buy signals (1) as green circles with numbers
            buySignals.forEach(point => {
                const { x, y } = coordinateToScreen(point.time, point.high || point.close);
                if (x == null || y == null) return;

                const label = document.createElement('div');
                label.className = 'vortex-label buy-signal';
                label.textContent = '1';
                label.style.position = 'absolute';
                label.style.left = `${Math.round(x)}px`;
                label.style.top = `${Math.round(y - 35)}px`;
                label.style.transform = 'translate(-50%, -100%)';
                label.style.padding = '4px 8px';
                label.style.fontSize = '12px';
                label.style.fontWeight = 'bold';
                label.style.borderRadius = '50%'; // Make it circular
                label.style.pointerEvents = 'none';
                label.style.background = '#00ff88';
                label.style.color = '#000';
                label.style.border = '2px solid #00cc6a';
                label.style.boxShadow = '0 2px 6px rgba(0, 255, 136, 0.5)';
                label.style.zIndex = '1000';
                label.style.minWidth = '20px';
                label.style.height = '20px';
                label.style.display = 'flex';
                label.style.alignItems = 'center';
                label.style.justifyContent = 'center';
                label.style.textAlign = 'center';

                container.appendChild(label);
            });

            // Draw sell signals (5) as red circles with numbers
            sellSignals.forEach(point => {
                const { x, y } = coordinateToScreen(point.time, point.high || point.close);
                if (x == null || y == null) return;

                const label = document.createElement('div');
                label.className = 'vortex-label sell-signal';
                label.textContent = '5';
                label.style.position = 'absolute';
                label.style.left = `${Math.round(x)}px`;
                label.style.top = `${Math.round(y - 35)}px`;
                label.style.transform = 'translate(-50%, -100%)';
                label.style.padding = '4px 8px';
                label.style.fontSize = '12px';
                label.style.fontWeight = 'bold';
                label.style.borderRadius = '50%'; // Make it circular
                label.style.pointerEvents = 'none';
                label.style.background = '#ff4757';
                label.style.color = '#fff';
                label.style.border = '2px solid #ff3742';
                label.style.boxShadow = '0 2px 6px rgba(255, 71, 87, 0.5)';
                label.style.zIndex = '1000';
                label.style.minWidth = '20px';
                label.style.height = '20px';
                label.style.display = 'flex';
                label.style.alignItems = 'center';
                label.style.justifyContent = 'center';
                label.style.textAlign = 'center';

                container.appendChild(label);
            });
            
            console.log(`[charts] Drew ${buySignals.length} buy signals and ${sellSignals.length} sell signals`);
        };

        // Initial label drawing
        updateLabels();

        // Add event listeners to redraw labels on zoom/pan
        const debouncedUpdate = debounce(updateLabels, 100);
        timeScale.subscribeVisibleLogicalRangeChange(debouncedUpdate);
        
        // Store cleanup function for later use
        container._cleanupLabels = () => {
            timeScale.unsubscribeVisibleLogicalRangeChange(debouncedUpdate);
        };
        
    } catch (err) {
        console.error('[charts] Error in drawVortexLabels:', err);
    }
}

// Debounce function to limit label updates during zoom/pan
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Expose API to window
if (typeof window !== 'undefined') {
    window.renderPriceChartWithVortex = renderPriceChartWithVortex;
}


