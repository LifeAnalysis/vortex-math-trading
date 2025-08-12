# Vortex Math Trading System

A comprehensive backtesting system that applies vortex mathematics principles to cryptocurrency trading analysis.

## Overview

This system implements Marko Rodin's vortex mathematics concepts for trading strategy development, including:

- **Digital Root Analysis**: Modular arithmetic (n mod 9) for price pattern recognition
- **Sequence Generation**: Multiple sequence types (×2, ×3, custom multipliers)
- **Base Variations**: Comparison between base-8, base-10 numerical systems
- **Tesla's 3-6-9 Patterns**: Special significance analysis and oscillation detection
- **Statistical Validation**: Performance testing against random entry strategies
- **Hybrid Strategies**: Integration with Fibonacci and technical indicators

## ⚠️ Important Disclaimer

Vortex mathematics is considered pseudoscientific by mainstream mathematics and lacks empirical validation. This system is for **educational and research purposes only**. The mathematical critiques and limitations are acknowledged and discussed within the implementation.

## Quick Start

1. **Development Server**: `npm run dev` - Starts local server at http://localhost:3000
2. **Run Tests**: `npm test` - Execute the test suite
3. **Open Browser**: Navigate to http://localhost:3000 to use the interface

## Project Structure

```
vortex/
├── src/
│   ├── core/          # Core vortex math functions
│   ├── data/          # Data fetching and processing
│   ├── strategies/    # Trading strategy implementations
│   └── ui/            # User interface components
├── tests/             # Test suite
├── public/            # Static web assets
├── assets/            # Additional resources
└── docs/              # Documentation and implementation plans
```

## Features

### Mathematical Implementation
- **Modular Arithmetic**: Proper n mod 9 calculations with 0→9 conversion
- **Multiple Sequences**: Standard doubling, tripling, and custom multiplier sequences
- **Cross-Base Analysis**: Compare patterns across different numerical bases
- **Pattern Detection**: Automated recognition of vortex cycles and Tesla patterns

### Trading Analysis
- **CoinGecko Integration**: Historical cryptocurrency data fetching
- **Signal Generation**: Multiple vortex-based entry/exit strategies
- **Backtesting Engine**: Complete P&L analysis with performance metrics
- **Statistical Validation**: Comparison with random strategies and overfitting prevention

### User Interface
- **Interactive Charts**: Visualize price data with vortex pattern overlays
- **Strategy Configuration**: Adjust parameters for different approaches
- **Results Dashboard**: Comprehensive performance metrics and analysis
- **Educational Content**: Mathematical explanations and critiques

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Data Source**: CoinGecko API for cryptocurrency data
- **Charts**: Chart.js for visualization
- **Testing**: Custom JavaScript testing framework
- **Deployment**: Static website (no backend required)

## Development

The project follows a test-driven development approach with comprehensive coverage of all mathematical functions. Each vortex math implementation includes both the calculation and its mathematical critique.

## License

MIT License - See LICENSE file for details.

---

*"If you only knew the magnificence of the 3, 6, and 9, then you would have the key to the universe."* - Nikola Tesla

*Note: This quote is often attributed to Tesla but lacks historical verification. The system explores these concepts while maintaining scientific skepticism.*