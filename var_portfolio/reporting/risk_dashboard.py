"""
Risk Reporting Dashboard
Generates comprehensive risk reports and visualizations
for market risk management.
"""

import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')


class RiskDashboard:
    """
    Generate risk reports and analytics for management reporting.
    """

    def __init__(self):
        """Initialize the risk dashboard."""
        self.report_date = datetime.now().strftime("%Y-%m-%d")

    def generate_executive_summary(
        self,
        var_results: pd.DataFrame,
        portfolio_value: float,
        scenario_results: pd.DataFrame = None
    ) -> str:
        """
        Generate executive summary for senior management.

        Args:
            var_results: DataFrame with VaR calculations
            portfolio_value: Total portfolio value
            scenario_results: DataFrame with scenario analysis results

        Returns:
            Formatted executive summary string
        """
        summary = []
        summary.append("=" * 70)
        summary.append("MARKET RISK EXECUTIVE SUMMARY")
        summary.append(f"Report Date: {self.report_date}")
        summary.append("=" * 70)

        # Portfolio overview
        summary.append("\n1. PORTFOLIO OVERVIEW")
        summary.append("-" * 70)
        summary.append(f"Total Portfolio Value: ${portfolio_value:,.0f}")

        # VaR summary
        if var_results is not None and len(var_results) > 0:
            summary.append("\n2. VALUE-AT-RISK SUMMARY (99% Confidence)")
            summary.append("-" * 70)

            for _, row in var_results.iterrows():
                method = row.get('Method', 'N/A')
                var_dollar = row.get('VaR_Dollar', 0)
                var_pct = row.get('VaR_Percent', 0)
                es_dollar = row.get('ES_Dollar', 0)

                summary.append(f"  {method} VaR:")
                summary.append(f"    - VaR: ${var_dollar:,.0f} ({var_pct:.2f}%)")
                summary.append(f"    - Expected Shortfall: ${es_dollar:,.0f}")

        # Scenario analysis
        if scenario_results is not None and len(scenario_results) > 0:
            summary.append("\n3. WORST-CASE SCENARIOS")
            summary.append("-" * 70)

            worst_scenarios = scenario_results.nsmallest(3, 'Total_P&L')
            for _, row in worst_scenarios.iterrows():
                summary.append(f"  {row['Scenario']}:")
                summary.append(f"    - P&L Impact: ${row['Total_P&L']:,.0f}")

        # Risk limits
        summary.append("\n4. RISK LIMITS STATUS")
        summary.append("-" * 70)

        if var_results is not None and len(var_results) > 0:
            max_var = var_results['VaR_Dollar'].max()
            var_limit = portfolio_value * 0.05  # 5% limit
            utilization = (max_var / var_limit) * 100

            status = "GREEN" if utilization < 80 else "AMBER" if utilization < 100 else "RED"
            summary.append(f"  VaR Limit: ${var_limit:,.0f}")
            summary.append(f"  Current VaR: ${max_var:,.0f}")
            summary.append(f"  Utilization: {utilization:.1f}% [{status}]")

        return "\n".join(summary)

    def generate_position_report(
        self,
        positions: pd.DataFrame,
        component_var: pd.DataFrame = None
    ) -> str:
        """
        Generate detailed position report.

        Args:
            positions: DataFrame with portfolio positions
            component_var: DataFrame with component VaR

        Returns:
            Formatted position report string
        """
        report = []
        report.append("=" * 70)
        report.append("POSITION RISK REPORT")
        report.append(f"Report Date: {self.report_date}")
        report.append("=" * 70)

        # Position summary by desk
        report.append("\n1. POSITIONS BY DESK")
        report.append("-" * 70)

        desk_summary = positions.groupby('Desk').agg({
            'Notional_USD': 'sum',
            'Position_ID': 'count'
        }).rename(columns={'Position_ID': 'Count'})

        for desk, row in desk_summary.iterrows():
            report.append(f"  {desk}:")
            report.append(f"    - Positions: {row['Count']}")
            report.append(f"    - Notional: ${row['Notional_USD']:,.0f}")

        # Position summary by instrument type
        report.append("\n2. POSITIONS BY INSTRUMENT TYPE")
        report.append("-" * 70)

        type_summary = positions.groupby('Type').agg({
            'Notional_USD': 'sum',
            'Position_ID': 'count'
        }).rename(columns={'Position_ID': 'Count'})

        for inst_type, row in type_summary.iterrows():
            report.append(f"  {inst_type}:")
            report.append(f"    - Positions: {row['Count']}")
            report.append(f"    - Notional: ${row['Notional_USD']:,.0f}")

        # Top risk contributors
        if component_var is not None:
            report.append("\n3. TOP RISK CONTRIBUTORS")
            report.append("-" * 70)

            top_contributors = component_var.nlargest(5, 'Component_VaR')
            for _, row in top_contributors.iterrows():
                report.append(f"  {row['Asset']}:")
                report.append(f"    - Component VaR: ${row['Component_VaR']:,.0f}")
                report.append(f"    - Contribution: {row['Pct_Contribution']:.1f}%")

        # Long/Short breakdown
        report.append("\n4. LONG/SHORT BREAKDOWN")
        report.append("-" * 70)

        direction_summary = positions.groupby('Direction').agg({
            'Notional_USD': 'sum'
        })

        for direction, row in direction_summary.iterrows():
            report.append(f"  {direction}: ${row['Notional_USD']:,.0f}")

        return "\n".join(report)

    def generate_greeks_report(
        self,
        greeks_df: pd.DataFrame,
        portfolio_summary: Dict[str, float]
    ) -> str:
        """
        Generate options Greeks report.

        Args:
            greeks_df: DataFrame with individual option Greeks
            portfolio_summary: Dictionary with portfolio Greeks summary

        Returns:
            Formatted Greeks report string
        """
        report = []
        report.append("=" * 70)
        report.append("OPTIONS GREEKS REPORT")
        report.append(f"Report Date: {self.report_date}")
        report.append("=" * 70)

        # Portfolio Greeks summary
        report.append("\n1. PORTFOLIO GREEKS SUMMARY")
        report.append("-" * 70)

        report.append(f"  Total Value: ${portfolio_summary['Total_Value']:,.0f}")
        report.append(f"  Total Delta: {portfolio_summary['Total_Delta']:,.0f}")
        report.append(f"  Total Gamma: {portfolio_summary['Total_Gamma']:,.2f}")
        report.append(f"  Total Vega: ${portfolio_summary['Total_Vega']:,.0f}")
        report.append(f"  Total Theta: ${portfolio_summary['Total_Theta']:,.0f}/day")
        report.append(f"  Total Rho: ${portfolio_summary['Total_Rho']:,.0f}")

        # Greeks by underlying
        report.append("\n2. GREEKS BY UNDERLYING")
        report.append("-" * 70)

        underlying_greeks = greeks_df.groupby('Underlying').agg({
            'Delta': 'sum',
            'Gamma': 'sum',
            'Vega': 'sum',
            'Theta': 'sum'
        })

        for underlying, row in underlying_greeks.iterrows():
            report.append(f"  {underlying}:")
            report.append(f"    Delta: {row['Delta']:,.0f}, Gamma: {row['Gamma']:.2f}")
            report.append(f"    Vega: ${row['Vega']:,.0f}, Theta: ${row['Theta']:,.0f}/day")

        # Risk flags
        report.append("\n3. RISK FLAGS")
        report.append("-" * 70)

        # Check for large Greeks
        if abs(portfolio_summary['Total_Delta']) > 10000:
            report.append("  [!] HIGH DELTA EXPOSURE - Consider delta hedging")

        if portfolio_summary['Total_Gamma'] < -100:
            report.append("  [!] NEGATIVE GAMMA - Vulnerable to large moves")

        if abs(portfolio_summary['Total_Vega']) > 100000:
            report.append("  [!] HIGH VEGA EXPOSURE - Sensitive to volatility")

        if portfolio_summary['Total_Theta'] < -10000:
            report.append("  [!] HIGH TIME DECAY - ${:,.0f}/day".format(
                abs(portfolio_summary['Total_Theta'])
            ))

        return "\n".join(report)

    def generate_var_attribution(
        self,
        component_var: pd.DataFrame
    ) -> str:
        """
        Generate VaR attribution report.

        Args:
            component_var: DataFrame with component VaR analysis

        Returns:
            Formatted VaR attribution string
        """
        report = []
        report.append("=" * 70)
        report.append("VAR ATTRIBUTION REPORT")
        report.append(f"Report Date: {self.report_date}")
        report.append("=" * 70)

        # Sort by contribution
        sorted_var = component_var.sort_values('Pct_Contribution', ascending=False)

        # Total VaR
        total_var = sorted_var['Component_VaR'].sum()
        report.append(f"\nTotal Portfolio VaR: ${total_var:,.0f}")

        # Attribution breakdown
        report.append("\nVaR Attribution by Asset:")
        report.append("-" * 70)

        cumulative = 0
        for _, row in sorted_var.iterrows():
            cumulative += row['Pct_Contribution']
            bar = "=" * int(row['Pct_Contribution'] / 2)
            report.append(
                f"  {row['Asset']:<15} ${row['Component_VaR']:>12,.0f} "
                f"({row['Pct_Contribution']:>5.1f}%) {bar}"
            )

        # Concentration analysis
        report.append("\nConcentration Analysis:")
        report.append("-" * 70)

        top3_pct = sorted_var.head(3)['Pct_Contribution'].sum()
        report.append(f"  Top 3 assets contribute: {top3_pct:.1f}% of total VaR")

        if top3_pct > 70:
            report.append("  [!] HIGH CONCENTRATION - Consider diversification")

        return "\n".join(report)

    def generate_daily_risk_report(
        self,
        var_results: pd.DataFrame,
        portfolio_value: float,
        positions: pd.DataFrame,
        scenario_results: pd.DataFrame = None,
        component_var: pd.DataFrame = None,
        greeks_df: pd.DataFrame = None,
        portfolio_greeks: Dict[str, float] = None
    ) -> str:
        """
        Generate comprehensive daily risk report.

        Args:
            var_results: DataFrame with VaR calculations
            portfolio_value: Total portfolio value
            positions: DataFrame with portfolio positions
            scenario_results: DataFrame with scenario analysis
            component_var: DataFrame with component VaR
            greeks_df: DataFrame with options Greeks
            portfolio_greeks: Dictionary with portfolio Greeks

        Returns:
            Complete daily risk report
        """
        report = []

        # Header
        report.append("=" * 70)
        report.append("DAILY MARKET RISK REPORT")
        report.append("COFCO International - APAC Region")
        report.append(f"Report Date: {self.report_date}")
        report.append("=" * 70)

        # Executive summary
        report.append(self.generate_executive_summary(
            var_results, portfolio_value, scenario_results
        ))

        # Position report
        report.append("\n" + self.generate_position_report(positions, component_var))

        # VaR attribution
        if component_var is not None:
            report.append("\n" + self.generate_var_attribution(component_var))

        # Greeks report
        if greeks_df is not None and portfolio_greeks is not None:
            report.append("\n" + self.generate_greeks_report(
                greeks_df, portfolio_greeks
            ))

        # Footer
        report.append("\n" + "=" * 70)
        report.append("END OF REPORT")
        report.append("=" * 70)

        return "\n".join(report)

    def calculate_risk_metrics_summary(
        self,
        returns: pd.DataFrame,
        portfolio_weights: np.ndarray
    ) -> Dict[str, float]:
        """
        Calculate summary risk metrics for the portfolio.

        Args:
            returns: DataFrame of historical returns
            portfolio_weights: Array of portfolio weights

        Returns:
            Dictionary with risk metrics
        """
        portfolio_returns = returns.dot(portfolio_weights)

        # Basic statistics
        mean_return = portfolio_returns.mean() * 252  # Annualized
        volatility = portfolio_returns.std() * np.sqrt(252)  # Annualized

        # Sharpe ratio (assuming 5% risk-free rate)
        sharpe = (mean_return - 0.05) / volatility if volatility > 0 else 0

        # Maximum drawdown
        cumulative = (1 + portfolio_returns).cumprod()
        rolling_max = cumulative.expanding().max()
        drawdowns = cumulative / rolling_max - 1
        max_drawdown = drawdowns.min()

        # Skewness and kurtosis
        skewness = portfolio_returns.skew()
        kurtosis = portfolio_returns.kurtosis()

        # Sortino ratio (downside deviation)
        negative_returns = portfolio_returns[portfolio_returns < 0]
        downside_std = negative_returns.std() * np.sqrt(252)
        sortino = (mean_return - 0.05) / downside_std if downside_std > 0 else 0

        return {
            'Annualized_Return': mean_return * 100,
            'Annualized_Volatility': volatility * 100,
            'Sharpe_Ratio': sharpe,
            'Sortino_Ratio': sortino,
            'Max_Drawdown': max_drawdown * 100,
            'Skewness': skewness,
            'Excess_Kurtosis': kurtosis,
            'Observations': len(portfolio_returns)
        }


