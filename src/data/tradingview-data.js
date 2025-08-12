/**
 * TradingView Chart Integration for Vortex Math Trading System
 */

class TradingViewChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.chart = null;
        this.candlestickSeries = null;
        this.vortexSeries = null;
        this.signalMarkers = [];
    }

    async init() {
        if (typeof LightweightCharts === 'undefined') {
            throw new Error('TradingView Lightweight Charts library not loaded');
        }

        const container = document.getElementById(this.containerId);
        if (!container) {
            throw new Error(`Container with id '${this.containerId}' not found`);
        }

        this.chart = LightweightCharts.createChart(container, {
            width: container.clientWidth,
            height: 400,
            layout: {
                backgroundColor: '#ffffff',
                textColor: '#333',
            },
            grid: {
                vertLines: { color: '#f0f0f0' },
                horzLines: { color: '#f0f0f0' },
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

        this.candlestickSeries = this.chart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });

        this.setupResponsiveChart();
        return this.chart;
    }

    setupResponsiveChart() {
        const resizeObserver = new ResizeObserver(entries => {
            if (this.chart && entries.length > 0) {
                const { width } = entries[0].contentRect;
                this.chart.applyOptions({ width: Math.max(width, 300) });
            }
        });

        const container = document.getElementById(this.containerId);
        if (container) {
            resizeObserver.observe(container);
        }
    }

    calculateVortexMath(price) {
        const priceInt = Math.floor(price * 100);
        
        let sumOfDigits = 0;
        let temp = priceInt;
        while (temp > 0) {
            sumOfDigits += temp % 10;
            temp = Math.floor(temp / 10);
        }

        let digitalRoot = sumOfDigits;
        while (digitalRoot >= 10) {
            let newSum = 0;
            while (digitalRoot > 0) {
                newSum += digitalRoot % 10;
                digitalRoot = Math.floor(digitalRoot / 10);
            }
            digitalRoot = newSum;
        }

        if (digitalRoot === 0) digitalRoot = 9;

        const doublingSequence = [1, 2, 4, 8, 7, 5];
        const isDoublingSequence = doublingSequence.includes(digitalRoot);

        const teslaNumbers = [3, 6, 9];
        const isTeslaNumber = teslaNumbers.includes(digitalRoot);

        return {
            digitalRoot,
            sumOfDigits,
            isDoublingSequence,
            isTeslaNumber
        };
    }

    generateMockData(startDate = '2020-01-01', endDate = '2023-12-31', initialPrice = 7000) {
        const data = [];
        const vortexData = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        let currentPrice = initialPrice;
        let currentDate = new Date(start);

        while (currentDate <= end) {
            const volatility = 0.02 + Math.random() * 0.03;
            const direction = Math.random() > 0.5 ? 1 : -1;
            const change = currentPrice * volatility * direction * (0.5 + Math.random() * 0.5);
            
            const open = currentPrice;
            const close = Math.max(1000, currentPrice + change);
            const high = Math.max(open, close) * (1 + Math.random() * 0.02);
            const low = Math.min(open, close) * (1 - Math.random() * 0.02);

            const vortexMath = this.calculateVortexMath(close);
            const timestamp = Math.floor(currentDate.getTime() / 1000);
            
            data.push({
                time: timestamp,
                open: Math.round(open * 100) / 100,
                high: Math.round(high * 100) / 100,
                low: Math.round(low * 100) / 100,
                close: Math.round(close * 100) / 100,
                vortexRoot: vortexMath.digitalRoot
            });

            vortexData.push({
                time: timestamp,
                value: vortexMath.digitalRoot,
                price: close,
                digitalRoot: vortexMath.digitalRoot,
                isDoublingSequence: vortexMath.isDoublingSequence,
                isTeslaNumber: vortexMath.isTeslaNumber
            });

            currentPrice = close;
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return { candleData: data, vortexData: vortexData };
    }

    async loadDataAndDisplay(config = {}) {
        if (!this.chart) {
            await this.init();
        }

        const {
            startDate = '2020-01-01',
            endDate = '2023-12-31',
            buySignal = 1,
            sellSignal = 5
        } = config;

        const { candleData, vortexData } = this.generateMockData(startDate, endDate);
        
        this.candlestickSeries.setData(candleData);
        this.addVortexOverlay(vortexData, buySignal, sellSignal);
        this.chart.timeScale().fitContent();

        return { candleData, vortexData };
    }

    addVortexOverlay(vortexData, buySignal, sellSignal) {
        const markers = [];
        
        vortexData.forEach(point => {
            const { time, digitalRoot } = point;
            
            if (digitalRoot === buySignal) {
                markers.push({
                    time: time,
                    position: 'belowBar',
                    color: '#2196F3',
                    shape: 'arrowUp',
                    text: `BUY (${digitalRoot})`
                });
            } else if (digitalRoot === sellSignal) {
                markers.push({
                    time: time,
                    position: 'aboveBar',
                    color: '#e91e63',
                    shape: 'arrowDown',
                    text: `SELL (${digitalRoot})`
                });
            }
        });

        this.candlestickSeries.setMarkers(markers);

        const digitalRootSeries = this.chart.addLineSeries({
            color: '#ff6b35',
            lineWidth: 2,
            title: 'Digital Root',
            priceScaleId: 'left',
        });

        this.chart.priceScale('left').applyOptions({
            position: 'left',
            scaleMargins: { top: 0.1, bottom: 0.1 },
            borderVisible: false,
        });

        const digitalRootLineData = vortexData.map(point => ({
            time: point.time,
            value: point.digitalRoot
        }));

        digitalRootSeries.setData(digitalRootLineData);
        this.vortexSeries = digitalRootSeries;
        this.signalMarkers = markers;
    }

    generateTradingSignals(vortexData, buySignal, sellSignal) {
        const signals = [];
        let position = null;
        let entryPrice = 0;
        let entryDate = null;

        vortexData.forEach(point => {
            const { time, digitalRoot, price } = point;
            const date = new Date(time * 1000).toISOString().split('T')[0];

            if (digitalRoot === buySignal && position !== 'long') {
                if (position === 'short') {
                    const pnl = entryPrice - price;
                    const pnlPercent = (pnl / entryPrice) * 100;
                    signals.push({
                        date: date,
                        action: 'CLOSE_SHORT',
                        price: price,
                        digitalRoot: digitalRoot,
                        pnl: pnl,
                        pnlPercent: pnlPercent
                    });
                }
                
                signals.push({
                    date: date,
                    action: 'BUY',
                    price: price,
                    digitalRoot: digitalRoot,
                    pnl: 0,
                    pnlPercent: 0
                });
                position = 'long';
                entryPrice = price;
                entryDate = date;
                
            } else if (digitalRoot === sellSignal && position !== 'short') {
                if (position === 'long') {
                    const pnl = price - entryPrice;
                    const pnlPercent = (pnl / entryPrice) * 100;
                    signals.push({
                        date: date,
                        action: 'CLOSE_LONG',
                        price: price,
                        digitalRoot: digitalRoot,
                        pnl: pnl,
                        pnlPercent: pnlPercent
                    });
                }
                
                signals.push({
                    date: date,
                    action: 'SELL',
                    price: price,
                    digitalRoot: digitalRoot,
                    pnl: 0,
                    pnlPercent: 0
                });
                position = 'short';
                entryPrice = price;
                entryDate = date;
            }
        });

        return signals;
    }

    destroy() {
        if (this.chart) {
            this.chart.remove();
            this.chart = null;
        }
    }
}

window.TradingViewChart = TradingViewChart;