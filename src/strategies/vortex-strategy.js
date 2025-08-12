/**
 * Vortex Math Trading Strategy Implementation
 * Applies vortex mathematics principles to generate trading signals
 */

// Support both Node.js and browser environments without redeclaring globals
const VM = (typeof module !== 'undefined' && module.exports)
    ? require('../core/vortex-math.js')
    : (typeof window !== 'undefined' ? window.VortexMath : null);

class VortexStrategy {
    
    constructor(config = {}) {
        this.config = {
            // Basic strategy parameters
            buySignal: 1,        // Digital root to trigger buy
            sellSignal: 5,       // Digital root to trigger sell
            holdSignal: 9,       // Digital root to trigger hold (Tesla's balance)
            
            // Advanced parameters
            useTeslaFilter: true,     // Consider 3-6-9 patterns
            useSequenceFilter: true,  // Only trade on doubling sequence
            minimumHoldPeriod: 1,     // Minimum days to hold position
            maxPositionSize: 1.0,     // Maximum position as fraction of capital
            
            // Risk management
            stopLossPercent: 10,      // Stop loss percentage
            takeProfitPercent: 20,    // Take profit percentage
            
            ...config
        };
        
        this.positions = [];
        this.tradeHistory = [];
        this.performance = {
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            totalReturn: 0,
            maxDrawdown: 0,
            sharpeRatio: 0
        };
    }
    
    /**
     * Generate trading signals based on vortex math principles
     * @param {Array} priceData - Array of price data with digital roots
     * @param {number} initialCapital - Starting capital
     * @returns {Object} Trading simulation results
     */
    backtest(priceData, initialCapital = 10000) {
        this.reset();
        
        let capital = initialCapital;
        let position = null;
        let maxCapital = initialCapital;
        
        const results = {
            trades: [],
            dailyPortfolio: [],
            signals: []
        };
        
        for (let i = 0; i < priceData.length; i++) {
            const dataPoint = priceData[i];
            const signal = this.generateSignal(dataPoint, i > 0 ? priceData[i - 1] : null);
            
            results.signals.push({
                date: dataPoint.date,
                price: dataPoint.price,
                digitalRoot: dataPoint.digitalRoot,
                signal: signal.action,
                reasoning: signal.reasoning
            });
            
            // Execute trades based on signals
            if (signal.action === 'BUY' && !position) {
                position = this.openPosition('BUY', dataPoint, capital);
                results.trades.push({
                    type: 'OPEN',
                    action: 'BUY',
                    date: dataPoint.date,
                    price: dataPoint.price,
                    digitalRoot: dataPoint.digitalRoot,
                    reasoning: signal.reasoning,
                    capital: capital
                });
            } else if (signal.action === 'SELL' && position) {
                const trade = this.closePosition(position, dataPoint);
                capital = trade.exitCapital;
                
                results.trades.push({
                    type: 'CLOSE',
                    action: 'SELL',
                    date: dataPoint.date,
                    price: dataPoint.price,
                    digitalRoot: dataPoint.digitalRoot,
                    reasoning: signal.reasoning,
                    entryPrice: position.price,
                    entryDate: position.date,
                    profit: trade.profit,
                    profitPercent: trade.profitPercent,
                    capital: capital
                });
                
                this.tradeHistory.push(trade);
                position = null;
            }
            
            // Track portfolio value
            let portfolioValue = capital;
            if (position) {
                portfolioValue = capital * (dataPoint.price / position.price);
            }
            
            // Update max capital for drawdown calculation
            maxCapital = Math.max(maxCapital, portfolioValue);
            
            results.dailyPortfolio.push({
                date: dataPoint.date,
                price: dataPoint.price,
                digitalRoot: dataPoint.digitalRoot,
                portfolioValue: portfolioValue,
                capital: capital,
                position: position ? 'LONG' : 'CASH',
                drawdown: ((maxCapital - portfolioValue) / maxCapital) * 100
            });
        }
        
        // Close any remaining position
        if (position) {
            const lastDataPoint = priceData[priceData.length - 1];
            const trade = this.closePosition(position, lastDataPoint);
            capital = trade.exitCapital;
            
            results.trades.push({
                type: 'CLOSE',
                action: 'SELL',
                date: lastDataPoint.date,
                price: lastDataPoint.price,
                digitalRoot: lastDataPoint.digitalRoot,
                reasoning: 'End of backtest period',
                entryPrice: position.price,
                entryDate: position.date,
                profit: trade.profit,
                profitPercent: trade.profitPercent,
                capital: capital
            });
            
            this.tradeHistory.push(trade);
        }
        
        // Calculate performance metrics
        this.performance = this.calculatePerformanceMetrics(results, initialCapital, capital);
        
        return {
            ...results,
            performance: this.performance,
            finalCapital: capital,
            totalReturn: ((capital - initialCapital) / initialCapital) * 100
        };
    }
    