def main():
    """Demo the Risk Dashboard."""
    print("=" * 70)
    print("RISK DASHBOARD DEMO - COFCO International Risk Analytics")
    print("=" * 70)

    # Import dependencies
    import sys
    sys.path.insert(0, '/home/user/var_portfolio')
    from data.market_data import MarketDataGenerator
    from var.var_engine import VaREngine
    from options.greeks import OptionsGreeksCalculator
    from scenarios.stress_testing import ScenarioAnalyzer

    # Generate sample data
    generator = MarketDataGenerator()
    commodity_prices = generator.generate_commodity_data(days=504)
    returns = generator.generate_returns(commodity_prices)
    portfolio = generator.generate_portfolio_positions(20)
    options_portfolio = generator.generate_options_portfolio(10)

    # Portfolio setup
    n_assets = len(returns.columns)
    weights = np.random.dirichlet(np.ones(n_assets))
    portfolio_value = portfolio['Notional_USD'].sum()

    # Current prices
    current_prices = {}
    for commodity, params in generator.commodities.items():
        current_prices[commodity] = params['price']
    for fx_pair, params in generator.fx_pairs.items():
        current_prices[fx_pair] = params['rate']

    # Calculate VaR
    var_engine = VaREngine(confidence_level=0.99)
    var_results = var_engine.calculate_all_var(
        returns, weights, portfolio_value, holding_period=1
    )
    component_var = var_engine.component_var(returns, weights, portfolio_value)

    # Calculate Greeks
    greeks_calc = OptionsGreeksCalculator()
    greeks_df, portfolio_greeks = greeks_calc.portfolio_greeks(options_portfolio)

    # Run scenarios
    analyzer = ScenarioAnalyzer()
    scenario_results = analyzer.run_historical_scenarios(portfolio, current_prices)

    # Generate dashboard
    dashboard = RiskDashboard()

    # Generate full report
    full_report = dashboard.generate_daily_risk_report(
        var_results=var_results,
        portfolio_value=portfolio_value,
        positions=portfolio,
        scenario_results=scenario_results,
        component_var=component_var,
        greeks_df=greeks_df,
        portfolio_greeks=portfolio_greeks
    )

    print(full_report)

    # Risk metrics
    print("\n\nADDITIONAL RISK METRICS:")
    print("-" * 70)
    metrics = dashboard.calculate_risk_metrics_summary(returns, weights)
    for key, value in metrics.items():
        print(f"  {key}: {value:.2f}")

    return full_report


if __name__ == "__main__":
    main()
