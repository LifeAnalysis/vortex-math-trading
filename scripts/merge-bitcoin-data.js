// Script to merge 2020-2023 historical data with 2024 CoinGecko data
const fs = require('fs');
const path = require('path');

// Load both datasets
const historicalPath = path.join(__dirname, '..', 'src', 'data', 'btc-historical-data-backup.json');
const coingeckoPath = path.join(__dirname, '..', 'src', 'data', 'btc-2024-data.json');

const historicalData = JSON.parse(fs.readFileSync(historicalPath, 'utf8'));
const coingeckoData = JSON.parse(fs.readFileSync(coingeckoPath, 'utf8'));

console.log('📊 Historical Data (2020-2023):');
console.log(`  - Records: ${historicalData.prices.length}`);
console.log(`  - Period: ${historicalData.metadata.period}`);
console.log(`  - Date range: ${new Date(historicalData.prices[0][0]).toISOString().split('T')[0]} to ${new Date(historicalData.prices[historicalData.prices.length-1][0]).toISOString().split('T')[0]}`);

console.log('\n🚀 CoinGecko Data (2024):');
console.log(`  - Records: ${coingeckoData.data.length}`);
console.log(`  - Period: ${coingeckoData.metadata.period}`);
console.log(`  - Date range: ${coingeckoData.data[0].date} to ${coingeckoData.data[coingeckoData.data.length-1].date}`);

// Convert CoinGecko data to historical format for consistency
const convertedCoinGeckoData = coingeckoData.data.map(item => [
    item.timestamp * 1000, // Convert seconds to milliseconds
    item.price
]);

// Merge the datasets - historical first, then CoinGecko
const mergedPrices = [
    ...historicalData.prices,
    ...convertedCoinGeckoData
];

// Create merged dataset with updated metadata
const mergedData = {
    metadata: {
        coin: "bitcoin",
        vs_currency: "usd",
        period: "2020-2024",
        from_timestamp: historicalData.metadata.from_timestamp,
        to_timestamp: coingeckoData.metadata.to_timestamp,
        interval: "daily",
        data_points: mergedPrices.length,
        fetched_at: new Date().toISOString().split('T')[0],
        sources: [
            "Historical data 2020-2023",
            "CoinGecko API 2024"
        ],
        note: "Merged dataset combining historical data with fresh CoinGecko data"
    },
    prices: mergedPrices
};

// Verify data integrity
console.log('\n🔍 Data Verification:');
console.log(`  - Total merged records: ${mergedData.prices.length}`);
console.log(`  - Expected total: ${historicalData.prices.length + coingeckoData.data.length}`);

// Check for date continuity
const lastHistoricalDate = new Date(historicalData.prices[historicalData.prices.length-1][0]);
const firstCoinGeckoDate = new Date(convertedCoinGeckoData[0][0]);
const dayGap = (firstCoinGeckoDate - lastHistoricalDate) / (1000 * 60 * 60 * 24);

console.log(`  - Date gap between datasets: ${dayGap.toFixed(1)} days`);
console.log(`  - Last historical: ${lastHistoricalDate.toISOString().split('T')[0]}`);
console.log(`  - First CoinGecko: ${firstCoinGeckoDate.toISOString().split('T')[0]}`);

// Price range analysis
const allPrices = mergedData.prices.map(([_, price]) => price);
const minPrice = Math.min(...allPrices);
const maxPrice = Math.max(...allPrices);
const startPrice = allPrices[0];
const endPrice = allPrices[allPrices.length - 1];

console.log(`\n💰 Price Analysis:`);
console.log(`  - Start price (2020): $${startPrice.toFixed(2)}`);
console.log(`  - End price (2024): $${endPrice.toFixed(2)}`);
console.log(`  - Min price: $${minPrice.toFixed(2)}`);
console.log(`  - Max price: $${maxPrice.toFixed(2)}`);
console.log(`  - Total return: ${(((endPrice - startPrice) / startPrice) * 100).toFixed(2)}%`);
console.log(`  - Max gain from lowest: ${(((maxPrice - minPrice) / minPrice) * 100).toFixed(2)}%`);

// Save merged dataset
const outputPath = path.join(__dirname, '..', 'src', 'data', 'btc-historical-data.json');
fs.writeFileSync(outputPath, JSON.stringify(mergedData, null, 2));

console.log(`\n✅ Merged dataset saved to: ${outputPath}`);
console.log(`📈 Complete Bitcoin dataset: 2020-2024 (${mergedData.metadata.data_points} days)`);
console.log(`🎯 Ready for comprehensive backtesting across ${Math.round(mergedData.metadata.data_points / 365.25 * 10) / 10} years of data!`);