    /**
     * Generate trading signal for a given data point
     * @param {Object} currentData - Current price data point
     * @param {Object} previousData - Previous price data point
     * @returns {Object} Signal with action and reasoning
     */
    generateSignal(currentData, previousData) {
        const digitalRoot = currentData.digitalRoot;
        let action = 'HOLD';
        let reasoning = [];
        
        // Check for doubling sequence filter first (acts as exclusion filter)
        if (this.config.useSequenceFilter && !VM.isInDoublingSequence(digitalRoot)) {
            action = 'HOLD';
            reasoning.push(`Digital root ${digitalRoot} not in doubling sequence - no action`);
            return {
                action: action,
                reasoning: reasoning.join('; ') || 'No specific vortex pattern detected'
            };
        }
        
        // Check for Tesla numbers (3, 6, 9) filter
        if (this.config.useTeslaFilter && VM.isTeslaNumber(digitalRoot)) {
            if (digitalRoot === 9) {
                action = 'HOLD';
                reasoning.push('Tesla balance number (9) - maintain position');
            } else if (digitalRoot === 3) {
                action = 'BUY';
                reasoning.push('Tesla positive polarity (3) - upward energy flow');
            } else if (digitalRoot === 6) {
                action = 'SELL';
                reasoning.push('Tesla negative polarity (6) - downward energy flow');
            }
        } else {
            // Basic vortex strategy signals (only if Tesla filter not applied)
            if (digitalRoot === this.config.buySignal) {
                action = 'BUY';
                reasoning.push(`Vortex buy signal (digital root ${this.config.buySignal}) - cycle start`);
            } else if (digitalRoot === this.config.sellSignal) {
                action = 'SELL';
                reasoning.push(`Vortex sell signal (digital root ${this.config.sellSignal}) - cycle peak`);
            } else if (digitalRoot === this.config.holdSignal) {
                action = 'HOLD';
                reasoning.push(`Vortex hold signal (digital root ${this.config.holdSignal}) - equilibrium`);
            }
        }
        
        // Pattern analysis - check for sequence transitions
        if (previousData) {
            const sequence = VM.generateVortexSequence(previousData.digitalRoot, 2, 9, 3);
            if (sequence.length > 1 && sequence[1] === digitalRoot) {
                reasoning.push('Following vortex sequence progression');
            }
        }
        
        return {
            action: action,
            reasoning: reasoning.join('; ') || 'No specific vortex pattern detected'
        };
    }
    
    /**
     * Open a new trading position
     * @param {string} action - 'BUY' or 'SELL'
     * @param {Object} dataPoint - Price data point
     * @param {number} capital - Available capital
     * @returns {Object} Position object
     */
    openPosition(action, dataPoint, capital) {
        return {
            action: action,
            date: dataPoint.date,
            price: dataPoint.price,
            digitalRoot: dataPoint.digitalRoot,
            capital: capital,
            size: this.config.maxPositionSize
        };
    }
    
    /**
     * Close an existing trading position
     * @param {Object} position - Position to close
     * @param {Object} dataPoint - Current price data point
     * @returns {Object} Trade result
     */
    closePosition(position, dataPoint) {
        const profit = (dataPoint.price - position.price) * position.size;
        const profitPercent = ((dataPoint.price - position.price) / position.price) * 100;
        const exitCapital = position.capital * (dataPoint.price / position.price);
        
        return {
            entryDate: position.date,
            exitDate: dataPoint.date,
            entryPrice: position.price,
            exitPrice: dataPoint.price,
            entryDigitalRoot: position.digitalRoot,
            exitDigitalRoot: dataPoint.digitalRoot,
            profit: profit,
            profitPercent: profitPercent,
            exitCapital: exitCapital,
            holdingPeriod: this.calculateHoldingPeriod(position.date, dataPoint.date)
        };
    }
    
