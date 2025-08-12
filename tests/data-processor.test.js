/**
 * Test suite for Data Processor
 * Tests data loading, processing, and validation
 */

const path = require('path');
const DataProcessor = require(path.join(__dirname, '../src/data/data-processor.js'));

describe('DataProcessor', () => {

    describe('Raw Data Processing', () => {
        it('should process raw CoinGecko data correctly', () => {
            const rawData = {
                metadata: {
                    coin: 'bitcoin',
                    period: '2020-2023'
                },
                prices: [
                    [1577836800000, 7194.89],
                    [1577923200000, 7200.17],
                    [1578009600000, 6985.47]
                ]
            };
            
            const processed = DataProcessor.processRawData(rawData);
            
            expect(processed.metadata.totalRecords).toBe(3);
            expect(processed.dailyData).toHaveLength(3);
            expect(processed.dailyData[0].price).toBe(7194.89);
            expect(processed.dailyData[0].digitalRoot).toBe(4); // 7194 -> 4
            expect(processed.statistics).toBeDefined();
        });
        
        it('should calculate digital roots correctly for price data', () => {
            const rawData = {
                metadata: { coin: 'test' },
                prices: [
                    [1577836800000, 1000], // Digital root: 1
                    [1577923200000, 2000], // Digital root: 2
                    [1578009600000, 9999]  // Digital root: 9
                ]
            };
            
            const processed = DataProcessor.processRawData(rawData);
            
            expect(processed.dailyData[0].digitalRoot).toBe(1);
            expect(processed.dailyData[1].digitalRoot).toBe(2);
            expect(processed.dailyData[2].digitalRoot).toBe(9);
        });
        
        it('should calculate price changes correctly', () => {
            const rawData = {
                metadata: { coin: 'test' },
                prices: [
                    [1577836800000, 1000],
                    [1577923200000, 1100],
                    [1578009600000, 1050]
                ]
            };
            
            const processed = DataProcessor.processRawData(rawData);
            
            expect(processed.dailyData[0].priceChange).toBe(0); // First day
            expect(processed.dailyData[1].priceChange).toBe(100); // 1100 - 1000
            expect(processed.dailyData[2].priceChange).toBe(-50); // 1050 - 1100
            expect(processed.dailyData[1].priceChangePercent).toBe(10); // 100/1000 * 100
        });
    });

    describe('Statistical Calculations', () => {
        it('should calculate digital root frequency distribution', () => {
            const dailyData = [
                { digitalRoot: 1 },
                { digitalRoot: 1 },
                { digitalRoot: 2 },
                { digitalRoot: 9 }
            ];
            
            const stats = DataProcessor.calculateStatistics(dailyData);
            
            expect(stats.digitalRootDistribution.frequencies[1]).toBe(2);
            expect(stats.digitalRootDistribution.frequencies[2]).toBe(1);
            expect(stats.digitalRootDistribution.frequencies[9]).toBe(1);
            expect(stats.digitalRootDistribution.percentages[1]).toBe('50.00');
        });
        
        it('should calculate vortex metrics correctly', () => {
            const dailyData = [
                { digitalRoot: 1, isDoublingSequence: true, isTeslaNumber: false },
                { digitalRoot: 2, isDoublingSequence: true, isTeslaNumber: false },
                { digitalRoot: 3, isDoublingSequence: false, isTeslaNumber: true },
                { digitalRoot: 9, isDoublingSequence: false, isTeslaNumber: true }
            ];
            
            const stats = DataProcessor.calculateStatistics(dailyData);
            
            expect(stats.vortexMetrics.doublingSequenceOccurrences).toBe(2);
            expect(stats.vortexMetrics.doublingSequencePercentage).toBe('50.00');
            expect(stats.vortexMetrics.teslaNumberOccurrences).toBe(2);
            expect(stats.vortexMetrics.teslaNumberPercentage).toBe('50.00');
        });
        
        it('should calculate price statistics correctly', () => {
            const dailyData = [
                { price: 1000 },
                { price: 2000 },
                { price: 3000 }
            ];
            
            const stats = DataProcessor.calculateStatistics(dailyData);
            
            expect(stats.priceRange.min).toBe(1000);
            expect(stats.priceRange.max).toBe(3000);
            expect(stats.priceRange.average).toBe(2000);
            expect(stats.priceRange.standardDeviation).toBeCloseTo(816.5, 1);
        });
    });

    describe('Data Validation', () => {
        it('should validate good quality data', () => {
            const processedData = {
                dailyData: [
                    { 
                        timestamp: 1577836800000, 
                        price: 1000, 
                        priceChangePercent: 0,
                        date: '2020-01-01' 
                    },
                    { 
                        timestamp: 1577923200000, 
                        price: 1050, 
                        priceChangePercent: 5,
                        date: '2020-01-02' 
                    }
                ],
                statistics: {
                    digitalRootDistribution: {
                        frequencies: { 1: 1, 2: 1, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }
                    }
                }
            };
            
            const validation = DataProcessor.validateData(processedData);
            
            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
            // The test data has uneven distribution which will trigger warnings
            expect(validation.summary.dataQuality).toContain('Issues detected');
        });
        
        it('should detect data gaps', () => {
            const processedData = {
                dailyData: [
                    { 
                        timestamp: 1577836800000, 
                        price: 1000, 
                        priceChangePercent: 0,
                        date: '2020-01-01' 
                    },
                    { 
                        timestamp: 1578096000000, // 3 days later
                        price: 1050, 
                        priceChangePercent: 5,
                        date: '2020-01-04' 
                    }
                ],
                statistics: {
                    digitalRootDistribution: {
                        frequencies: { 1: 1, 2: 1, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }
                    }
                }
            };
            
            const validation = DataProcessor.validateData(processedData);
            
            expect(validation.valid).toBe(true);
            expect(validation.warnings.length).toBeGreaterThan(0);
            expect(validation.warnings[0]).toContain('Data gap detected');
        });
        
        it('should detect large price changes', () => {
            const processedData = {
                dailyData: [
                    { 
                        timestamp: 1577836800000, 
                        price: 1000, 
                        priceChangePercent: 0,
                        date: '2020-01-01' 
                    },
                    { 
                        timestamp: 1577923200000,
                        price: 1600, 
                        priceChangePercent: 60, // Large change
                        date: '2020-01-02' 
                    }
                ],
                statistics: {
                    digitalRootDistribution: {
                        frequencies: { 1: 1, 2: 1, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }
                    }
                }
            };
            
            const validation = DataProcessor.validateData(processedData);
            
            expect(validation.valid).toBe(true);
            expect(validation.warnings.some(w => w.includes('price changes > 50%'))).toBe(true);
        });
        
        it('should handle empty data', () => {
            const processedData = {
                dailyData: []
            };
            
            const validation = DataProcessor.validateData(processedData);
            
            expect(validation.valid).toBe(false);
            expect(validation.errors).toContain('No daily data found');
        });
    });

    describe('CSV Export', () => {
        it('should export data to CSV format correctly', () => {
            const processedData = {
                dailyData: [
                    {
                        date: '2020-01-01',
                        price: 1000.50,
                        digitalRoot: 1,
                        vortexSequencePosition: 0,
                        isDoublingSequence: true,
                        isTeslaNumber: false,
                        priceChange: 0,
                        priceChangePercent: 0
                    },
                    {
                        date: '2020-01-02',
                        price: 1050.75,
                        digitalRoot: 2,
                        vortexSequencePosition: 1,
                        isDoublingSequence: true,
                        isTeslaNumber: false,
                        priceChange: 50.25,
                        priceChangePercent: 5.02
                    }
                ]
            };
            
            const csv = DataProcessor.exportToCSV(processedData);
            
            expect(csv).toContain('Date,Price,Digital_Root');
            expect(csv).toContain('2020-01-01,1000.50,1,0,Yes,No,0.00,0.00');
            expect(csv).toContain('2020-01-02,1050.75,2,1,Yes,No,50.25,5.02');
        });
        
        it('should handle Tesla numbers in CSV export', () => {
            const processedData = {
                dailyData: [
                    {
                        date: '2020-01-01',
                        price: 3000,
                        digitalRoot: 3,
                        vortexSequencePosition: -1,
                        isDoublingSequence: false,
                        isTeslaNumber: true,
                        priceChange: 0,
                        priceChangePercent: 0
                    }
                ]
            };
            
            const csv = DataProcessor.exportToCSV(processedData);
            
            expect(csv).toContain('2020-01-01,3000.00,3,-1,No,Yes,0.00,0.00');
        });
    });

    describe('Sequence Position Detection', () => {
        it('should correctly identify doubling sequence positions', () => {
            expect(DataProcessor.getSequencePosition(1)).toBe(0);
            expect(DataProcessor.getSequencePosition(2)).toBe(1);
            expect(DataProcessor.getSequencePosition(4)).toBe(2);
            expect(DataProcessor.getSequencePosition(8)).toBe(3);
            expect(DataProcessor.getSequencePosition(7)).toBe(4);
            expect(DataProcessor.getSequencePosition(5)).toBe(5);
            expect(DataProcessor.getSequencePosition(3)).toBe(-1); // Not in sequence
            expect(DataProcessor.getSequencePosition(6)).toBe(-1); // Not in sequence
            expect(DataProcessor.getSequencePosition(9)).toBe(-1); // Not in sequence
        });
    });

    describe('Error Handling', () => {
        it('should throw error for invalid data format', () => {
            const invalidData = {
                metadata: { coin: 'test' }
                // Missing prices array
            };
            
            expect(() => {
                DataProcessor.processRawData(invalidData);
            }).toThrow('Invalid data format: prices array not found');
        });
        
        it('should handle empty prices array', () => {
            const emptyData = {
                metadata: { coin: 'test' },
                prices: []
            };
            
            const processed = DataProcessor.processRawData(emptyData);
            
            expect(processed.dailyData).toHaveLength(0);
            expect(processed.metadata.totalRecords).toBe(0);
        });
    });
});
