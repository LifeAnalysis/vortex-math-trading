/**
 * Data Processing and Validation for Vortex Math Trading System
 * Handles historical cryptocurrency data and prepares it for vortex analysis
 */

const VortexMath = require('../core/vortex-math.js');

class DataProcessor {
    
    /**
     * Load historical price data from JSON file
     * @param {string} filePath - Path to the data file
     * @returns {Promise<Object>} Processed price data
     */
    static async loadHistoricalData(filePath = './btc-historical-data.json') {
        try {
            const data = require(filePath);
            return this.processRawData(data);
        } catch (error) {
            console.error('Error loading historical data:', error);
            throw new Error(`Failed to load data from ${filePath}: ${error.message}`);
        }
    }
    
    /**
     * Process raw CoinGecko data into vortex-ready format
     * @param {Object} rawData - Raw CoinGecko data with metadata and prices
     * @returns {Object} Processed data with timestamps, prices, and vortex calculations
     */
    static processRawData(rawData) {
        if (!rawData.prices || !Array.isArray(rawData.prices)) {
            throw new Error('Invalid data format: prices array not found');
        }
        
        const processedData = {
            metadata: {
                ...rawData.metadata,
                processedAt: new Date().toISOString(),
                totalRecords: rawData.prices.length
            },
            dailyData: []
        };
        
        // Process each price point
        rawData.prices.forEach(([timestamp, price], index) => {
            const date = new Date(timestamp);
            const digitalRoot = VortexMath.digitalRoot(Math.round(price));
            
            const dataPoint = {
                date: date.toISOString().split('T')[0], // YYYY-MM-DD format
                timestamp: timestamp,
                price: price,
                priceRounded: Math.round(price),
                digitalRoot: digitalRoot,
                vortexSequencePosition: this.getSequencePosition(digitalRoot),
                isDoublingSequence: VortexMath.isInDoublingSequence(digitalRoot),
                isTeslaNumber: VortexMath.isTeslaNumber(digitalRoot),
                // Calculate price change if not first record
                priceChange: index > 0 ? price - rawData.prices[index - 1][1] : 0,
                priceChangePercent: index > 0 ? ((price - rawData.prices[index - 1][1]) / rawData.prices[index - 1][1]) * 100 : 0
            };
            
            processedData.dailyData.push(dataPoint);
        });
        
        // Add statistical summary
        processedData.statistics = this.calculateStatistics(processedData.dailyData);
        
        return processedData;
    }
    
    /**
     * Get position of digital root in the standard doubling sequence
     * @param {number} digitalRoot - Digital root (1-9)
     * @returns {number} Position in sequence (0-based), -1 if not in sequence
     */
    static getSequencePosition(digitalRoot) {
        const doublingSequence = [1, 2, 4, 8, 7, 5]; // Standard vortex doubling sequence
        return doublingSequence.indexOf(digitalRoot);
    }
    
    /**
     * Calculate statistical summary of the processed data
     * @param {Array} dailyData - Array of processed daily data points
     * @returns {Object} Statistical summary
     */
    static calculateStatistics(dailyData) {
        const prices = dailyData.map(d => d.price);
        const digitalRoots = dailyData.map(d => d.digitalRoot);
        
        // Digital root frequency distribution
        const rootFrequency = {};
        for (let i = 1; i <= 9; i++) {
            rootFrequency[i] = digitalRoots.filter(root => root === i).length;
        }
        
        // Doubling sequence statistics
        const doublingSequenceCount = dailyData.filter(d => d.isDoublingSequence).length;
        const teslaNumberCount = dailyData.filter(d => d.isTeslaNumber).length;
        
        // Price statistics
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        
        // Volatility (standard deviation)
        const priceVariance = prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length;
        const priceStdDev = Math.sqrt(priceVariance);
        
        return {
            priceRange: {
                min: minPrice,
                max: maxPrice,
                average: avgPrice,
                standardDeviation: priceStdDev,
                volatility: (priceStdDev / avgPrice) * 100 // Coefficient of variation as %
            },
            digitalRootDistribution: {
                frequencies: rootFrequency,
                percentages: Object.fromEntries(
                    Object.entries(rootFrequency).map(([root, count]) => 
                        [root, ((count / dailyData.length) * 100).toFixed(2)]
                    )
                )
            },
            vortexMetrics: {
                doublingSequenceOccurrences: doublingSequenceCount,
                doublingSequencePercentage: ((doublingSequenceCount / dailyData.length) * 100).toFixed(2),
                teslaNumberOccurrences: teslaNumberCount,
                teslaNumberPercentage: ((teslaNumberCount / dailyData.length) * 100).toFixed(2)
            },
            dataQuality: {
                totalRecords: dailyData.length,
                missingPrices: dailyData.filter(d => d.price === null || d.price === undefined).length,
                priceRange: maxPrice - minPrice,
                timeSpan: {
                    start: dailyData[0]?.date,
                    end: dailyData[dailyData.length - 1]?.date
                }
            }
        };
    }
    
