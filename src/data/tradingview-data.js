/**
 * TradingView Data Formatter
 * Converts BTC historical data to TradingView Lightweight Charts format
 * and adds vortex math overlays
 */

// Support both Node.js and browser environments
const VM = (typeof module !== 'undefined' && module.exports)
    ? require('../core/vortex-math.js')
    : (typeof window !== 'undefined' ? window.VortexMath : null);

class TradingViewDataFormatter {
    
    /**
     * Convert historical price data to TradingView candlestick format
     * @param {Array} priceData - Array of [timestamp, price] from CoinGecko
     * @returns {Object} Formatted data for TradingView
     */
    static formatForTradingView(priceData) {
        if (!Array.isArray(priceData) || priceData.length === 0) {
            throw new Error('Invalid price data provided');
        }

        const candlestickData = [];
        const vortexOverlayData = [];
        
        // Since we have daily close prices, we'll create simple candlesticks
        // with close = high = low = open for daily data
        priceData.forEach(([timestamp, price], index) => {
            const time = Math.floor(timestamp / 1000); // Convert to seconds for TradingView
            
            // Calculate digital root for vortex math
            const digitalRoot = VM ? VM.digitalRoot(Math.round(price)) : Math.round(price) % 9 || 9;
            
            // Create candlestick data point
            const candlestick = {
                time: time,
                open: price,
                high: price,
                low: price,
                close: price
            };
            
            // Create vortex overlay data point
            const vortexPoint = {
                time: time,
                value: digitalRoot,
                color: this.getVortexColor(digitalRoot),
                text: digitalRoot.toString()
            };
            
            candlestickData.push(candlestick);
            vortexOverlayData.push(vortexPoint);
        });

        return {
            candlestickData,
            vortexOverlayData,
            metadata: {
                symbol: 'BTC/USD',
                timeframe: 'D',
                totalPoints: candlestickData.length,
                dateRange: {
                    start: new Date(priceData[0][0]).toISOString(),
                    end: new Date(priceData[priceData.length - 1][0]).toISOString()
                }
            }
        };
    }

    /**
     * Create OHLC data from single price points (for better visualization)
     * @param {Array} priceData - Array of [timestamp, price]
     * @param {number} volatilityFactor - Factor to create artificial OHLC spread
     * @returns {Array} OHLC formatted data
     */
    static createOHLCFromPrices(priceData, volatilityFactor = 0.02) {
        return priceData.map(([timestamp, price], index) => {
            const time = Math.floor(timestamp / 1000);
            
            // Create artificial OHLC based on price with small volatility
            const spread = price * volatilityFactor;
            const variation = Math.random() - 0.5; // -0.5 to 0.5
            
            // Calculate previous price for trend direction
            const prevPrice = index > 0 ? priceData[index - 1][1] : price;
            const isUpTrend = price >= prevPrice;
            
            const open = prevPrice;
            const close = price;
            const high = Math.max(open, close) + Math.abs(variation * spread);
            const low = Math.min(open, close) - Math.abs(variation * spread);

            return {
                time: time,
                open: parseFloat(open.toFixed(2)),
                high: parseFloat(high.toFixed(2)),
                low: parseFloat(low.toFixed(2)),
                close: parseFloat(close.toFixed(2))
            };
        });
    }

    /**
     * Get color for vortex number based on its significance
     * @param {number} digitalRoot - Digital root (1-9)
     * @returns {string} Color code
     */
    static getVortexColor(digitalRoot) {
        const colors = {
            1: '#00FF00', // Green - Start of cycle
            2: '#32CD32', // Lime green
            3: '#FFD700', // Gold - Tesla number
            4: '#FFA500', // Orange
            5: '#FF4500', // Red orange - End of cycle
            6: '#FF69B4', // Hot pink - Tesla number
            7: '#8A2BE2', // Blue violet
            8: '#4169E1', // Royal blue
            9: '#FF0000'  // Red - Tesla number, balance point
        };
        return colors[digitalRoot] || '#FFFFFF';
    }

    /**
     * Create vortex math markers for chart
     * @param {Array} vortexData - Vortex overlay data points
     * @returns {Array} Marker data for TradingView
     */
    static createVortexMarkers(vortexData) {
        return vortexData.map(point => ({
            time: point.time,
            position: 'aboveBar',
            color: point.color,
            shape: 'circle',
            text: point.text,
            size: 1
        }));
    }

    /**
     * Create buy/sell signal markers based on vortex strategy
     * @param {Array} candlestickData - Candlestick data
     * @param {number} buySignal - Digital root for buy signal (default: 1)
     * @param {number} sellSignal - Digital root for sell signal (default: 5)
     * @returns {Array} Signal markers
     */
    static createSignalMarkers(candlestickData, buySignal = 1, sellSignal = 5) {
        const markers = [];
        
        candlestickData.forEach(candle => {
            const digitalRoot = VM ? VM.digitalRoot(Math.round(candle.close)) : Math.round(candle.close) % 9 || 9;
            
            if (digitalRoot === buySignal) {
                markers.push({
                    time: candle.time,
                    position: 'belowBar',
                    color: '#00FF00',
                    shape: 'arrowUp',
                    text: `BUY (${digitalRoot})`,
                    size: 2
                });
            } else if (digitalRoot === sellSignal) {
                markers.push({
                    time: candle.time,
                    position: 'aboveBar',
                    color: '#FF0000',
                    shape: 'arrowDown',
                    text: `SELL (${digitalRoot})`,
                    size: 2
                });
            }
        });
        
        return markers;
    }

    /**
     * Create a line series for vortex numbers
     * @param {Array} vortexData - Vortex overlay data
     * @returns {Array} Line series data
     */
    static createVortexLineSeries(vortexData) {
        return vortexData.map(point => ({
            time: point.time,
            value: point.value
        }));
    }

    /**
     * Generate statistics for TradingView display
     * @param {Array} candlestickData - Candlestick data
     * @param {Array} vortexData - Vortex data
     * @returns {Object} Statistics object
     */
    static generateStatistics(candlestickData, vortexData) {
        const prices = candlestickData.map(c => c.close);
        const digitalRoots = vortexData.map(v => v.value);
        
        // Price statistics
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const totalReturn = ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100;
        
        // Digital root frequency
        const rootFrequency = {};
        for (let i = 1; i <= 9; i++) {
            rootFrequency[i] = digitalRoots.filter(root => root === i).length;
        }
        
        // Tesla numbers (3, 6, 9) frequency
        const teslaCount = digitalRoots.filter(root => [3, 6, 9].includes(root)).length;
        const doublingSeqCount = digitalRoots.filter(root => [1, 2, 4, 8, 7, 5].includes(root)).length;
        
        return {
            priceStats: {
                min: minPrice.toFixed(2),
                max: maxPrice.toFixed(2),
                average: avgPrice.toFixed(2),
                totalReturn: totalReturn.toFixed(2) + '%',
                totalPeriod: candlestickData.length + ' days'
            },
            vortexStats: {
                digitalRootDistribution: rootFrequency,
                teslaNumbersPercent: ((teslaCount / digitalRoots.length) * 100).toFixed(1) + '%',
                doublingSequencePercent: ((doublingSeqCount / digitalRoots.length) * 100).toFixed(1) + '%'
            }
        };
    }
}

// UMD export: Node.js (CommonJS) and browser global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TradingViewDataFormatter;
} else if (typeof window !== 'undefined') {
    window.TradingViewDataFormatter = TradingViewDataFormatter;
}
