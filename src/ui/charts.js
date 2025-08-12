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
            width: container.clientWidth || 800,
            height: container.clientHeight || 400,
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
                mode: LightweightCharts.CrosshairMode.Normal,
                vertLine: { color: '#00ff88', width: 1, style: LightweightCharts.LineStyle.Dashed },
                horzLine: { color: '#00ff88', width: 1, style: LightweightCharts.LineStyle.Dashed }
            },
            handleScroll: true,
            handleScale: true
        });
        
        console.log('[charts] Chart object created:', tvChart);
        console.log('[charts] Available methods on chart:', Object.getOwnPropertyNames(tvChart));
        
        // Create series - try multiple approaches for maximum compatibility
        console.log('[charts] Creating series...');
        console.log('[charts] Chart methods available:', Object.getOwnPropertyNames(tvChart));
        
        try {
            // TradingView Lightweight Charts v5 API - use addSeries with series type
            console.log('[charts] Creating line series using v5 API');
            
            tvSeries = tvChart.addSeries(LightweightCharts.LineSeries, {
                color: '#00ff88',
                lineWidth: 3,
                lineStyle: LightweightCharts.LineStyle.Solid,
                lineType: LightweightCharts.LineType.Simple,
                priceLineVisible: true,
                lastValueVisible: true
            });
            
            console.log('[charts] Line series created successfully');
            
        } catch (lineError) {
            console.error('[charts] Line series failed, trying area series:', lineError);
            
            try {
                // Fallback to area series using v5 API
                tvSeries = tvChart.addSeries(LightweightCharts.AreaSeries, {
                    lineColor: '#00ff88',
                    topColor: 'rgba(0, 255, 136, 0.4)',
                    bottomColor: 'rgba(0, 255, 136, 0.0)',
                    lineWidth: 3,
                    priceLineVisible: true,
                    lastValueVisible: true
                });
                
                console.log('[charts] Area series created as fallback');
                
            } catch (areaError) {
                console.error('[charts] Area series also failed, trying candlestick:', areaError);
                
                try {
                    // Last fallback to candlestick using v5 API
                    tvSeries = tvChart.addSeries(LightweightCharts.CandlestickSeries, {
                        upColor: '#00ff88',
                        downColor: '#ff4757'
                    });
                    
                    console.log('[charts] Candlestick series created as final fallback');
                    
                } catch (candlestickError) {
                    console.error('[charts] All series types failed:', candlestickError);
                    
                    // Ultimate fallback - try basic series creation
                    try {
                        console.log('[charts] Trying basic line series creation without options');
                        tvSeries = tvChart.addSeries(LightweightCharts.LineSeries);
                        if (tvSeries) {
                            console.log('[charts] Basic line series created successfully');
                        }
                    } catch (basicError) {
                        console.error('[charts] Even basic series creation failed:', basicError);
                        return;
                    }
                }
            }
        }
        
        console.log('[charts] Series created:', tvSeries);
        console.log('[charts] Series type:', typeof tvSeries);
        if (!tvSeries) {
            console.error('[charts] Failed to create line series');
            return;
        }
        console.log('[charts] Chart and series created successfully');
    } catch (err) {
        console.error('[charts] Error creating chart:', err);
        return;
    }

    // Map data to format compatible with different series types
    const chartData = data.map(d => ({
        time: Math.floor(d.timestamp / 1000),
        value: d.price,
        digitalRoot: d.digitalRoot,
        date: d.date
    })).filter(d => d.time && d.value && !isNaN(d.value));

    console.log('[charts] setting chart data', chartData.length);
    console.log('[charts] sample chart data:', chartData.slice(0, 3));
    
    if (chartData.length === 0) {
        console.error('[charts] No valid chart data to display');
        return;
    }
    
    if (!tvSeries) {
        console.error('[charts] Series not available for setting data');
        return;
    }
    
            try {
            tvSeries.setData(chartData);
            console.log('[charts] Chart data set successfully');
            console.log('[charts] Chart data range - first:', chartData[0]);
            console.log('[charts] Chart data range - last:', chartData[chartData.length - 1]);
            
            // Fit the chart to the data range
            tvChart.timeScale().fitContent();
            
        } catch (err) {
            console.error('[charts] Error setting chart data:', err);
            console.error('[charts] tvSeries state:', tvSeries);
            console.error('[charts] Data sample:', chartData.slice(0, 3));
            return;
        }

    // Draw digital root labels above each data point
    drawVortexLabels(container, tvChart, chartData);
    
    // Add trade signals if available
    addTradeSignals(tvChart, tvSeries, chartData);
    
    // Handle window resize for responsiveness
    const handleResize = () => {
        if (tvChart) {
            tvChart.applyOptions({
                width: container.clientWidth,
                height: container.clientHeight || 500
            });
        }
    };
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Store cleanup function for resize listener
    const existingCleanup = container._cleanupLabels;
    container._cleanupLabels = () => {
        if (existingCleanup) existingCleanup();
        window.removeEventListener('resize', handleResize);
    };
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
                    console.log(`[charts] Coordinate conversion: time=${time}, price=${price}, x=${x}, y=${y}`);
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
                const { x, y } = coordinateToScreen(point.time, point.value);
                if (x == null || y == null || x < 0 || y < 0) return;

                // Get container position for proper relative positioning
                const containerRect = container.getBoundingClientRect();

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
                label.style.borderRadius = '50%';
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
                const { x, y } = coordinateToScreen(point.time, point.value);
                if (x == null || y == null || x < 0 || y < 0) return;

                // Get container position for proper relative positioning
                const containerRect = container.getBoundingClientRect();

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
                label.style.borderRadius = '50%';
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


