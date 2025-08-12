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
        
        // Use line series for better backtesting visualization
        if (typeof tvChart.addLineSeries === 'function') {
            console.log('[charts] Using addLineSeries method');
            tvSeries = tvChart.addLineSeries({
                color: '#2962FF',
                lineWidth: 2,
                crosshairMarkerVisible: true,
                crosshairMarkerRadius: 6,
                priceLineVisible: true,
                lastValueVisible: true
            });
        } else if (typeof tvChart.addSeries === 'function') {
            console.log('[charts] Using addSeries method with LineSeries');
            tvSeries = tvChart.addSeries(LightweightCharts.LineSeries, {
                color: '#2962FF',
                lineWidth: 2
            });
        } else {
            console.error('[charts] No suitable method found for adding line series');
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

    // Map data to line chart format (time/value)
    const lineData = data.map(d => ({
        time: Math.floor(d.timestamp / 1000),
        value: d.price,
        digitalRoot: d.digitalRoot,
        date: d.date
    })).filter(d => d.time && d.value && !isNaN(d.value));

    console.log('[charts] setting line data', lineData.length);
    console.log('[charts] sample line data:', lineData.slice(0, 3));
    
    if (lineData.length === 0) {
        console.error('[charts] No valid line data to display');
        return;
    }
    
    if (!tvSeries) {
        console.error('[charts] Series not available for setting data');
        return;
    }
    
    try {
        tvSeries.setData(lineData);
        console.log('[charts] Chart data set successfully');
    } catch (err) {
        console.error('[charts] Error setting chart data:', err);
        console.error('[charts] tvSeries state:', tvSeries);
        return;
    }

    // Draw digital root labels above each price point
    drawVortexLabels(container, tvChart, lineData);
    
    // Add trade signals if available
    addTradeSignals(tvChart, tvSeries, lineData);
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
        // Get the line series from chart
        const series = tvSeries;
        if (!series) {
            console.error('[charts] No series available for coordinate conversion');
            return;
        }

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

        // Sample data points to avoid overcrowding (show every 5th point)
        const sampledData = dataPoints.filter((_, index) => index % 5 === 0);
        
        sampledData.forEach(point => {
            const { x, y } = coordinateToScreen(point.time, point.value);
            if (x == null || y == null) return;

            const label = document.createElement('div');
            label.className = 'vortex-label';
            label.textContent = String(point.digitalRoot ?? '');
            label.style.position = 'absolute';
            label.style.left = `${Math.round(x)}px`;
            label.style.top = `${Math.round(y - 30)}px`;
            label.style.transform = 'translate(-50%, -100%)';
            label.style.padding = '4px 6px';
            label.style.fontSize = '12px';
            label.style.fontWeight = 'bold';
            label.style.borderRadius = '4px';
            label.style.pointerEvents = 'none';
            label.style.background = '#ffffff';
            label.style.color = '#333';
            label.style.border = '2px solid #333';
            label.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            label.style.zIndex = '1000';

            // Color-code by vortex significance
            if (point.digitalRoot === 1) {
                label.style.background = '#28a745'; // Green for cycle start
                label.style.color = '#fff';
                label.style.borderColor = '#28a745';
            } else if (point.digitalRoot === 5) {
                label.style.background = '#dc3545'; // Red for cycle peak
                label.style.color = '#fff';
                label.style.borderColor = '#dc3545';
            } else if (point.digitalRoot === 9) {
                label.style.background = '#ffc107'; // Yellow for balance
                label.style.color = '#333';
                label.style.borderColor = '#ffc107';
            } else if (point.digitalRoot === 3 || point.digitalRoot === 6) {
                label.style.background = '#6f42c1'; // Purple for Tesla numbers
                label.style.color = '#fff';
                label.style.borderColor = '#6f42c1';
            }

            container.appendChild(label);
        });
        
        console.log(`[charts] Drew ${sampledData.length} vortex labels`);
    } catch (err) {
        console.error('[charts] Error in drawVortexLabels:', err);
    }
}

// Expose API to window
if (typeof window !== 'undefined') {
    window.renderPriceChartWithVortex = renderPriceChartWithVortex;
}


