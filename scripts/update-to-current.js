// Script to add the latest Bitcoin data from CoinGecko to existing dataset
const fs = require('fs');
const path = require('path');

// Latest CoinGecko data from API
const latestCoinGeckoData = {
  "prices": [
    [1735689600000, 93507.85874741491],
    [1735776000000, 94384.1761153871],
    [1735862400000, 96852.14681235075],
    [1735948800000, 98084.34279280754],
    [1736035200000, 98256.73876849933],
    [1736121600000, 98364.58946599838],
    [1736208000000, 102229.39453189743],
    [1736294400000, 96952.09886774956],
    [1736380800000, 95016.71440989176]
  ]
};

// Load existing dataset
const dataPath = path.join(__dirname, '..', 'src', 'data', 'btc-historical-data.json');
const existingData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log('📊 Current Dataset:');
console.log(`  - Records: ${existingData.prices.length}`);
console.log(`  - Period: ${existingData.metadata.period}`);
console.log(`  - Last date: ${new Date(existingData.prices[existingData.prices.length-1][0]).toISOString().split('T')[0]}`);
console.log(`  - Last price: $${existingData.prices[existingData.prices.length-1][1].toFixed(2)}`);

console.log('\n🚀 New CoinGecko Data:');
console.log(`  - New records: ${latestCoinGeckoData.prices.length}`);
console.log(`  - First new date: ${new Date(latestCoinGeckoData.prices[0][0]).toISOString().split('T')[0]}`);
console.log(`  - Last new date: ${new Date(latestCoinGeckoData.prices[latestCoinGeckoData.prices.length-1][0]).toISOString().split('T')[0]}`);
console.log(`  - Latest price: $${latestCoinGeckoData.prices[latestCoinGeckoData.prices.length-1][1].toFixed(2)}`);

// Check for overlaps and filter out duplicates
const existingTimestamps = new Set(existingData.prices.map(([timestamp, _]) => timestamp));
const newPrices = latestCoinGeckoData.prices.filter(([timestamp, _]) => !existingTimestamps.has(timestamp));

console.log(`\n🔍 Data Verification:`);
console.log(`  - Potential duplicates filtered: ${latestCoinGeckoData.prices.length - newPrices.length}`);
console.log(`  - Actual new records to add: ${newPrices.length}`);

if (newPrices.length === 0) {
    console.log('⚠️  No new data to add - dataset is already up to date!');
    process.exit(0);
}

// Merge the datasets
const updatedPrices = [...existingData.prices, ...newPrices];

// Update metadata
const firstTimestamp = updatedPrices[0][0];
const lastTimestamp = updatedPrices[updatedPrices.length - 1][0];
const firstDate = new Date(firstTimestamp).toISOString().split('T')[0];
const lastDate = new Date(lastTimestamp).toISOString().split('T')[0];

const updatedData = {
    ...existingData,
    metadata: {
        ...existingData.metadata,
        period: `2020-${new Date().getFullYear()}`,
        to_timestamp: Math.floor(lastTimestamp / 1000),
        data_points: updatedPrices.length,
        fetched_at: new Date().toISOString().split('T')[0],
        sources: [
            "Historical data 2020-2023",
            "CoinGecko API 2024",
            `CoinGecko API ${new Date().toISOString().split('T')[0]} update`
        ],
        note: "Complete dataset with latest daily updates from CoinGecko API"
    },
    prices: updatedPrices
};

// Price analysis
const allPrices = updatedData.prices.map(([_, price]) => price);
const minPrice = Math.min(...allPrices);
const maxPrice = Math.max(...allPrices);
const startPrice = allPrices[0];
const endPrice = allPrices[allPrices.length - 1];

console.log(`\n💰 Updated Price Analysis:`);
console.log(`  - Start price (2020): $${startPrice.toFixed(2)}`);
console.log(`  - Current price: $${endPrice.toFixed(2)}`);
console.log(`  - Min price (all-time): $${minPrice.toFixed(2)}`);
console.log(`  - Max price (all-time): $${maxPrice.toFixed(2)}`);
console.log(`  - Total return since 2020: ${(((endPrice - startPrice) / startPrice) * 100).toFixed(2)}%`);
console.log(`  - All-time high gain: ${(((maxPrice - minPrice) / minPrice) * 100).toFixed(2)}%`);

// Save updated dataset
fs.writeFileSync(dataPath, JSON.stringify(updatedData, null, 2));

console.log(`\n✅ Dataset updated successfully!`);
console.log(`📈 Total records: ${updatedData.metadata.data_points}`);
console.log(`📅 Coverage: ${firstDate} to ${lastDate}`);
console.log(`💾 Saved to: ${dataPath}`);
console.log(`🎯 Ready for backtesting with the most current Bitcoin data!`);
