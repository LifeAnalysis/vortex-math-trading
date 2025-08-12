/**
 * Vortex Math Core Functions
 * Implementation of Marko Rodin's vortex mathematics principles
 * 
 * MATHEMATICAL DISCLAIMER:
 * These functions implement vortex mathematics as described by enthusiasts,
 * while acknowledging the mathematical community's criticism of these concepts
 * as lacking empirical validation and scientific rigor.
 */

class VortexMath {
    
    /**
     * Calculate digital root using modular arithmetic
     * Digital root ≡ n mod 9, with special case: if n mod 9 = 0 and n ≠ 0, then digital root = 9
     * 
     * Mathematical Foundation: This is simply modulo 9 arithmetic with a conventional adjustment
     * @param {number} n - Input number
     * @returns {number} Digital root (1-9)
     */
    static digitalRoot(n) {
        if (n === 0) return 0;
        const mod = Math.abs(n) % 9;
        return mod === 0 ? 9 : mod;
    }

    /**
     * Alternative digital root calculation using iterative digit summation
     * This demonstrates the equivalence to modular arithmetic
     * @param {number} n - Input number
     * @returns {number} Digital root (1-9)
     */
    static digitalRootIterative(n) {
        if (n === 0) return 0;
        
        n = Math.abs(n);
        while (n >= 10) {
            let sum = 0;
            while (n > 0) {
                sum += n % 10;
                n = Math.floor(n / 10);
            }
            n = sum;
        }
        return n === 0 ? 9 : n;
    }

    /**
     * Generate vortex sequence using specified multiplier and base
     * Standard doubling: multiplier = 2, base = 9
     * Tripling: multiplier = 3, base = 9
     * 
     * Mathematical Note: This creates a cyclic group under multiplication modulo base
     * @param {number} start - Starting number (default 1)
     * @param {number} multiplier - Multiplication factor (default 2)
     * @param {number} base - Modular base (default 9)
     * @param {number} length - Sequence length (default 20)
     * @returns {Array<number>} Generated sequence
     */
    static generateVortexSequence(start = 1, multiplier = 2, base = 9, length = 20) {
        const sequence = [start];
        let current = start;
        
        for (let i = 1; i < length; i++) {
            current = (current * multiplier) % base;
            if (current === 0) current = base;  // Map 0 to base value
            sequence.push(current);
            
            // Break if we've completed a cycle
            if (current === start && i > 1) break;
        }
        
        return sequence;
    }

    /**
     * Standard doubling sequence (1 → 2 → 4 → 8 → 7 → 5 → 1)
     * This is the core vortex math sequence excluding 3, 6, 9
     * @param {number} length - Maximum sequence length
     * @returns {Array<number>} Doubling sequence
     */
    static doublingSequence(length = 20) {
        return this.generateVortexSequence(1, 2, 9, length);
    }

    /**
     * Tesla's tripling sequence for 3-6-9 analysis
     * Generates sequence using multiplier 3
     * @param {number} length - Maximum sequence length  
     * @returns {Array<number>} Tripling sequence
     */
    static triplingSequence(length = 20) {
        return this.generateVortexSequence(1, 3, 9, length);
    }

    /**
     * Detect Tesla's 3-6-9 patterns in a number sequence
     * Tesla allegedly said: "If you only knew the magnificence of the 3, 6, and 9"
     * 
     * Mathematical Critique: No empirical evidence supports special significance
     * @param {Array<number>} sequence - Input sequence
     * @returns {Object} Pattern analysis
     */
    static detectTeslaPatterns(sequence) {
        const digitalRoots = sequence.map(n => this.digitalRoot(n));
        const tesla369 = digitalRoots.filter(dr => [3, 6, 9].includes(dr));
        
        const patterns = {
            tesla369Count: tesla369.length,
            tesla369Positions: [],
            oscillations: 0,
            balancePoints: 0  // Points where digital root = 9
        };

        digitalRoots.forEach((dr, index) => {
            if ([3, 6, 9].includes(dr)) {
                patterns.tesla369Positions.push({index, value: dr});
            }
            if (dr === 9) {
                patterns.balancePoints++;
            }
        });

        // Detect 3-6 oscillations
        for (let i = 1; i < digitalRoots.length; i++) {
            const prev = digitalRoots[i-1];
            const curr = digitalRoots[i];
            if ((prev === 3 && curr === 6) || (prev === 6 && curr === 3)) {
                patterns.oscillations++;
            }
        }

        return patterns;
    }

