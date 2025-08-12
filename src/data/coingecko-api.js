/**
 * CoinGecko API Integration for Historical Cryptocurrency Data
 * Fetches price data for vortex math analysis
 */

class CoinGeckoAPI {
    constructor() {
        this.baseURL = 'https://api.coingecko.com/api/v3';
        this.cache = new Map();
        this.cacheTimeout = 300000; // 5 minutes
    }

    /**
     * Fetch historical market data for a cryptocurrency
     * @param {string} coinId - CoinGecko coin ID (e.g., 'bitcoin')
     * @param {string} vsCurrency - Target currency (default: 'usd')
     * @param {number} days - Number of days of data (default: 365)
     * @returns {Promise<Object>} Historical price data
     */
    async getHistoricalData(coinId = 'bitcoin', vsCurrency = 'usd', days = 365) {
        const cacheKey = `${coinId}-${vsCurrency}-${days}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            const url = `${this.baseURL}/coins/${coinId}/market_chart?vs_currency=${vsCurrency}&days=${days}&interval=daily`;
            console.log('Fetching data from:', url);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Process the data
            const processed = this.processMarketData(data);
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: processed,
                timestamp: Date.now()
            });
            
            return processed;
            
        } catch (error) {
            console.error('Error fetching data from CoinGecko:', error);
            
            // Return mock data for development/testing
            return this.getMockData(coinId, days);
        }
    }

    /**
     * Process raw market data from CoinGecko API
     * @param {Object} rawData - Raw API response
     * @returns {Object} Processed data ready for analysis
     */
    processMarketData(rawData) {
        if (!rawData.prices || !Array.isArray(rawData.prices)) {
            throw new Error('Invalid market data format');
        }

        const prices = rawData.prices.map(([timestamp, price]) => ({
            date: new Date(timestamp),
            timestamp: timestamp,
            price: price,
            // Add some basic derived data
            dateString: new Date(timestamp).toISOString().split('T')[0]
        }));

        const marketCaps = rawData.market_caps ? rawData.market_caps.map(([timestamp, cap]) => ({
            timestamp: timestamp,
            marketCap: cap
        })) : [];

        const volumes = rawData.total_volumes ? rawData.total_volumes.map(([timestamp, vol]) => ({
            timestamp: timestamp,
            volume: vol
        })) : [];

        return {
            prices: prices,
            marketCaps: marketCaps,
            volumes: volumes,
            summary: {
                totalDataPoints: prices.length,
                dateRange: {
                    start: prices[0]?.dateString,
                    end: prices[prices.length - 1]?.dateString
                },
                priceRange: {
                    min: Math.min(...prices.map(p => p.price)),
                    max: Math.max(...prices.map(p => p.price))
                }
            }
        };
    }

    /**
     * Get price data specifically for vortex math analysis
     * @param {string} coinId - Coin identifier
     * @param {Object} options - Fetch options
     * @returns {Promise<Array<number>>} Array of closing prices
     */
    async getPricesForVortexAnalysis(coinId = 'bitcoin', options = {}) {
        const {
            vsCurrency = 'usd',
            days = 365,
            startDate = null,
            endDate = null
        } = options;

        let data;
        
        if (startDate && endDate) {
            // Use date range if provided
            data = await this.getHistoricalDataByDateRange(coinId, vsCurrency, startDate, endDate);
        } else {
            // Use days parameter
            data = await this.getHistoricalData(coinId, vsCurrency, days);
        }

        return data.prices.map(item => item.price);
    }

    /**
     * Fetch historical data for a specific date range
     * @param {string} coinId - Coin identifier
     * @param {string} vsCurrency - Target currency
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @returns {Promise<Object>} Historical data
     */
    async getHistoricalDataByDateRange(coinId, vsCurrency, startDate, endDate) {
        const startTimestamp = new Date(startDate).getTime();
        const endTimestamp = new Date(endDate).getTime();
        const daysDiff = Math.ceil((endTimestamp - startTimestamp) / (1000 * 60 * 60 * 24));
        
        // CoinGecko API doesn't directly support date ranges, so we fetch by days
        // and then filter the results
        const allData = await this.getHistoricalData(coinId, vsCurrency, daysDiff + 30); // Add buffer
        
        // Filter data to the specified range
        const filteredPrices = allData.prices.filter(item => {
            return item.timestamp >= startTimestamp && item.timestamp <= endTimestamp;
        });

        return {
            ...allData,
            prices: filteredPrices,
            summary: {
                ...allData.summary,
                totalDataPoints: filteredPrices.length,
                dateRange: {
                    start: startDate,
                    end: endDate
                }
            }
        };
    }

    /**
     * Get mock data for testing/development when API is unavailable
     * @param {string} coinId - Coin identifier
     * @param {number} days - Number of days
     * @returns {Object} Mock historical data
     */
    getMockData(coinId, days) {
        console.log('Using mock data for development');
        
        const prices = [];
        const basePrice = coinId === 'bitcoin' ? 45000 : 3000;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        for (let i = 0; i < days; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            
            // Generate realistic price movements
            const randomFactor = 0.95 + Math.random() * 0.1; // ±5% daily movement
            const trendFactor = 1 + Math.sin(i / 30) * 0.02; // Long-term trend
            const price = basePrice * trendFactor * randomFactor;

            prices.push({
                date: date,
                timestamp: date.getTime(),
                price: price,
                dateString: date.toISOString().split('T')[0]
            });
        }

        return {
            prices: prices,
            marketCaps: [],
            volumes: [],
            summary: {
                totalDataPoints: prices.length,
                dateRange: {
                    start: prices[0].dateString,
                    end: prices[prices.length - 1].dateString
                },
                priceRange: {
                    min: Math.min(...prices.map(p => p.price)),
                    max: Math.max(...prices.map(p => p.price))
                }
            },
            isMockData: true
        };
    }

    /**
     * Get available cryptocurrencies list
     * @returns {Promise<Array>} List of available coins
     */
    async getAvailableCoins() {
        try {
            const response = await fetch(`${this.baseURL}/coins/list`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching coins list:', error);
            
            // Return common coins as fallback
            return [
                { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' },
                { id: 'ethereum', symbol: 'eth', name: 'Ethereum' },
                { id: 'cardano', symbol: 'ada', name: 'Cardano' },
                { id: 'polkadot', symbol: 'dot', name: 'Polkadot' },
                { id: 'chainlink', symbol: 'link', name: 'Chainlink' }
            ];
        }
    }

    /**
     * Validate and clean price data for vortex analysis
     * @param {Array<number>} prices - Raw price array
     * @returns {Object} Validation results and cleaned data
     */
    validatePriceData(prices) {
        const validation = {
            isValid: true,
            issues: [],
            cleanedPrices: [],
            statistics: {}
        };

        if (!Array.isArray(prices) || prices.length === 0) {
            validation.isValid = false;
            validation.issues.push('No price data provided');
            return validation;
        }

        // Remove invalid values and outliers
        const cleanedPrices = prices.filter(price => {
            if (typeof price !== 'number' || isNaN(price) || !isFinite(price)) {
                validation.issues.push(`Invalid price value: ${price}`);
                return false;
            }
            if (price <= 0) {
                validation.issues.push(`Non-positive price: ${price}`);
                return false;
            }
            return true;
        });

        // Calculate basic statistics
        if (cleanedPrices.length > 0) {
            validation.statistics = {
                count: cleanedPrices.length,
                min: Math.min(...cleanedPrices),
                max: Math.max(...cleanedPrices),
                mean: cleanedPrices.reduce((a, b) => a + b, 0) / cleanedPrices.length,
                volatility: this.calculateVolatility(cleanedPrices)
            };
        }

        validation.cleanedPrices = cleanedPrices;
        
        if (cleanedPrices.length < prices.length * 0.8) {
            validation.issues.push(`Too many invalid data points: ${prices.length - cleanedPrices.length} removed`);
        }

        return validation;
    }

    /**
     * Calculate price volatility
     * @param {Array<number>} prices - Price array
     * @returns {number} Volatility (standard deviation of returns)
     */
    calculateVolatility(prices) {
        if (prices.length < 2) return 0;

        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i-1]) / prices[i-1]);
        }

        const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
        
        return Math.sqrt(variance);
    }

    /**
     * Clear cache (useful for development)
     */
    clearCache() {
        this.cache.clear();
        console.log('CoinGecko API cache cleared');
    }
}

// Export for use in browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoinGeckoAPI;
} else if (typeof window !== 'undefined') {
    window.CoinGeckoAPI = CoinGeckoAPI;
}