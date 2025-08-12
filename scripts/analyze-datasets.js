#!/usr/bin/env node

/**
 * Analyze both BTC and Solana datasets for missing values and chronological order
 */

const fs = require('fs');
const path = require('path');

function analyzeDataset(filename, name) {
  console.log(`\n📊 Analyzing ${name} dataset...`);
  const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const prices = data.prices;
  
  console.log(`Total data points: ${prices.length}`);
  
  // Check for missing values (null, undefined, NaN, empty)
  const missingValues = [];
  const invalidPrices = [];
  
  for (let i = 0; i < prices.length; i++) {
    const [timestamp, price] = prices[i];
    
    // Check timestamp
    if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
      missingValues.push({ index: i, issue: 'invalid timestamp', data: prices[i] });
    }
    
    // Check price
    if (price === null || price === undefined || isNaN(price) || price <= 0) {
      invalidPrices.push({ index: i, issue: 'invalid price', data: prices[i] });
    }
  }
  
  // Check chronological order
  const orderIssues = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i][0] <= prices[i-1][0]) {
      orderIssues.push({ 
        index: i, 
        issue: 'out of order', 
        prev: new Date(prices[i-1][0]).toISOString().split('T')[0],
        curr: new Date(prices[i][0]).toISOString().split('T')[0]
      });
    }
  }
  
  // Check for large gaps (more than 2 days)
  const largeGaps = [];
  for (let i = 1; i < prices.length; i++) {
    const gap = (prices[i][0] - prices[i-1][0]) / (1000 * 60 * 60 * 24);
    if (gap > 2) {
      largeGaps.push({
        index: i,
        gap: Math.round(gap),
        from: new Date(prices[i-1][0]).toISOString().split('T')[0],
        to: new Date(prices[i][0]).toISOString().split('T')[0]
      });
    }
  }
  
  console.log(`❌ Missing/invalid timestamps: ${missingValues.length}`);
  console.log(`❌ Missing/invalid prices: ${invalidPrices.length}`);
  console.log(`❌ Chronological order issues: ${orderIssues.length}`);
  console.log(`⚠️  Large gaps (>2 days): ${largeGaps.length}`);
  
  if (missingValues.length > 0) {
    console.log('Missing timestamp samples:', missingValues.slice(0, 3));
  }
  if (invalidPrices.length > 0) {
    console.log('Invalid price samples:', invalidPrices.slice(0, 3));
  }
  if (orderIssues.length > 0) {
    console.log('Order issue samples:', orderIssues.slice(0, 3));
  }
  if (largeGaps.length > 0) {
    console.log('Large gap samples:', largeGaps.slice(0, 3));
  }
  
  return {
    filename,
    name,
    totalPoints: prices.length,
    missingValues,
    invalidPrices,
    orderIssues,
    largeGaps,
    needsCleaning: missingValues.length > 0 || invalidPrices.length > 0 || orderIssues.length > 0
  };
}

function cleanDataset(analysis) {
  if (!analysis.needsCleaning) {
    console.log(`✅ ${analysis.name} dataset is already clean`);
    return false;
  }
  
  console.log(`\n🧹 Cleaning ${analysis.name} dataset...`);
  
  const data = JSON.parse(fs.readFileSync(analysis.filename, 'utf8'));
  let prices = data.prices;
  const originalLength = prices.length;
  
  // Remove invalid entries
  prices = prices.filter((entry, index) => {
    const [timestamp, price] = entry;
    
    // Check for valid timestamp and price
    if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
      console.log(`Removing invalid timestamp at index ${index}:`, entry);
      return false;
    }
    
    if (price === null || price === undefined || isNaN(price) || price <= 0) {
      console.log(`Removing invalid price at index ${index}:`, entry);
      return false;
    }
    
    return true;
  });
  
  // Sort by timestamp to ensure chronological order
  prices.sort((a, b) => a[0] - b[0]);
  
  // Remove duplicates (same timestamp)
  const uniquePrices = [];
  for (let i = 0; i < prices.length; i++) {
    if (i === 0 || prices[i][0] !== prices[i-1][0]) {
      uniquePrices.push(prices[i]);
    } else {
      console.log(`Removing duplicate timestamp:`, prices[i]);
    }
  }
  
  // Update the data
  const cleanedData = {
    ...data,
    metadata: {
      ...data.metadata,
      data_points: uniquePrices.length,
      cleaned_at: new Date().toISOString(),
      cleaning_info: `Removed ${originalLength - uniquePrices.length} invalid/duplicate entries, sorted chronologically`
    },
    prices: uniquePrices
  };
  
  // Write the cleaned data
  fs.writeFileSync(analysis.filename, JSON.stringify(cleanedData, null, 2));
  
  console.log(`✅ Cleaned ${analysis.name}:`);
  console.log(`  - Original: ${originalLength} points`);
  console.log(`  - Cleaned: ${uniquePrices.length} points`);
  console.log(`  - Removed: ${originalLength - uniquePrices.length} points`);
  
  return true;
}

// Main execution
console.log('🔍 Analyzing both datasets for data quality issues...');

// Analyze both datasets
const btcAnalysis = analyzeDataset('./src/data/btc-historical-data.json', 'Bitcoin');
const solAnalysis = analyzeDataset('./src/data/sol-historical-data.json', 'Solana');

console.log(`\n📋 Summary:`);
console.log(`BTC needs cleaning: ${btcAnalysis.needsCleaning}`);
console.log(`SOL needs cleaning: ${solAnalysis.needsCleaning}`);

// Clean datasets if needed
let changesMade = false;
changesMade |= cleanDataset(btcAnalysis);
changesMade |= cleanDataset(solAnalysis);

if (changesMade) {
  console.log('\n✅ Dataset cleaning completed. Re-analyzing...');
  
  // Re-analyze to confirm
  const btcRecheck = analyzeDataset('./src/data/btc-historical-data.json', 'Bitcoin (after cleaning)');
  const solRecheck = analyzeDataset('./src/data/sol-historical-data.json', 'Solana (after cleaning)');
  
  console.log('\n🎉 Final status:');
  console.log(`BTC clean: ${!btcRecheck.needsCleaning}`);
  console.log(`SOL clean: ${!solRecheck.needsCleaning}`);
} else {
  console.log('\n✅ All datasets are already clean and properly ordered!');
}