    /**
     * Cross-base analysis - Compare patterns across different numerical bases
     * Demonstrates arbitrariness of base-10 in vortex math
     * @param {number} number - Input number
     * @param {Array<number>} bases - Bases to compare (default [8, 9, 10])
     * @returns {Object} Cross-base comparison
     */
    static crossBaseAnalysis(number, bases = [8, 9, 10]) {
        const analysis = {};
        
        bases.forEach(base => {
            if (base === 9) {
                // Special handling for base-9 (standard vortex math)
                analysis[`base${base}`] = {
                    digitalRoot: this.digitalRoot(number),
                    doublingSequence: this.generateVortexSequence(1, 2, base, 10),
                    note: "Standard vortex math base"
                };
            } else {
                // General modular arithmetic for other bases
                const mod = number % (base - 1);
                const digitalRoot = mod === 0 ? (base - 1) : mod;
                analysis[`base${base}`] = {
                    digitalRoot: digitalRoot,
                    doublingSequence: this.generateVortexSequence(1, 2, base - 1, 10),
                    note: `Base-${base} modular arithmetic`
                };
            }
        });

        return analysis;
    }

    /**
     * Apply vortex math to price data for trading signals
     * Converts prices to digital roots and applies sequence analysis
     * @param {Array<number>} prices - Array of price values
     * @returns {Object} Vortex analysis of price data
     */
    static analyzePriceData(prices) {
        const digitalRoots = prices.map(price => this.digitalRoot(Math.round(price * 100))); // Use cents to avoid decimals
        
        const analysis = {
            digitalRoots: digitalRoots,
            teslaPatterns: this.detectTeslaPatterns(digitalRoots),
            sequenceMatches: this.findSequenceMatches(digitalRoots),
            statistics: this.calculateStatistics(digitalRoots)
        };

        return analysis;
    }

    /**
     * Find matches with standard vortex sequences in price data
     * @param {Array<number>} digitalRoots - Digital roots of prices
     * @returns {Object} Sequence match analysis
     */
    static findSequenceMatches(digitalRoots) {
        const doublingSeq = this.doublingSequence(6); // Standard 6-element cycle
        const matches = {
            doublingMatches: [],
            reverseMatches: [],
            partialMatches: []
        };

        // Look for complete doubling sequence matches
        for (let i = 0; i <= digitalRoots.length - doublingSeq.length; i++) {
            const slice = digitalRoots.slice(i, i + doublingSeq.length);
            if (JSON.stringify(slice) === JSON.stringify(doublingSeq)) {
                matches.doublingMatches.push({start: i, end: i + doublingSeq.length - 1});
            }
        }

        // Look for partial matches (3+ consecutive elements)
        for (let len = 3; len < doublingSeq.length; len++) {
            for (let i = 0; i <= digitalRoots.length - len; i++) {
                const slice = digitalRoots.slice(i, i + len);
                for (let j = 0; j <= doublingSeq.length - len; j++) {
                    const seqSlice = doublingSeq.slice(j, j + len);
                    if (JSON.stringify(slice) === JSON.stringify(seqSlice)) {
                        matches.partialMatches.push({
                            start: i, 
                            end: i + len - 1, 
                            length: len,
                            sequence: slice
                        });
                    }
                }
            }
        }

        return matches;
    }

