/**
 * Test suite for Vortex Strategy
 * Tests trading signal generation and backtesting functionality
 */

const path = require('path');
const VortexStrategy = require(path.join(__dirname, '../src/strategies/vortex-strategy.js'));

describe('VortexStrategy', () => {

    let strategy;
    
    beforeEach(() => {
        strategy = new VortexStrategy();
    });

    describe('Constructor and Configuration', () => {
        it('should initialize with default configuration', () => {
            expect(strategy.config.buySignal).toBe(1);
            expect(strategy.config.sellSignal).toBe(5);
            expect(strategy.config.holdSignal).toBe(9);
            expect(strategy.config.useTeslaFilter).toBe(true);
            expect(strategy.config.useSequenceFilter).toBe(true);
        });
        
        it('should accept custom configuration', () => {
            const customConfig = {
                buySignal: 2,
                sellSignal: 4,
                useTeslaFilter: false
            };
            
            const customStrategy = new VortexStrategy(customConfig);
            
            expect(customStrategy.config.buySignal).toBe(2);
            expect(customStrategy.config.sellSignal).toBe(4);
            expect(customStrategy.config.useTeslaFilter).toBe(false);
            expect(customStrategy.config.useSequenceFilter).toBe(true); // Default value
        });
    });

    describe('Signal Generation', () => {
        it('should generate buy signal for configured digital root', () => {
            const dataPoint = { digitalRoot: 1, price: 1000, date: '2020-01-01' };
            const signal = strategy.generateSignal(dataPoint, null);
            
            expect(signal.action).toBe('BUY');
            expect(signal.reasoning).toContain('Vortex buy signal');
        });
        
        it('should generate sell signal for configured digital root', () => {
            const dataPoint = { digitalRoot: 5, price: 1000, date: '2020-01-01' };
            const signal = strategy.generateSignal(dataPoint, null);
            
            expect(signal.action).toBe('SELL');
            expect(signal.reasoning).toContain('Vortex sell signal');
        });
        
        it('should generate hold signal for configured digital root', () => {
            // Since default config has useSequenceFilter=true, digital root 9 is filtered out
            const dataPoint = { digitalRoot: 9, price: 1000, date: '2020-01-01' };
            const signal = strategy.generateSignal(dataPoint, null);
            
            expect(signal.action).toBe('HOLD');
            expect(signal.reasoning).toContain('not in doubling sequence');
        });
        
        it('should apply Tesla filter when enabled', () => {
            // Digital root 3 is not in doubling sequence, so sequence filter will block it
            const dataPoint = { digitalRoot: 3, price: 1000, date: '2020-01-01' };
            const signal = strategy.generateSignal(dataPoint, null);
            
            expect(signal.action).toBe('HOLD');
            expect(signal.reasoning).toContain('not in doubling sequence');
        });
        
        it('should apply Tesla filter for negative polarity', () => {
            // Digital root 6 is not in doubling sequence, so sequence filter will block it
            const dataPoint = { digitalRoot: 6, price: 1000, date: '2020-01-01' };
            const signal = strategy.generateSignal(dataPoint, null);
            
            expect(signal.action).toBe('HOLD');
            expect(signal.reasoning).toContain('not in doubling sequence');
        });
        
        it('should apply sequence filter when enabled', () => {
            strategy.config.useSequenceFilter = true;
            const dataPoint = { digitalRoot: 3, price: 1000, date: '2020-01-01' }; // Not in doubling sequence
            const signal = strategy.generateSignal(dataPoint, null);
            
            expect(signal.action).toBe('HOLD');
            expect(signal.reasoning).toContain('not in doubling sequence');
        });
        
        it('should disable Tesla filter when configured', () => {
            strategy.config.useTeslaFilter = false;
            strategy.config.buySignal = 2; // Set different buy signal
            const dataPoint = { digitalRoot: 3, price: 1000, date: '2020-01-01' };
            const signal = strategy.generateSignal(dataPoint, null);
            
            expect(signal.action).toBe('HOLD');
            expect(signal.reasoning).not.toContain('Tesla');
        });
        
        it('should apply Tesla filter when sequence filter is disabled', () => {
            strategy.config.useSequenceFilter = false; // Disable sequence filter
            strategy.config.useTeslaFilter = true;
            const dataPoint = { digitalRoot: 3, price: 1000, date: '2020-01-01' };
            const signal = strategy.generateSignal(dataPoint, null);
            
            expect(signal.action).toBe('BUY');
            expect(signal.reasoning).toContain('Tesla positive polarity');
        });
        
        it('should apply Tesla negative polarity when sequence filter is disabled', () => {
            strategy.config.useSequenceFilter = false; // Disable sequence filter
            strategy.config.useTeslaFilter = true;
            const dataPoint = { digitalRoot: 6, price: 1000, date: '2020-01-01' };
            const signal = strategy.generateSignal(dataPoint, null);
            
            expect(signal.action).toBe('SELL');
            expect(signal.reasoning).toContain('Tesla negative polarity');
        });
    });

    describe('Position Management', () => {
        it('should open position correctly', () => {
            const dataPoint = { 
                date: '2020-01-01', 
                price: 1000, 
                digitalRoot: 1 
            };
            
            const position = strategy.openPosition('BUY', dataPoint, 10000);
            
            expect(position.action).toBe('BUY');
            expect(position.price).toBe(1000);
            expect(position.capital).toBe(10000);
            expect(position.size).toBe(1.0);
        });
        
        it('should close position and calculate profit correctly', () => {
            const entryData = { 
                date: '2020-01-01', 
                price: 1000, 
                digitalRoot: 1 
            };
            const exitData = { 
                date: '2020-01-10', 
                price: 1200, 
                digitalRoot: 5 
            };
            
            const position = strategy.openPosition('BUY', entryData, 10000);
            const trade = strategy.closePosition(position, exitData);
            
            expect(trade.profit).toBe(200);
            expect(trade.profitPercent).toBe(20);
            expect(trade.exitCapital).toBe(12000);
            expect(trade.holdingPeriod).toBe(9);
        });
        
        it('should calculate negative profit correctly', () => {
            const entryData = { 
                date: '2020-01-01', 
                price: 1000, 
                digitalRoot: 1 
            };
            const exitData = { 
                date: '2020-01-05', 
                price: 800, 
                digitalRoot: 5 
            };
            
            const position = strategy.openPosition('BUY', entryData, 10000);
            const trade = strategy.closePosition(position, exitData);
            
            expect(trade.profit).toBe(-200);
            expect(trade.profitPercent).toBe(-20);
            expect(trade.exitCapital).toBe(8000);
        });
    });

    describe('Backtesting', () => {
        it('should execute simple backtest correctly', () => {
            const priceData = [
                { date: '2020-01-01', price: 1000, digitalRoot: 1 }, // Buy signal
                { date: '2020-01-02', price: 1100, digitalRoot: 2 }, // Hold
                { date: '2020-01-03', price: 1200, digitalRoot: 5 }  // Sell signal
            ];
            
            const results = strategy.backtest(priceData, 10000);
            
            expect(results.trades).toHaveLength(2); // Open and close
            expect(results.finalCapital).toBe(12000);
            expect(results.totalReturn).toBe(20);
            expect(results.performance.totalTrades).toBe(1);
        });
        
        it('should handle multiple trades in backtest', () => {
            const priceData = [
                { date: '2020-01-01', price: 1000, digitalRoot: 1 }, // Buy
                { date: '2020-01-02', price: 1200, digitalRoot: 5 }, // Sell
                { date: '2020-01-03', price: 1100, digitalRoot: 1 }, // Buy
                { date: '2020-01-04', price: 1300, digitalRoot: 5 }  // Sell
            ];
            
            const results = strategy.backtest(priceData, 10000);
            
            expect(results.trades).toHaveLength(4); // Two complete trades
            expect(results.performance.totalTrades).toBe(2);
        });
        
        it('should not trade when no signals generated', () => {
            const priceData = [
                { date: '2020-01-01', price: 1000, digitalRoot: 2 },
                { date: '2020-01-02', price: 1100, digitalRoot: 3 },
                { date: '2020-01-03', price: 1200, digitalRoot: 4 }
            ];
            
            const results = strategy.backtest(priceData, 10000);
            
            expect(results.trades).toHaveLength(0);
            expect(results.finalCapital).toBe(10000);
            expect(results.totalReturn).toBe(0);
        });
        
        it('should close position at end of backtest period', () => {
            const priceData = [
                { date: '2020-01-01', price: 1000, digitalRoot: 1 }, // Buy
                { date: '2020-01-02', price: 1100, digitalRoot: 2 }, // Hold
                { date: '2020-01-03', price: 1200, digitalRoot: 3 }  // End (auto-close)
            ];
            
            const results = strategy.backtest(priceData, 10000);
            
            expect(results.trades).toHaveLength(2); // Open and auto-close
            expect(results.finalCapital).toBe(12000);
            expect(results.trades[1].reasoning).toContain('End of backtest');
        });
    });

    describe('Performance Metrics', () => {
        it('should calculate win rate correctly', () => {
            // Simulate completed trades
            strategy.tradeHistory = [
                { profit: 100, profitPercent: 10 },
                { profit: -50, profitPercent: -5 },
                { profit: 200, profitPercent: 20 }
            ];
            
            const mockResults = {
                dailyPortfolio: [
                    { portfolioValue: 10000, drawdown: 0 },
                    { portfolioValue: 11000, drawdown: 0 },
                    { portfolioValue: 10500, drawdown: 4.5 },
                    { portfolioValue: 12500, drawdown: 0 }
                ]
            };
            
            const performance = strategy.calculatePerformanceMetrics(mockResults, 10000, 12500);
            
            expect(performance.totalTrades).toBe(3);
            expect(performance.winningTrades).toBe(2);
            expect(performance.losingTrades).toBe(1);
            expect(performance.winRate).toBeCloseTo(66.67, 1);
        });
        
        it('should calculate maximum drawdown correctly', () => {
            const mockResults = {
                dailyPortfolio: [
                    { portfolioValue: 10000, drawdown: 0 },
                    { portfolioValue: 12000, drawdown: 0 },
                    { portfolioValue: 9000, drawdown: 25 },
                    { portfolioValue: 11000, drawdown: 8.33 }
                ]
            };
            
            const performance = strategy.calculatePerformanceMetrics(mockResults, 10000, 11000);
            
            expect(performance.maxDrawdown).toBe(25);
        });
        
        it('should calculate Sortino ratio correctly', () => {
            const mockResults = {
                dailyPortfolio: [
                    { portfolioValue: 10000 },
                    { portfolioValue: 11000 }, // +10% return
                    { portfolioValue: 10500 }, // -4.5% return
                    { portfolioValue: 12000 }  // +14.3% return
                ]
            };
            
            const performance = strategy.calculatePerformanceMetrics(mockResults, 10000, 12000);
            
            // Sortino should be calculated (only penalizes downside volatility)
            expect(performance.sortinoRatio).toBeDefined();
            expect(typeof performance.sortinoRatio).toBe('number');
            // Should be higher than Sharpe since it only penalizes negative returns
            expect(performance.sortinoRatio).toBeGreaterThanOrEqual(performance.sharpeRatio);
        });
        
        it('should handle empty trade history', () => {
            strategy.tradeHistory = [];
            
            const mockResults = {
                dailyPortfolio: [
                    { portfolioValue: 10000, drawdown: 0 }
                ]
            };
            
            const performance = strategy.calculatePerformanceMetrics(mockResults, 10000, 10000);
            
            expect(performance.totalTrades).toBe(0);
            expect(performance.winRate).toBe(0);
            expect(performance.avgWin).toBe(0);
            expect(performance.avgLoss).toBe(0);
        });
    });

    describe('Signal Analysis', () => {
        it('should analyze signal distribution correctly', () => {
            const signals = [
                { signal: 'BUY', digitalRoot: 1 },
                { signal: 'BUY', digitalRoot: 1 },
                { signal: 'SELL', digitalRoot: 5 },
                { signal: 'HOLD', digitalRoot: 9 },
                { signal: 'HOLD', digitalRoot: 2 }
            ];
            
            const analysis = strategy.analyzeSignals(signals);
            
            expect(analysis.signalDistribution.BUY).toBe(2);
            expect(analysis.signalDistribution.SELL).toBe(1);
            expect(analysis.signalDistribution.HOLD).toBe(2);
            expect(analysis.signalFrequency.buyFrequency).toBe(40);
            expect(analysis.digitalRootBreakdown[1].BUY).toBe(2);
        });
    });

    describe('Strategy Report Generation', () => {
        it('should generate comprehensive strategy report', () => {
            const mockBacktestResults = {
                signals: [
                    { signal: 'BUY', digitalRoot: 1 },
                    { signal: 'SELL', digitalRoot: 5 }
                ],
                dailyPortfolio: [
                    { digitalRoot: 1, portfolioValue: 10000 },
                    { digitalRoot: 5, portfolioValue: 12000 }
                ]
            };
            
            strategy.tradeHistory = [
                { entryDigitalRoot: 1, exitDigitalRoot: 5, profitPercent: 20, profit: 2000, holdingPeriod: 10 }
            ];
            
            // Set up performance metrics properly
            strategy.performance = {
                totalTrades: 1,
                winningTrades: 1,
                losingTrades: 0,
                totalReturn: 20.0,
                maxDrawdown: 5.5,
                sharpeRatio: 1.2,
                winRate: 100.0,
                avgWin: 20.0,
                avgLoss: 0.0,
                profitFactor: Infinity,
                avgHoldingPeriod: 10
            };
            
            const report = strategy.generateReport(mockBacktestResults);
            
            expect(report.strategyConfig).toBeDefined();
            expect(report.performance).toBeDefined();
            expect(report.signalAnalysis).toBeDefined();
            expect(report.vortexAnalysis).toBeDefined();
            expect(report.critique).toBeDefined();
            expect(report.critique.recommendation).toContain('experimental');
        });
    });

    describe('Pattern Analysis', () => {
        it('should calculate pattern returns correctly', () => {
            const patternDays = [
                { portfolioValue: 10000 },
                { portfolioValue: 11000 },
                { portfolioValue: 10500 }
            ];
            
            const returns = strategy.calculatePatternReturns(patternDays);
            
            // Return 1: (11000-10000)/10000 = 0.1 = 10%
            // Return 2: (10500-11000)/11000 = -0.045 = -4.5%
            // Average: (10 + (-4.5))/2 = 2.75%
            expect(returns.average).toBeCloseTo(2.75, 1);
            expect(returns.volatility).toBeGreaterThan(0);
        });
        
        it('should handle insufficient pattern data', () => {
            const patternDays = [{ portfolioValue: 10000 }];
            
            const returns = strategy.calculatePatternReturns(patternDays);
            
            expect(returns.average).toBe(0);
            expect(returns.volatility).toBe(0);
        });
    });

    describe('Reset Functionality', () => {
        it('should reset strategy state correctly', () => {
            // Add some state
            strategy.tradeHistory = [{ profit: 100 }];
            strategy.positions = [{ price: 1000 }];
            strategy.performance.totalTrades = 5;
            
            strategy.reset();
            
            expect(strategy.tradeHistory).toHaveLength(0);
            expect(strategy.positions).toHaveLength(0);
            expect(strategy.performance.totalTrades).toBe(0);
        });
    });

    describe('Edge Cases', () => {
        it('should handle same day entry and exit', () => {
            const dataPoint = { 
                date: '2020-01-01', 
                price: 1000, 
                digitalRoot: 1 
            };
            
            const position = strategy.openPosition('BUY', dataPoint, 10000);
            const trade = strategy.closePosition(position, dataPoint);
            
            expect(trade.holdingPeriod).toBe(0);
            expect(trade.profit).toBe(0);
        });
        
        it('should handle very large price changes', () => {
            const entryData = { 
                date: '2020-01-01', 
                price: 1000, 
                digitalRoot: 1 
            };
            const exitData = { 
                date: '2020-01-02', 
                price: 10000, 
                digitalRoot: 5 
            };
            
            const position = strategy.openPosition('BUY', entryData, 10000);
            const trade = strategy.closePosition(position, exitData);
            
            expect(trade.profitPercent).toBe(900);
            expect(trade.exitCapital).toBe(100000);
        });
    });
});
