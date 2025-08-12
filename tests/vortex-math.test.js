/**
 * Comprehensive test suite for Vortex Math Core Functions
 * Tests mathematical accuracy, edge cases, and statistical properties
 */

// Import VortexMath class
const path = require('path');
const VortexMath = require(path.join(__dirname, '../src/core/vortex-math.js'));

describe('VortexMath Core Functions', () => {

    describe('Digital Root Calculations', () => {
        it('should calculate digital root using modular arithmetic correctly', () => {
            expect(VortexMath.digitalRoot(123)).toBe(6);  // 1+2+3=6
            expect(VortexMath.digitalRoot(456)).toBe(6);  // 4+5+6=15, 1+5=6
            expect(VortexMath.digitalRoot(789)).toBe(6);  // 7+8+9=24, 2+4=6
            expect(VortexMath.digitalRoot(999)).toBe(9);  // 9+9+9=27, 2+7=9
            expect(VortexMath.digitalRoot(0)).toBe(0);    // Special case
            expect(VortexMath.digitalRoot(9)).toBe(9);    // Single digit
            expect(VortexMath.digitalRoot(18)).toBe(9);   // 1+8=9
            expect(VortexMath.digitalRoot(27)).toBe(9);   // 2+7=9
        });

        it('should handle negative numbers', () => {
            expect(VortexMath.digitalRoot(-123)).toBe(6);
            expect(VortexMath.digitalRoot(-999)).toBe(9);
        });

        it('should be consistent between modular and iterative methods', () => {
            const testNumbers = [1, 9, 10, 99, 100, 123, 456, 789, 999, 1000, 9999];
            testNumbers.forEach(num => {
                expect(VortexMath.digitalRoot(num)).toBe(VortexMath.digitalRootIterative(num));
            });
        });
    });

    describe('Vortex Sequence Generation', () => {
        it('should generate standard doubling sequence correctly', () => {
            const sequence = VortexMath.doublingSequence(10);
            expect(sequence).toEqual([1, 2, 4, 8, 7, 5, 1]);  // Should complete one cycle
        });

        it('should generate tripling sequence correctly', () => {
            const sequence = VortexMath.triplingSequence(10);
            expect(sequence[0]).toBe(1);
            expect(sequence[1]).toBe(3);
            expect(sequence.length).toBeGreaterThan(0);
        });

        it('should handle custom multipliers and bases', () => {
            const sequence = VortexMath.generateVortexSequence(1, 2, 8, 10);
            expect(sequence[0]).toBe(1);
            // For base 8, numbers should be 1-8 (since 0 maps to 8)
            expect(sequence.every(n => n > 0 && n <= 8)).toBeTruthy();
        });

        it('should detect cycle completion', () => {
            const sequence = VortexMath.doublingSequence(20);
            // Should stop when cycle completes, not continue to length 20
            expect(sequence.length).toBeLessThan(20);
            expect(sequence[sequence.length - 1]).toBe(1);  // Should end where it started
        });
    });

    describe("Tesla's 3-6-9 Pattern Detection", () => {
        it('should detect 3-6-9 patterns in sequences', () => {
            const testSequence = [1, 3, 6, 9, 2, 3, 6, 4];
            const patterns = VortexMath.detectTeslaPatterns(testSequence);
            
            expect(patterns.tesla369Count).toBe(5);  // 3, 6, 9, 3, 6
            expect(patterns.balancePoints).toBe(1);  // One 9
            expect(patterns.oscillations).toBe(2);   // 3→6, 3→6
        });

        it('should handle sequences without Tesla patterns', () => {
            const testSequence = [1, 2, 4, 8, 7, 5];
            const patterns = VortexMath.detectTeslaPatterns(testSequence);
            
            expect(patterns.tesla369Count).toBe(0);
            expect(patterns.balancePoints).toBe(0);
            expect(patterns.oscillations).toBe(0);
        });
    });

    describe('Cross-Base Analysis', () => {
        it('should compare patterns across different bases', () => {
            const analysis = VortexMath.crossBaseAnalysis(123, [8, 9, 10]);
            
            expect(analysis.base8).toBeDefined();
            expect(analysis.base9).toBeDefined();
            expect(analysis.base10).toBeDefined();
            
            expect(analysis.base9.digitalRoot).toBe(6);  // Standard vortex math
        });

        it('should handle base-9 specially', () => {
            const analysis = VortexMath.crossBaseAnalysis(18, [9]);
            expect(analysis.base9.digitalRoot).toBe(9);
            expect(analysis.base9.note).toContain('Standard vortex math');
        });
    });

    describe('Price Data Analysis', () => {
        it('should analyze price data and generate digital roots', () => {
            const prices = [100.23, 200.45, 300.67];
            const analysis = VortexMath.analyzePriceData(prices);
            
            expect(analysis.digitalRoots).toBeDefined();
            expect(analysis.teslaPatterns).toBeDefined();
            expect(analysis.sequenceMatches).toBeDefined();
            expect(analysis.statistics).toBeDefined();
        });

        it('should calculate statistics correctly', () => {
            const digitalRoots = [1, 1, 2, 3, 3, 3];
            const stats = VortexMath.calculateStatistics(digitalRoots);
            
            expect(stats.frequency[1]).toBe(2);
            expect(stats.frequency[2]).toBe(1);
            expect(stats.frequency[3]).toBe(3);
            expect(stats.totalSamples).toBe(6);
            expect(stats.entropy).toBeGreaterThan(0);
        });
    });

    describe('Trading Signal Generation', () => {
        it('should generate buy signals on digital root 1', () => {
            const prices = [100, 190, 280];  // Digital roots should include 1
            const signals = VortexMath.generateTradingSignals(prices);
            
            const buySignals = signals.filter(s => s.type === 'BUY');
            expect(buySignals.length).toBeGreaterThan(0);
            buySignals.forEach(signal => {
                expect(signal.digitalRoot).toBe(1);
            });
        });

        it('should generate sell signals on digital root 5', () => {
            const prices = [500, 140, 950];  // Should include digital root 5
            const signals = VortexMath.generateTradingSignals(prices);
            
            const sellSignals = signals.filter(s => s.type === 'SELL');
            sellSignals.forEach(signal => {
                expect(signal.digitalRoot).toBe(5);
            });
        });
    });

    describe('Sequence Matching', () => {
        it('should find doubling sequence matches', () => {
            const digitalRoots = [1, 2, 4, 8, 7, 5, 1, 3, 6];
            const matches = VortexMath.findSequenceMatches(digitalRoots);
            
            expect(matches.doublingMatches.length).toBeGreaterThan(0);
        });

        it('should find partial sequence matches', () => {
            const digitalRoots = [9, 1, 2, 4, 9];  // Partial doubling sequence
            const matches = VortexMath.findSequenceMatches(digitalRoots);
            
            expect(matches.partialMatches.length).toBeGreaterThan(0);
        });
    });

    describe('Mathematical Validation', () => {
        it('should validate all mathematical properties', () => {
            const validation = VortexMath.validateMathematicalProperties();
            
            expect(validation.digitalRootConsistency).toBeTruthy();
            expect(validation.sequenceGeneration).toBeTruthy();
            expect(validation.modularArithmeticCorrectness).toBeTruthy();
            expect(validation.issues.length).toBe(0);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle empty arrays', () => {
            const analysis = VortexMath.analyzePriceData([]);
            expect(analysis.digitalRoots).toEqual([]);
            expect(analysis.statistics.totalSamples).toBe(0);
        });

        it('should handle very large numbers', () => {
            const largeNumber = 123456789012345;
            const digitalRoot = VortexMath.digitalRoot(largeNumber);
            expect(digitalRoot).toBeGreaterThan(0);
            expect(digitalRoot).toBeLessThanOrEqual(9);
        });

        it('should handle decimal prices correctly', () => {
            const prices = [123.45, 678.90];
            const signals = VortexMath.generateTradingSignals(prices);
            expect(signals).toBeDefined();
        });
    });

    describe('Entropy and Randomness Tests', () => {
        it('should calculate entropy for uniform distribution', () => {
            const frequency = {1:1, 2:1, 3:1, 4:1, 5:1, 6:1, 7:1, 8:1, 9:1};
            const entropy = VortexMath.calculateEntropy(frequency, 9);
            expect(entropy).toBeCloseTo(Math.log2(9), 2);  // Maximum entropy for 9 symbols
        });

        it('should calculate entropy for non-uniform distribution', () => {
            const frequency = {1:9, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0};
            const entropy = VortexMath.calculateEntropy(frequency, 9);
            expect(entropy).toBe(0);  // Minimum entropy (no randomness)
        });
    });
});