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
                background: { type: 'solid', color: '#fafafa' },
                textColor: '#333',
                fontSize: 12,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            },
            grid: {
                vertLines: { color: '#e0e0e0', style: 1 },
                horzLines: { color: '#e0e0e0', style: 1 }
            },
            rightPriceScale: {
                borderVisible: true,
                borderColor: '#cccccc',
                textColor: '#333'
            },
            timeScale: {
                borderVisible: true,
                borderColor: '#cccccc',
                textColor: '#333',
                timeVisible: true,
                secondsVisible: false
            },
            crosshair: {
                mode: 1, // Normal crosshair mode
                vertLine: { color: '#9B7DFF', width: 1, style: 3 },
                horzLine: { color: '#9B7DFF', width: 1, style: 3 }
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
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderUpColor: '#26a69a',
                borderDownColor: '#ef5350',
                wickUpColor: '#26a69a',
                wickDownColor: '#ef5350',
                borderVisible: true,
                wickVisible: true,
                priceLineVisible: true,
                lastValueVisible: true
            });
        } else if (typeof tvChart.addSeries === 'function') {
            console.log('[charts] Using addSeries method with CandlestickSeries');
            tvSeries = tvChart.addSeries(LightweightCharts.CandlestickSeries, {
                upColor: '#26a69a',
                downColor: '#ef5350'
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

            // Sample data points more intelligently based on zoom level
            const visibleRange = timeScale.getVisibleLogicalRange();
            const totalPoints = dataPoints.length;
            const visiblePoints = visibleRange ? (visibleRange.to - visibleRange.from) : totalPoints;
            const sampleRate = Math.max(1, Math.floor(visiblePoints / 20)); // Show max 20 labels
            
            const sampledData = dataPoints.filter((_, index) => index % sampleRate === 0);
            
            sampledData.forEach(point => {
                const { x, y } = coordinateToScreen(point.time, point.high || point.close);
                if (x == null || y == null) return;

                const label = document.createElement('div');
                label.className = 'vortex-label';
                label.textContent = String(point.digitalRoot ?? '');
                label.style.position = 'absolute';
                label.style.left = `${Math.round(x)}px`;
                label.style.top = `${Math.round(y - 35)}px`; // Position above candle
                label.style.transform = 'translate(-50%, -100%)';
                label.style.padding = '3px 6px';
                label.style.fontSize = '11px';
                label.style.fontWeight = 'bold';
                label.style.borderRadius = '3px';
                label.style.pointerEvents = 'none';
                label.style.background = '#ffffff';
                label.style.color = '#333';
                label.style.border = '1px solid #333';
                label.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
                label.style.zIndex = '1000';
                label.style.minWidth = '16px';
                label.style.textAlign = 'center';

                // Color-code by vortex significance with cleaner design
                if (point.digitalRoot === 1) {
                    label.style.background = '#28a745'; // Green for cycle start
                    label.style.color = '#fff';
                    label.style.borderColor = '#1e7e34';
                } else if (point.digitalRoot === 5) {
                    label.style.background = '#dc3545'; // Red for cycle peak
                    label.style.color = '#fff';
                    label.style.borderColor = '#c82333';
                } else if (point.digitalRoot === 9) {
                    label.style.background = '#ffc107'; // Yellow for balance
                    label.style.color = '#212529';
                    label.style.borderColor = '#e0a800';
                } else if (point.digitalRoot === 3 || point.digitalRoot === 6) {
                    label.style.background = '#6f42c1'; // Purple for Tesla numbers
                    label.style.color = '#fff';
                    label.style.borderColor = '#59359a';
                } else {
                    // Default styling for other numbers
                    label.style.background = '#f8f9fa';
                    label.style.color = '#495057';
                    label.style.borderColor = '#dee2e6';
                }

                container.appendChild(label);
            });
            
            console.log(`[charts] Drew ${sampledData.length} vortex labels (sample rate: ${sampleRate})`);
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


