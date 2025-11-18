#!/usr/bin/env python3
"""
Market Risk Portfolio - Main Demo Script
Demonstrates comprehensive market risk analytics for agricultural commodities and FX.

This portfolio showcases skills relevant to:
- COFCO International Market Risk Senior Analyst position
- VaR calculation and decomposition
- Options Greeks analysis
- Scenario analysis and stress testing
- Risk reporting for management

Author: Market Risk Analytics
"""

import sys
import numpy as np
import pandas as pd
from datetime import datetime

# Add package to path
sys.path.insert(0, '/home/user/var_portfolio')

from data.market_data import MarketDataGenerator
from var.var_engine import VaREngine
from options.greeks import OptionsGreeksCalculator
from scenarios.stress_testing import ScenarioAnalyzer
from reporting.risk_dashboard import RiskDashboard


def print_section_header(title: str):
    """Print formatted section header."""
    print("\n" + "=" * 70)
    print(f" {title}")
    print("=" * 70)


def demo_market_data():
    """Demonstrate market data generation for commodities and FX."""
    print_section_header("1. MARKET DATA GENERATION")

    generator = MarketDataGenerator(seed=42)

    # Generate commodity prices
    commodity_prices = generator.generate_commodity_data(days=504)  # 2 years
    fx_rates = generator.generate_fx_data(days=504)

    print("\nAgricultural Commodities Covered:")
    print("-" * 40)
    for commodity, params in generator.commodities.items():
        print(f"  {commodity}: ${params['price']} {params['unit']} (Vol: {params['vol']*100:.0f}%)")

    print("\nFX Pairs Covered (APAC Focus):")
    print("-" * 40)
    for pair, params in generator.fx_pairs.items():
        print(f"  {pair}: {params['rate']} (Vol: {params['vol']*100:.0f}%)")

    print("\nSample Price Data (Last 5 Days):")
    print("-" * 40)
    print(commodity_prices.tail().to_string())

    # Generate portfolio
    portfolio = generator.generate_portfolio_positions(25)
    options_portfolio = generator.generate_options_portfolio(15)

    print(f"\nGenerated {len(portfolio)} physical/futures positions")
    print(f"Generated {len(options_portfolio)} options positions")

    return generator, commodity_prices, fx_rates, portfolio, options_portfolio


def demo_var_calculations(generator, returns, portfolio_value):
    """Demonstrate VaR calculation methodologies."""
    print_section_header("2. VALUE-AT-RISK ANALYSIS")

    # Portfolio weights
    n_assets = len(returns.columns)
    weights = np.random.dirichlet(np.ones(n_assets))

    # Initialize VaR engine
    var_engine = VaREngine(confidence_level=0.99)

    # Calculate all VaR methods
    print("\nVaR Comparison (99% Confidence Level):")
    print("-" * 70)

    # 1-day VaR
    var_results_1d = var_engine.calculate_all_var(
        returns, weights, portfolio_value, holding_period=1
    )

    print("\n1-Day Holding Period:")
    for _, row in var_results_1d.iterrows():
        print(f"  {row['Method']:<15} VaR: ${row['VaR_Dollar']:>12,.0f}  "
              f"ES: ${row['ES_Dollar']:>12,.0f}")

    # 10-day VaR (regulatory)
    var_results_10d = var_engine.calculate_all_var(
        returns, weights, portfolio_value, holding_period=10
    )

    print("\n10-Day Holding Period (Regulatory):")
    for _, row in var_results_10d.iterrows():
        print(f"  {row['Method']:<15} VaR: ${row['VaR_Dollar']:>12,.0f}  "
              f"ES: ${row['ES_Dollar']:>12,.0f}")

    # Component VaR
    print("\nComponent VaR Analysis - Risk Attribution:")
    print("-" * 70)
    component_var = var_engine.component_var(returns, weights, portfolio_value)
    print(component_var.to_string(index=False))

    # VaR Backtesting
    print("\nVaR Backtesting (252-day rolling window):")
    print("-" * 70)
    backtest = var_engine.var_backtesting(returns, weights, window=252)

    return var_engine, var_results_1d, component_var, weights


