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
            height: 500
        });
        
        console.log('[charts] Chart object created:', tvChart);
        console.log('[charts] Available methods on chart:', Object.getOwnPropertyNames(tvChart));
        
        // Try different API approaches for adding candlestick series
        if (typeof tvChart.addCandlestickSeries === 'function') {
            console.log('[charts] Using addCandlestickSeries method');
            tvSeries = tvChart.addCandlestickSeries();
        } else if (typeof tvChart.addSeries === 'function') {
            console.log('[charts] Using addSeries method with CandlestickSeries');
            tvSeries = tvChart.addSeries(LightweightCharts.CandlestickSeries);
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

    // Map data to OHLC if available; else derive from close
    const candles = data.map(d => ({
        time: Math.floor(d.timestamp / 1000),
        open: d.open ?? d.price,
        high: d.high ?? d.price,
        low: d.low ?? d.price,
        close: d.price,
        digitalRoot: d.digitalRoot,
        date: d.date
    })).filter(d => d.time && d.close && !isNaN(d.close));

    console.log('[charts] setting candles', candles.length);
    console.log('[charts] sample candle data:', candles.slice(0, 3));
    
    if (candles.length === 0) {
        console.error('[charts] No valid candle data to display');
        return;
    }
    
    if (!tvSeries) {
        console.error('[charts] Series not available for setting data');
        return;
    }
    
    try {
        tvSeries.setData(candles);
        console.log('[charts] Chart data set successfully');
    } catch (err) {
        console.error('[charts] Error setting chart data:', err);
        console.error('[charts] tvSeries state:', tvSeries);
        return;
    }

    // Draw digital root labels above each close
    drawVortexLabels(container, tvChart, candles);
}

function drawVortexLabels(container, chart, candles) {
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

        candles.forEach(c => {
            const { x, y } = coordinateToScreen(c.time, c.close);
            if (x == null || y == null) return;

            const label = document.createElement('div');
            label.className = 'vortex-label';
            label.textContent = String(c.digitalRoot ?? '');
            label.style.position = 'absolute';
            label.style.left = `${Math.round(x)}px`;
            label.style.top = `${Math.round(y - 22)}px`;
            label.style.transform = 'translate(-50%, -100%)';
            label.style.padding = '2px 4px';
            label.style.fontSize = '10px';
            label.style.borderRadius = '3px';
            label.style.pointerEvents = 'none';
            label.style.background = '#ffffffcc';
            label.style.color = '#111';
            label.style.border = '1px solid #ddd';

            // Color hint by vortex roles
            if (c.digitalRoot === 1) label.style.background = '#d4edda';
            if (c.digitalRoot === 5) label.style.background = '#f8d7da';
            if (c.digitalRoot === 9) label.style.background = '#fff3cd';
            if (c.digitalRoot === 3 || c.digitalRoot === 6) label.style.background = '#e2e3ff';

            container.appendChild(label);
        });
    } catch (err) {
        console.error('[charts] Error in drawVortexLabels:', err);
    }
}

// Expose API to window
if (typeof window !== 'undefined') {
    window.renderPriceChartWithVortex = renderPriceChartWithVortex;
}