    /**
     * Validate data quality and completeness
     * @param {Object} processedData - Processed data object
     * @returns {Object} Validation results with warnings and errors
     */
    static validateData(processedData) {
        const warnings = [];
        const errors = [];
        
        // Check for missing data
        if (!processedData.dailyData || processedData.dailyData.length === 0) {
            errors.push('No daily data found');
            return { valid: false, errors, warnings };
        }
        
        // Check for data gaps (more than 1 day between records)
        for (let i = 1; i < processedData.dailyData.length; i++) {
            const prevDate = new Date(processedData.dailyData[i - 1].timestamp);
            const currDate = new Date(processedData.dailyData[i].timestamp);
            const daysDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
            
            if (daysDiff > 1.5) { // Allow some tolerance for weekends
                warnings.push(`Data gap detected: ${daysDiff.toFixed(1)} days between ${prevDate.toDateString()} and ${currDate.toDateString()}`);
            }
        }
        
        // Check for anomalous prices (more than 50% change in a day)
        const largePriceChanges = processedData.dailyData.filter(d => Math.abs(d.priceChangePercent) > 50);
        if (largePriceChanges.length > 0) {
            warnings.push(`${largePriceChanges.length} days with price changes > 50%`);
        }
        
        // Check digital root distribution (should be roughly even if truly random)
        const rootDist = processedData.statistics.digitalRootDistribution.frequencies;
        const expectedCount = processedData.dailyData.length / 9;
        const significantDeviations = Object.entries(rootDist).filter(
            ([root, count]) => Math.abs(count - expectedCount) > expectedCount * 0.5
        );
        
        if (significantDeviations.length > 0) {
            warnings.push(`Uneven digital root distribution detected for roots: ${significantDeviations.map(([root]) => root).join(', ')}`);
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings,
            summary: {
                totalRecords: processedData.dailyData.length,
                dataQuality: warnings.length === 0 ? 'Good' : 'Issues detected',
                timespan: `${processedData.dailyData[0]?.date} to ${processedData.dailyData[processedData.dailyData.length - 1]?.date}`
            }
        };
    }
    
    /**
     * Export processed data to CSV format
     * @param {Object} processedData - Processed data object
     * @returns {string} CSV formatted string
     */
    static exportToCSV(processedData) {
        const headers = [
            'Date', 'Price', 'Digital_Root', 'Sequence_Position', 
            'Is_Doubling_Sequence', 'Is_Tesla_Number', 'Price_Change', 'Price_Change_Percent'
        ];
        
        const rows = processedData.dailyData.map(d => [
            d.date,
            d.price.toFixed(2),
            d.digitalRoot,
            d.vortexSequencePosition,
            d.isDoublingSequence ? 'Yes' : 'No',
            d.isTeslaNumber ? 'Yes' : 'No',
            d.priceChange.toFixed(2),
            d.priceChangePercent.toFixed(2)
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
}

module.exports = DataProcessor;