    /**
     * Calculate holding period in days
     * @param {string} entryDate - Entry date string
     * @param {string} exitDate - Exit date string
     * @returns {number} Holding period in days
     */
    calculateHoldingPeriod(entryDate, exitDate) {
        const entry = new Date(entryDate);
        const exit = new Date(exitDate);
        return Math.round((exit - entry) / (1000 * 60 * 60 * 24));
    }
    
    /**
     * Calculate comprehensive performance metrics
     * @param {Object} results - Backtest results
     * @param {number} initialCapital - Starting capital
     * @param {number} finalCapital - Ending capital
     * @returns {Object} Performance metrics
     */
    calculatePerformanceMetrics(results, initialCapital, finalCapital) {
        const trades = this.tradeHistory;
        const dailyReturns = results.dailyPortfolio.map((day, i) => {
            if (i === 0) return 0;
            return (day.portfolioValue - results.dailyPortfolio[i - 1].portfolioValue) / results.dailyPortfolio[i - 1].portfolioValue;
        }).slice(1);
        
        // Basic metrics
        const totalReturn = ((finalCapital - initialCapital) / initialCapital) * 100;
        const winningTrades = trades.filter(t => t.profit > 0).length;
        const losingTrades = trades.filter(t => t.profit < 0).length;
        const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;
        
        // Risk metrics
        const maxDrawdown = results.dailyPortfolio.length > 0 ? Math.max(...results.dailyPortfolio.map(d => d.drawdown || 0)) : 0;
        const avgReturn = dailyReturns.length > 0 ? dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length : 0;
        const returnStdDev = dailyReturns.length > 0 ? Math.sqrt(dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / dailyReturns.length) : 0;
        const sharpeRatio = returnStdDev > 0 ? (avgReturn / returnStdDev) * Math.sqrt(252) : 0; // Annualized
        
        // Trade analysis
        const avgWin = winningTrades > 0 ? trades.filter(t => t.profit > 0).reduce((sum, t) => sum + t.profitPercent, 0) / winningTrades : 0;
        const avgLoss = losingTrades > 0 ? trades.filter(t => t.profit < 0).reduce((sum, t) => sum + Math.abs(t.profitPercent), 0) / losingTrades : 0;
        const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;
        
        return {
            totalReturn: totalReturn,
            totalTrades: trades.length,
            winningTrades: winningTrades,
            losingTrades: losingTrades,
            winRate: winRate,
            maxDrawdown: maxDrawdown,
            sharpeRatio: sharpeRatio,
            avgWin: avgWin,
            avgLoss: avgLoss,
            profitFactor: profitFactor,
            avgHoldingPeriod: trades.length > 0 ? trades.reduce((sum, t) => sum + t.holdingPeriod, 0) / trades.length : 0
        };
    }
    
    /**
     * Reset strategy state for new backtest
     */
    reset() {
        this.positions = [];
        this.tradeHistory = [];
        this.performance = {
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            totalReturn: 0,
            maxDrawdown: 0,
            sharpeRatio: 0
        };
    }
    
    /**
     * Generate a comprehensive strategy report
     * @param {Object} backtestResults - Results from backtest
     * @returns {Object} Detailed strategy report
     */
    generateReport(backtestResults) {
        const signalAnalysis = this.analyzeSignals(backtestResults.signals);
        const vortexAnalysis = this.analyzeVortexPatterns(backtestResults.dailyPortfolio);
        
        return {
            strategyConfig: this.config,
            performance: this.performance,
            signalAnalysis: signalAnalysis,
            vortexAnalysis: vortexAnalysis,
            tradeBreakdown: this.categorizeTradesByDigitalRoot(),
            critique: this.generateCritique()
        };
    }
    
    /**
     * Analyze signal distribution and effectiveness
     * @param {Array} signals - Array of signals from backtest
     * @returns {Object} Signal analysis
     */
    analyzeSignals(signals) {
        const signalCounts = { BUY: 0, SELL: 0, HOLD: 0 };
        const digitalRootSignals = {};
        
        signals.forEach(signal => {
            signalCounts[signal.signal]++;
            if (!digitalRootSignals[signal.digitalRoot]) {
                digitalRootSignals[signal.digitalRoot] = { BUY: 0, SELL: 0, HOLD: 0 };
            }
            digitalRootSignals[signal.digitalRoot][signal.signal]++;
        });
        
        return {
            signalDistribution: signalCounts,
            digitalRootBreakdown: digitalRootSignals,
            signalFrequency: {
                buyFrequency: (signalCounts.BUY / signals.length) * 100,
                sellFrequency: (signalCounts.SELL / signals.length) * 100,
                holdFrequency: (signalCounts.HOLD / signals.length) * 100
            }
        };
    }
    