def demo_options_greeks(options_portfolio):
    """Demonstrate options Greeks calculations."""
    print_section_header("3. OPTIONS GREEKS ANALYSIS")

    calculator = OptionsGreeksCalculator()

    # Calculate portfolio Greeks
    greeks_df, portfolio_summary = calculator.portfolio_greeks(options_portfolio)

    print("\nPortfolio Greeks Summary:")
    print("-" * 70)
    print(f"  Total Portfolio Value: ${portfolio_summary['Total_Value']:>15,.0f}")
    print(f"  Total Delta:           {portfolio_summary['Total_Delta']:>15,.0f}")
    print(f"  Total Gamma:           {portfolio_summary['Total_Gamma']:>15,.2f}")
    print(f"  Total Vega:            ${portfolio_summary['Total_Vega']:>14,.0f}")
    print(f"  Total Theta (daily):   ${portfolio_summary['Total_Theta']:>14,.0f}")
    print(f"  Total Rho:             ${portfolio_summary['Total_Rho']:>14,.0f}")

    print("\nIndividual Options Greeks:")
    print("-" * 70)
    display_cols = ['Option_ID', 'Underlying', 'Option_Type', 'Strike',
                    'Delta', 'Gamma', 'Vega', 'Theta']
    print(greeks_df[display_cols].to_string(index=False))

    # Delta hedging example
    print("\nDelta Hedging Requirement:")
    print("-" * 70)

    # Find largest delta exposure
    max_delta_idx = greeks_df['Delta'].abs().idxmax()
    max_delta_option = greeks_df.loc[max_delta_idx]

    hedge = calculator.delta_hedge_ratio(
        S=max_delta_option['Spot'],
        K=max_delta_option['Strike'],
        T=max_delta_option['Time_to_Expiry'],
        r=0.05,
        sigma=max_delta_option['Volatility'] / 100,
        option_type=max_delta_option['Option_Type'],
        contracts=int(max_delta_option['Contracts'])
    )

    print(f"  Largest Delta Position: {max_delta_option['Option_ID']}")
    print(f"  Position Delta: {hedge['Position_Delta']:,.0f}")
    print(f"  Hedge Required: {hedge['Hedge_Direction']} {abs(hedge['Hedge_Units']):,.0f} units")
    print(f"  Hedge Value: ${abs(hedge['Hedge_Value']):,.0f}")

    return calculator, greeks_df, portfolio_summary


def demo_scenario_analysis(generator, portfolio):
    """Demonstrate scenario analysis and stress testing."""
    print_section_header("4. SCENARIO ANALYSIS & STRESS TESTING")

    # Current prices
    current_prices = {}
    for commodity, params in generator.commodities.items():
        current_prices[commodity] = params['price']
    for fx_pair, params in generator.fx_pairs.items():
        current_prices[fx_pair] = params['rate']

    analyzer = ScenarioAnalyzer()

    # Run historical scenarios
    print("\nHistorical Scenario Analysis:")
    print("-" * 70)
    scenario_results = analyzer.run_historical_scenarios(portfolio, current_prices)

    for _, row in scenario_results.iterrows():
        status = "LOSS" if row['Total_P&L'] < 0 else "GAIN"
        print(f"  {row['Scenario']:<25} P&L: ${row['Total_P&L']:>12,.0f} [{status}]")

    # Worst case scenario details
    worst_scenario = scenario_results.iloc[0]
    print(f"\nWorst Case: {worst_scenario['Scenario']}")
    print(f"Description: {worst_scenario['Description']}")
    print(f"Total P&L: ${worst_scenario['Total_P&L']:,.0f}")

    # Sensitivity analysis
    print("\nSensitivity Analysis - Key Commodities:")
    print("-" * 70)
    sensitivity = analyzer.sensitivity_analysis(
        portfolio, current_prices,
        shock_range=[-0.15, -0.10, -0.05, 0.05, 0.10, 0.15]
    )

    # Show for top commodities
    for commodity in ['SOYBEAN', 'CORN', 'WHEAT']:
        comm_sens = sensitivity[sensitivity['Instrument'] == commodity]
        if len(comm_sens) > 0:
            print(f"\n  {commodity}:")
            for _, row in comm_sens.iterrows():
                pnl_str = f"${row['P&L']:>10,.0f}"
                print(f"    {row['Shock_Pct']:>+6.0f}%: {pnl_str}")

    # Reverse stress test
    print("\nReverse Stress Test:")
    print("-" * 70)
    target_loss = -10_000_000
    reverse_result = analyzer.reverse_stress_test(
        portfolio, current_prices, target_loss
    )
    print(f"  To achieve ${target_loss:,.0f} loss:")
    print(f"  Uniform shock required: {reverse_result['Uniform_Shock']:.1f}%")

    return analyzer, scenario_results