    /**
     * Calculate statistical properties of digital root sequence
     * @param {Array<number>} digitalRoots - Digital roots sequence
     * @returns {Object} Statistical analysis
     */
    static calculateStatistics(digitalRoots) {
        const frequency = {};
        for (let i = 1; i <= 9; i++) frequency[i] = 0;
        
        digitalRoots.forEach(dr => frequency[dr]++);
        
        const total = digitalRoots.length;
        const distribution = {};
        for (let i = 1; i <= 9; i++) {
            distribution[i] = (frequency[i] / total * 100).toFixed(2) + '%';
        }

        return {
            frequency: frequency,
            distribution: distribution,
            totalSamples: total,
            entropy: this.calculateEntropy(frequency, total)
        };
    }

    /**
     * Calculate Shannon entropy of digital root distribution
     * Higher entropy indicates more random distribution
     * @param {Object} frequency - Frequency count object
     * @param {number} total - Total sample count
     * @returns {number} Entropy value
     */
    static calculateEntropy(frequency, total) {
        let entropy = 0;
        for (let i = 1; i <= 9; i++) {
            if (frequency[i] > 0) {
                const p = frequency[i] / total;
                entropy -= p * Math.log2(p);
            }
        }
        return parseFloat(entropy.toFixed(4));
    }

    /**
     * Generate trading signals based on vortex math principles
     * Buy on digital root 1 (start of cycle), sell on digital root 5 (cycle end)
     * 
     * DISCLAIMER: This is speculative and not validated by empirical evidence
     * @param {Array<number>} prices - Price array
     * @returns {Array<Object>} Trading signals
     */
    static generateTradingSignals(prices) {
        const signals = [];
        const digitalRoots = prices.map(price => this.digitalRoot(Math.round(price * 100)));
        
        digitalRoots.forEach((dr, index) => {
            if (dr === 1) {
                signals.push({
                    index: index,
                    type: 'BUY',
                    price: prices[index],
                    digitalRoot: dr,
                    reason: 'Digital root 1 - Start of vortex cycle'
                });
            } else if (dr === 5) {
                signals.push({
                    index: index,
                    type: 'SELL',
                    price: prices[index],
                    digitalRoot: dr,
                    reason: 'Digital root 5 - End of vortex cycle'
                });
            }
        });

        return signals;
    }

    /**
     * Check if a number is a Tesla number (3, 6, or 9)
     * Tesla referred to these as fundamental universal patterns
     * @param {number} n - Number to check (typically a digital root)
     * @returns {boolean} True if Tesla number
     */
    static isTeslaNumber(n) {
        return [3, 6, 9].includes(n);
    }

    /**
     * Checks if a digital root appears in the doubling sequence
     * @param {number} digitalRoot - Digital root to check (1-9)
     * @returns {boolean} True if in doubling sequence
     */
    static isInDoublingSequence(digitalRoot) {
        const doublingSequence = [1, 2, 4, 8, 7, 5];
        return doublingSequence.includes(digitalRoot);
    }

    /**
     * Validate mathematical properties and detect potential issues
     * @returns {Object} Validation results
     */
    static validateMathematicalProperties() {
        const validation = {
            digitalRootConsistency: true,
            sequenceGeneration: true,
            modularArithmeticCorrectness: true,
            issues: []
        };

        // Test digital root consistency
        const testNumbers = [123, 456, 789, 999, 1000];
        testNumbers.forEach(num => {
            const modular = this.digitalRoot(num);
            const iterative = this.digitalRootIterative(num);
            if (modular !== iterative) {
                validation.digitalRootConsistency = false;
                validation.issues.push(`Digital root mismatch for ${num}: modular=${modular}, iterative=${iterative}`);
            }
        });

        // Test sequence properties
        const sequence = this.doublingSequence(10);
        if (sequence.length === 0 || sequence[0] !== 1) {
            validation.sequenceGeneration = false;
            validation.issues.push('Doubling sequence generation failed');
        }

        return validation;
    }
}

// Export for use in browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VortexMath;
} else if (typeof window !== 'undefined') {
    window.VortexMath = VortexMath;
}