    /**
     * Analyze vortex pattern effectiveness
     * @param {Array} dailyData - Daily portfolio data
     * @returns {Object} Vortex pattern analysis
     */
    analyzeVortexPatterns(dailyData) {
        const doublingSequenceDays = dailyData.filter(d => VM.isInDoublingSequence(d.digitalRoot));
        const teslaDays = dailyData.filter(d => VM.isTeslaNumber(d.digitalRoot));
        
        // Calculate performance on different vortex patterns
        const doublingSequenceReturns = this.calculatePatternReturns(doublingSequenceDays);
        const teslaReturns = this.calculatePatternReturns(teslaDays);
        
        return {
            doublingSequence: {
                occurrences: doublingSequenceDays.length,
                percentage: (doublingSequenceDays.length / dailyData.length) * 100,
                averageReturn: doublingSequenceReturns.average,
                volatility: doublingSequenceReturns.volatility
            },
            teslaNumbers: {
                occurrences: teslaDays.length,
                percentage: (teslaDays.length / dailyData.length) * 100,
                averageReturn: teslaReturns.average,
                volatility: teslaReturns.volatility
            }
        };
    }
    
    /**
     * Calculate returns for specific patterns
     * @param {Array} patternDays - Days matching specific pattern
     * @returns {Object} Return statistics
     */
    calculatePatternReturns(patternDays) {
        if (patternDays.length < 2) return { average: 0, volatility: 0 };
        
        const returns = patternDays.slice(1).map((day, i) => 
            (day.portfolioValue - patternDays[i].portfolioValue) / patternDays[i].portfolioValue
        );
        
        const average = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - average, 2), 0) / returns.length;
        
        return {
            average: average * 100, // Convert to percentage
            volatility: Math.sqrt(variance) * 100
        };
    }
    
    /**
     * Categorize trades by digital root patterns
     * @returns {Object} Trade categorization
     */
    categorizeTradesByDigitalRoot() {
        const categories = {};
        
        this.tradeHistory.forEach(trade => {
            const entryRoot = trade.entryDigitalRoot;
            const exitRoot = trade.exitDigitalRoot;
            const key = `${entryRoot}-${exitRoot}`;
            
            if (!categories[key]) {
                categories[key] = {
                    count: 0,
                    totalProfit: 0,
                    wins: 0,
                    losses: 0,
                    avgProfit: 0
                };
            }
            
            categories[key].count++;
            categories[key].totalProfit += trade.profitPercent;
            if (trade.profit > 0) categories[key].wins++;
            else categories[key].losses++;
        });
        
        // Calculate averages
        Object.keys(categories).forEach(key => {
            categories[key].avgProfit = categories[key].totalProfit / categories[key].count;
            categories[key].winRate = (categories[key].wins / categories[key].count) * 100;
        });
        
        return categories;
    }
    
    /**
     * Generate critical analysis of vortex strategy
     * @returns {Object} Strategy critique
     */
    generateCritique() {
        return {
            mathematicalBasis: "Vortex math trading relies on digital root calculations (modulo 9 arithmetic) applied to price data. While mathematically valid, the connection between modular arithmetic patterns and market behavior lacks empirical foundation.",
            
            empiricalEvidence: `Based on ${this.tradeHistory.length} trades, the strategy achieved a ${this.performance.winRate.toFixed(1)}% win rate. This performance should be compared against random trading and buy-and-hold strategies to assess actual edge.`,
            
            limitations: [
                "Digital roots are deterministic number theory operations, not predictive market indicators",
                "Price rounding to integers before digital root calculation loses information",
                "No consideration of market fundamentals, technical analysis, or economic factors",
                "Pattern matching in historical data may be coincidental (data mining bias)",
                "Transaction costs and slippage not accounted for in backtest"
            ],
            
            improvements: [
                "Compare against random trading baseline",
                "Test on multiple assets and timeframes",
                "Incorporate risk management beyond digital root patterns",
                "Combine with proven technical indicators",
                "Account for realistic trading costs"
            ],
            
            recommendation: "While intellectually interesting, vortex math trading should be considered experimental. Any real-world application should involve minimal capital and thorough comparison with established trading methods."
        };
    }
}

// UMD export: Node.js (CommonJS) and browser global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VortexStrategy;
} else if (typeof window !== 'undefined') {
    window.VortexStrategy = VortexStrategy;
}