def demo_risk_reporting(var_results, portfolio_value, portfolio,
                        scenario_results, component_var,
                        greeks_df, portfolio_greeks):
    """Demonstrate risk reporting capabilities."""
    print_section_header("5. RISK REPORTING DASHBOARD")

    dashboard = RiskDashboard()

    # Generate executive summary
    print("\nExecutive Summary:")
    print("-" * 70)
    exec_summary = dashboard.generate_executive_summary(
        var_results, portfolio_value, scenario_results
    )
    print(exec_summary)

    # Position report summary
    print("\n\nPosition Summary by Desk:")
    print("-" * 70)
    desk_summary = portfolio.groupby('Desk').agg({
        'Notional_USD': ['sum', 'count']
    })
    desk_summary.columns = ['Total_Notional', 'Positions']
    print(desk_summary.to_string())

    # VaR attribution
    print("\n\nVaR Attribution (Top 5 Contributors):")
    print("-" * 70)
    top_contrib = component_var.nlargest(5, 'Pct_Contribution')
    for _, row in top_contrib.iterrows():
        bar = "=" * int(row['Pct_Contribution'] / 2)
        print(f"  {row['Asset']:<12} ${row['Component_VaR']:>10,.0f} "
              f"({row['Pct_Contribution']:>5.1f}%) {bar}")

    return dashboard


def main():
    """Main demo function showcasing all market risk capabilities."""

    print("\n" + "=" * 70)
    print(" MARKET RISK PORTFOLIO DEMONSTRATION")
    print(" For: COFCO International - Market Risk Senior Analyst Position")
    print(" " + "=" * 70)
    print(f"\n Report Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n This portfolio demonstrates expertise in:")
    print("   - VaR calculation (Historical, Parametric, Monte Carlo)")
    print("   - Options pricing and Greeks analysis")
    print("   - Scenario analysis and stress testing")
    print("   - Risk attribution and reporting")
    print("   - Agricultural commodity and FX market understanding")

    # 1. Market Data
    generator, commodity_prices, fx_rates, portfolio, options_portfolio = demo_market_data()

    # Calculate returns
    returns = generator.generate_returns(commodity_prices)
    portfolio_value = portfolio['Notional_USD'].sum()

    print(f"\n*** Total Portfolio Value: ${portfolio_value:,.0f} ***")

    # 2. VaR Calculations
    var_engine, var_results, component_var, weights = demo_var_calculations(
        generator, returns, portfolio_value
    )

    # 3. Options Greeks
    greeks_calc, greeks_df, portfolio_greeks = demo_options_greeks(options_portfolio)

    # 4. Scenario Analysis
    analyzer, scenario_results = demo_scenario_analysis(generator, portfolio)

    # 5. Risk Reporting
    dashboard = demo_risk_reporting(
        var_results, portfolio_value, portfolio,
        scenario_results, component_var,
        greeks_df, portfolio_greeks
    )

    # Final summary
    print_section_header("SUMMARY")

    print("\nKey Risk Metrics:")
    print("-" * 70)
    print(f"  Portfolio Value:        ${portfolio_value:>15,.0f}")
    print(f"  1-Day VaR (99%):        ${var_results['VaR_Dollar'].mean():>15,.0f}")
    print(f"  Expected Shortfall:     ${var_results['ES_Dollar'].mean():>15,.0f}")
    print(f"  Worst Scenario P&L:     ${scenario_results['Total_P&L'].min():>15,.0f}")
    print(f"  Options Delta:          {portfolio_greeks['Total_Delta']:>15,.0f}")
    print(f"  Options Vega:           ${portfolio_greeks['Total_Vega']:>14,.0f}")

    print("\nRecommendations:")
    print("-" * 70)

    # Check for risks
    max_var = var_results['VaR_Dollar'].max()
    var_limit = portfolio_value * 0.05

    if max_var > var_limit * 0.8:
        print("  [!] VaR approaching limit - consider position reduction")

    if abs(portfolio_greeks['Total_Delta']) > 5000:
        print("  [!] High delta exposure - consider delta hedging")

    if scenario_results['Total_P&L'].min() < -portfolio_value * 0.10:
        print("  [!] Severe scenario losses - review tail risk hedging")

    top3_conc = component_var.nlargest(3, 'Pct_Contribution')['Pct_Contribution'].sum()
    if top3_conc > 70:
        print("  [!] High concentration risk - diversification recommended")

    print("\n" + "=" * 70)
    print(" END OF MARKET RISK PORTFOLIO DEMONSTRATION")
    print("=" * 70 + "\n")

    return {
        'portfolio': portfolio,
        'options': options_portfolio,
        'var_results': var_results,
        'component_var': component_var,
        'greeks': greeks_df,
        'scenarios': scenario_results
    }


if __name__ == "__main__":
    results = main()
