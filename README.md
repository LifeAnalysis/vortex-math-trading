# Vortex Math Trading System

A research tool for exploring vortex mathematics principles in cryptocurrency trading analysis.

## Overview

This system implements Marko Rodin's vortex mathematics concepts for trading strategy backtesting, including:

- **Digital Root Analysis**: Using modular arithmetic (n mod 9) for price pattern recognition
- **Vortex Sequences**: Multiple sequence generators (×2, ×3, custom multipliers) 
- **Tesla's 3-6-9 Patterns**: Special significance detection and oscillation analysis
- **Base Variations**: Cross-base comparison (base-8 vs base-10)
- **Backtesting Engine**: Complete strategy validation with statistical analysis

## Mathematical Foundation

Vortex math leverages modular arithmetic, specifically:
- Digital root ≡ n mod 9 (with 0→9 conversion)
- Doubling sequence: a_{k+1} = (2 × a_k) mod 9
- Creates cyclic group of length 6: 1→2→4→8→7→5→1

## Features

- 🧮 **Advanced Mathematical Functions**: Modular arithmetic, multiple sequence types
- 📊 **Real-Time Data**: CoinGecko API integration for historical cryptocurrency data
- 📈 **Multiple Strategies**: Standard doubling, tripling, hybrid Fibonacci-vortex
- 🔬 **Statistical Validation**: Performance comparison against random strategies
- 🖥️ **Modern UI**: Clean, responsive interface for strategy configuration
- 📋 **Comprehensive Analysis**: P&L, win/loss ratios, drawdown metrics

## Project Structure

```
vortex/
├── src/
│   ├── core/          # Core vortex math functions
│   ├── ui/            # Frontend interface
│   ├── data/          # Data fetching and processing
│   └── strategies/    # Trading strategy implementations
├── tests/             # Unit and integration tests
├── public/            # Static assets and HTML
├── assets/            # Images, styles, charts
└── docs/              # Documentation and planning
```

## Getting Started

1. Open `public/index.html` in your browser
2. Configure strategy parameters
3. Fetch historical data (BTC 2020-2023)
4. Run backtesting analysis
5. Review results and statistical validation

## Disclaimer

⚠️ **Important**: Vortex math is considered speculative and lacks scientific rigor. This tool is for research and educational purposes only. Mathematical critics note it's based on "numeric pareidolia" and arbitrary base-10 patterns. Always validate results against proven trading methods and use appropriate risk management.

## Development Status

Current Phase: Core mathematical implementation
- ✅ Project setup and documentation
- 🔄 Advanced vortex math functions
- ⏳ UI development
- ⏳ Data integration
- ⏳ Strategy implementation
- ⏳ Backtesting engine