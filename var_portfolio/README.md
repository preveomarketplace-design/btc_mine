# Market Risk Portfolio Analytics

A comprehensive market risk analytics toolkit demonstrating expertise in quantitative risk management for agricultural commodities and FX portfolios.

## Overview

This portfolio showcases key competencies for the **Market Risk Senior Analyst** position at **COFCO International**, including:

- **Value-at-Risk (VaR)** calculation using multiple methodologies
- **Options Greeks** analysis for commodity derivatives
- **Scenario Analysis** and stress testing
- **Risk Reporting** for senior management
- Understanding of **agricultural commodity markets** and **FX hedging**

## Features

### 1. Value-at-Risk Engine (`var/var_engine.py`)

- **Historical VaR**: Full revaluation using historical scenarios
- **Parametric VaR**: Variance-covariance approach assuming normal distribution
- **Monte Carlo VaR**: Simulation-based with correlated random returns
- **Component VaR**: Risk attribution to identify top contributors
- **Incremental VaR**: Marginal risk impact of position changes
- **VaR Backtesting**: Validate model accuracy with breach analysis

### 2. Options Greeks Calculator (`options/greeks.py`)

- Black-Scholes pricing for European options
- Complete Greeks suite:
  - **Delta**: Price sensitivity to underlying
  - **Gamma**: Rate of change of delta
  - **Vega**: Volatility sensitivity
  - **Theta**: Time decay
  - **Rho**: Interest rate sensitivity
- Portfolio-level Greeks aggregation
- Delta hedging calculations
- Implied volatility solver

### 3. Scenario Analysis (`scenarios/stress_testing.py`)

- **Historical Scenarios**:
  - 2008 Financial Crisis
  - 2020 COVID Crash
  - 2022 Ukraine War (grain supply shock)
  - 2011 Commodity Super-cycle
  - China Demand Shock
  - El Niño Weather Event
- **Sensitivity Analysis**: P&L impact across shock ranges
- **Correlation Stress Test**: Portfolio behavior under correlation breakdown
- **Liquidity Stress Test**: Time to liquidate positions
- **Reverse Stress Test**: Find scenarios that produce specific losses

### 4. Market Data Generator (`data/market_data.py`)

Generates realistic synthetic data for:

**Agricultural Commodities:**
- Corn, Soybean, Wheat
- Sugar, Palm Oil
- Soybean Oil, Soybean Meal

**FX Pairs (APAC Focus):**
- USD/CNY, USD/SGD, USD/BRL
- USD/MYR, USD/INR, EUR/USD, USD/ARS

### 5. Risk Reporting Dashboard (`reporting/risk_dashboard.py`)

- Executive summary for senior management
- Position reports by desk and instrument type
- VaR attribution analysis
- Options Greeks reports with risk flags
- Comprehensive daily risk reports

## Installation

### Requirements

```bash
pip install numpy pandas scipy
```

### Optional (for visualizations)

```bash
pip install matplotlib seaborn
```

## Usage

### Run Full Demo

```bash
# Navigate to the var_portfolio directory
cd var_portfolio
python main.py
```

Or from parent directory:
```bash
python var_portfolio/main.py
```

### Individual Modules

```python
# Market Data Generation
from data.market_data import MarketDataGenerator
generator = MarketDataGenerator()
commodity_prices = generator.generate_commodity_data(days=252)
portfolio = generator.generate_portfolio_positions(20)

# VaR Calculations
from var.var_engine import VaREngine
var_engine = VaREngine(confidence_level=0.99)
var_results = var_engine.calculate_all_var(returns, weights, portfolio_value)

# Options Greeks
from options.greeks import OptionsGreeksCalculator
calculator = OptionsGreeksCalculator()
greeks = calculator.calculate_all_greeks(S=1350, K=1400, T=0.25, r=0.05, sigma=0.22, option_type='CALL')

# Scenario Analysis
from scenarios.stress_testing import ScenarioAnalyzer
analyzer = ScenarioAnalyzer()
scenario_results = analyzer.run_historical_scenarios(portfolio, current_prices)

# Risk Reporting
from reporting.risk_dashboard import RiskDashboard
dashboard = RiskDashboard()
report = dashboard.generate_daily_risk_report(var_results, portfolio_value, positions)
```

## Project Structure

```
var_portfolio/
├── main.py                 # Main demo script
├── README.md              # This file
├── requirements.txt       # Python dependencies
├── data/
│   ├── __init__.py
│   └── market_data.py     # Market data generators
├── var/
│   ├── __init__.py
│   └── var_engine.py      # VaR calculation engine
├── options/
│   ├── __init__.py
│   └── greeks.py          # Options Greeks calculator
├── scenarios/
│   ├── __init__.py
│   └── stress_testing.py  # Scenario analysis
├── reporting/
│   ├── __init__.py
│   └── risk_dashboard.py  # Risk reporting
└── utils/
    └── __init__.py        # Utility functions
```

## Key Metrics Demonstrated

| Metric | Description |
|--------|-------------|
| 1-Day VaR (99%) | Maximum expected loss at 99% confidence |
| 10-Day VaR | Regulatory capital requirement period |
| Expected Shortfall | Average loss beyond VaR threshold |
| Component VaR | Risk contribution by asset |
| Portfolio Delta | Directional exposure to underlying |
| Portfolio Vega | Volatility exposure |
| Scenario P&L | Impact under stress scenarios |

## Technical Skills Showcased

- **Python**: NumPy, Pandas, SciPy
- **Quantitative Finance**: Black-Scholes, GBM, Copulas
- **Risk Metrics**: VaR, ES, Greeks, Correlation analysis
- **Market Knowledge**: Agricultural commodities, FX markets
- **Reporting**: Management-ready risk reports

## Alignment with COFCO International Requirements

This portfolio directly addresses the job requirements:

| Requirement | Demonstration |
|-------------|---------------|
| VaR understanding and reconciliation | Multiple VaR methodologies with attribution |
| Options and Greeks modeling | Complete Greeks suite with hedging |
| Market understanding | COFCO-relevant commodities and FX pairs |
| Scenario analysis | Historical and hypothetical stress tests |
| Risk reporting | Executive summaries and detailed reports |
| Python proficiency | Clean, documented, modular code |
| Proactive approach | Risk flags and recommendations |

## Author

Market Risk Analytics Portfolio for COFCO International Application

## License

This portfolio is created for demonstration purposes for job application.
