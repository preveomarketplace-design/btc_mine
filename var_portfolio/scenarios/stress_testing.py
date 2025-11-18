"""
Scenario Analysis and Stress Testing Module
Implements historical, hypothetical, and sensitivity analysis
for agricultural commodity and FX portfolios.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from datetime import datetime


class ScenarioAnalyzer:
    """
    Comprehensive scenario analysis and stress testing for market risk.
    """

    def __init__(self):
        """Initialize scenario analyzer with predefined scenarios."""

        # Historical stress scenarios relevant to commodities
        self.historical_scenarios = {
            '2008_Financial_Crisis': {
                'description': 'Global financial crisis - commodity collapse',
                'CORN': -0.40,
                'SOYBEAN': -0.35,
                'WHEAT': -0.45,
                'SUGAR': -0.50,
                'PALM_OIL': -0.55,
                'SOYBEAN_OIL': -0.45,
                'SOYBEAN_MEAL': -0.35,
                'USDCNY': 0.02,
                'USDSGD': 0.08,
                'USDBRL': 0.40,
                'USDMYR': 0.10,
                'USDINR': 0.20,
                'EURUSD': -0.15,
                'USDARS': 0.25
            },
            '2020_COVID_Crash': {
                'description': 'COVID-19 market crash - March 2020',
                'CORN': -0.15,
                'SOYBEAN': -0.10,
                'WHEAT': -0.08,
                'SUGAR': -0.25,
                'PALM_OIL': -0.30,
                'SOYBEAN_OIL': -0.20,
                'SOYBEAN_MEAL': -0.12,
                'USDCNY': 0.03,
                'USDSGD': 0.06,
                'USDBRL': 0.25,
                'USDMYR': 0.08,
                'USDINR': 0.05,
                'EURUSD': -0.05,
                'USDARS': 0.15
            },
            '2022_Ukraine_War': {
                'description': 'Russia-Ukraine conflict - grain supply shock',
                'CORN': 0.35,
                'SOYBEAN': 0.25,
                'WHEAT': 0.60,
                'SUGAR': 0.15,
                'PALM_OIL': 0.45,
                'SOYBEAN_OIL': 0.30,
                'SOYBEAN_MEAL': 0.20,
                'USDCNY': 0.02,
                'USDSGD': 0.03,
                'USDBRL': -0.05,
                'USDMYR': 0.04,
                'USDINR': 0.06,
                'EURUSD': -0.12,
                'USDARS': 0.30
            },
            '2011_Commodity_Spike': {
                'description': 'Commodity super-cycle peak',
                'CORN': 0.45,
                'SOYBEAN': 0.40,
                'WHEAT': 0.50,
                'SUGAR': 0.80,
                'PALM_OIL': 0.35,
                'SOYBEAN_OIL': 0.40,
                'SOYBEAN_MEAL': 0.35,
                'USDCNY': -0.05,
                'USDSGD': -0.08,
                'USDBRL': -0.15,
                'USDMYR': -0.10,
                'USDINR': -0.05,
                'EURUSD': 0.10,
                'USDARS': 0.05
            },
            'China_Demand_Shock': {
                'description': 'Major Chinese demand reduction',
                'CORN': -0.25,
                'SOYBEAN': -0.35,
                'WHEAT': -0.15,
                'SUGAR': -0.10,
                'PALM_OIL': -0.20,
                'SOYBEAN_OIL': -0.25,
                'SOYBEAN_MEAL': -0.30,
                'USDCNY': 0.08,
                'USDSGD': 0.05,
                'USDBRL': 0.15,
                'USDMYR': 0.06,
                'USDINR': 0.04,
                'EURUSD': 0.05,
                'USDARS': 0.10
            },
            'El_Nino_Event': {
                'description': 'Severe El Niño weather pattern',
                'CORN': -0.20,
                'SOYBEAN': 0.30,
                'WHEAT': 0.15,
                'SUGAR': 0.40,
                'PALM_OIL': 0.35,
                'SOYBEAN_OIL': 0.25,
                'SOYBEAN_MEAL': 0.20,
                'USDCNY': 0.01,
                'USDSGD': 0.02,
                'USDBRL': 0.10,
                'USDMYR': 0.05,
                'USDINR': 0.03,
                'EURUSD': -0.02,
                'USDARS': 0.08
            }
        }

    def apply_scenario(
        self,
        portfolio_positions: pd.DataFrame,
        scenario_shocks: Dict[str, float],
        current_prices: Dict[str, float]
    ) -> pd.DataFrame:
        """
        Apply scenario shocks to portfolio positions.

        Args:
            portfolio_positions: DataFrame with portfolio positions
            scenario_shocks: Dictionary of instrument -> shock percentage
            current_prices: Dictionary of instrument -> current price

        Returns:
            DataFrame with scenario P&L results
        """
        results = []

        for _, pos in portfolio_positions.iterrows():
            instrument = pos['Instrument']
            shock = scenario_shocks.get(instrument, 0)
            current_price = current_prices.get(instrument, pos['Current_Price'])

            # Calculate P&L
            price_change = current_price * shock
            new_price = current_price * (1 + shock)

            if 'Quantity' in pos:
                quantity = pos['Quantity']
                pnl = quantity * price_change * (100 if pos['Type'] == 'Commodity' else 1)
            else:
                notional = pos.get('Notional_USD', 0)
                pnl = notional * shock

            results.append({
                'Position_ID': pos.get('Position_ID', ''),
                'Instrument': instrument,
                'Direction': pos.get('Direction', 'LONG'),
                'Current_Price': current_price,
                'Shock': shock * 100,
                'New_Price': new_price,
                'P&L': pnl
            })

        return pd.DataFrame(results)

    def run_historical_scenarios(
        self,
        portfolio_positions: pd.DataFrame,
        current_prices: Dict[str, float]
    ) -> pd.DataFrame:
        """
        Run all historical scenarios against portfolio.

        Args:
            portfolio_positions: DataFrame with portfolio positions
            current_prices: Dictionary of current prices

        Returns:
            DataFrame with scenario results summary
        """
        results = []

        for scenario_name, shocks in self.historical_scenarios.items():
            description = shocks.get('description', '')
            scenario_shocks = {k: v for k, v in shocks.items() if k != 'description'}

            scenario_result = self.apply_scenario(
                portfolio_positions, scenario_shocks, current_prices
            )

            total_pnl = scenario_result['P&L'].sum()
            max_loss = scenario_result[scenario_result['P&L'] < 0]['P&L'].sum()

            results.append({
                'Scenario': scenario_name,
                'Description': description,
                'Total_P&L': total_pnl,
                'Max_Loss': max_loss,
                'Positions_Affected': len(scenario_result[scenario_result['P&L'] != 0])
            })

        return pd.DataFrame(results).sort_values('Total_P&L')

    def sensitivity_analysis(
        self,
        portfolio_positions: pd.DataFrame,
        current_prices: Dict[str, float],
        shock_range: List[float] = None
    ) -> pd.DataFrame:
        """
        Perform sensitivity analysis across shock magnitudes.

        Args:
            portfolio_positions: DataFrame with portfolio positions
            current_prices: Dictionary of current prices
            shock_range: List of shock percentages to test

        Returns:
            DataFrame with sensitivity results
        """
        if shock_range is None:
            shock_range = [-0.20, -0.15, -0.10, -0.05, 0.05, 0.10, 0.15, 0.20]

        results = []
        instruments = portfolio_positions['Instrument'].unique()

        for instrument in instruments:
            for shock in shock_range:
                # Apply shock only to this instrument
                scenario_shocks = {instrument: shock}

                scenario_result = self.apply_scenario(
                    portfolio_positions, scenario_shocks, current_prices
                )

                instrument_pnl = scenario_result[
                    scenario_result['Instrument'] == instrument
                ]['P&L'].sum()

                results.append({
                    'Instrument': instrument,
                    'Shock_Pct': shock * 100,
                    'P&L': instrument_pnl
                })

        return pd.DataFrame(results)

    def correlation_stress_test(
        self,
        returns: pd.DataFrame,
        portfolio_weights: np.ndarray,
        portfolio_value: float,
        correlation_shock: float = 0.5
    ) -> Dict[str, float]:
        """
        Stress test portfolio under correlation breakdown/spike.

        Args:
            returns: DataFrame of historical returns
            portfolio_weights: Array of portfolio weights
            portfolio_value: Total portfolio value
            correlation_shock: Multiplier for correlations (>1 increases, <1 decreases)

        Returns:
            Dictionary with stress test results
        """
        # Original correlation and covariance
        orig_corr = returns.corr()
        orig_std = returns.std()
        orig_cov = returns.cov()

        # Stressed correlation matrix
        # Move correlations toward 1 (or away if shock < 1)
        stressed_corr = orig_corr.copy()
        for i in range(len(stressed_corr)):
            for j in range(len(stressed_corr)):
                if i != j:
                    stressed_corr.iloc[i, j] = np.clip(
                        orig_corr.iloc[i, j] * (1 + correlation_shock),
                        -1, 1
                    )

        # Rebuild covariance matrix
        stressed_cov = np.outer(orig_std, orig_std) * stressed_corr.values

        # Calculate portfolio variance under both scenarios
        from scipy import stats

        orig_var = np.dot(portfolio_weights.T,
                        np.dot(orig_cov, portfolio_weights))
        stressed_var = np.dot(portfolio_weights.T,
                             np.dot(stressed_cov, portfolio_weights))

        # VaR at 99%
        z_score = abs(stats.norm.ppf(0.01))
        orig_var_dollar = z_score * np.sqrt(orig_var) * portfolio_value
        stressed_var_dollar = z_score * np.sqrt(stressed_var) * portfolio_value

        return {
            'Original_Portfolio_Vol': np.sqrt(orig_var) * np.sqrt(252) * 100,
            'Stressed_Portfolio_Vol': np.sqrt(stressed_var) * np.sqrt(252) * 100,
            'Original_VaR_99': orig_var_dollar,
            'Stressed_VaR_99': stressed_var_dollar,
            'VaR_Increase': stressed_var_dollar - orig_var_dollar,
            'VaR_Increase_Pct': (stressed_var_dollar - orig_var_dollar) / orig_var_dollar * 100,
            'Correlation_Shock': correlation_shock
        }

    def liquidity_stress_test(
        self,
        portfolio_positions: pd.DataFrame,
        avg_daily_volumes: Dict[str, float],
        days_to_liquidate: int = 5
    ) -> pd.DataFrame:
        """
        Assess liquidity risk under stressed conditions.

        Args:
            portfolio_positions: DataFrame with portfolio positions
            avg_daily_volumes: Dictionary of instrument -> average daily volume
            days_to_liquidate: Target days to liquidate

        Returns:
            DataFrame with liquidity analysis
        """
        results = []

        for _, pos in portfolio_positions.iterrows():
            instrument = pos['Instrument']
            notional = abs(pos.get('Notional_USD', 0))

            if instrument in avg_daily_volumes:
                adv = avg_daily_volumes[instrument]

                # Assume we can trade 10% of ADV without market impact
                daily_capacity = adv * 0.10
                days_needed = notional / daily_capacity if daily_capacity > 0 else float('inf')

                # Estimate market impact (simplified)
                participation_rate = notional / (adv * days_to_liquidate)
                market_impact = participation_rate * 0.1  # 10% impact per 100% participation

                liquidity_cost = notional * market_impact
            else:
                days_needed = float('inf')
                liquidity_cost = 0

            results.append({
                'Position_ID': pos.get('Position_ID', ''),
                'Instrument': instrument,
                'Notional': notional,
                'ADV': avg_daily_volumes.get(instrument, 0),
                'Days_to_Liquidate': min(days_needed, 999),
                'Liquidity_Cost': liquidity_cost,
                'Illiquid': days_needed > days_to_liquidate
            })

        return pd.DataFrame(results).sort_values('Days_to_Liquidate', ascending=False)

    def generate_custom_scenario(
        self,
        base_shocks: Dict[str, float],
        name: str,
        description: str
    ) -> Dict[str, float]:
        """
        Create a custom scenario for testing.

        Args:
            base_shocks: Dictionary of instrument -> shock percentage
            name: Scenario name
            description: Scenario description

        Returns:
            Scenario dictionary
        """
        scenario = {'description': description}
        scenario.update(base_shocks)
        return scenario

    def reverse_stress_test(
        self,
        portfolio_positions: pd.DataFrame,
        current_prices: Dict[str, float],
        target_loss: float,
        max_iterations: int = 100
    ) -> Dict[str, float]:
        """
        Find scenario that produces a specific loss amount.

        Args:
            portfolio_positions: DataFrame with portfolio positions
            current_prices: Dictionary of current prices
            target_loss: Target P&L loss (negative value)
            max_iterations: Maximum iterations for optimization

        Returns:
            Dictionary with reverse stress test scenario
        """
        instruments = portfolio_positions['Instrument'].unique()

        # Start with uniform shock
        shock_level = 0.10

        for _ in range(max_iterations):
            # Apply uniform negative shock
            scenario_shocks = {inst: -shock_level for inst in instruments}

            scenario_result = self.apply_scenario(
                portfolio_positions, scenario_shocks, current_prices
            )

            total_pnl = scenario_result['P&L'].sum()

            if abs(total_pnl - target_loss) < abs(target_loss * 0.01):
                break

            # Adjust shock level
            if total_pnl > target_loss:
                shock_level *= 1.1
            else:
                shock_level *= 0.9

        return {
            'Uniform_Shock': shock_level * 100,
            'Achieved_Loss': total_pnl,
            'Target_Loss': target_loss,
            'Difference': total_pnl - target_loss
        }


def main():
    """Demo the Scenario Analysis module."""
    print("=" * 60)
    print("SCENARIO ANALYSIS - COFCO International Risk Analytics")
    print("=" * 60)

    # Import dependencies
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from data.market_data import MarketDataGenerator

    # Generate sample data
    generator = MarketDataGenerator()
    portfolio = generator.generate_portfolio_positions(20)
    commodity_prices = generator.generate_commodity_data(days=252)
    fx_rates = generator.generate_fx_data(days=252)

    # Current prices
    current_prices = {}
    for commodity, params in generator.commodities.items():
        current_prices[commodity] = params['price']
    for fx_pair, params in generator.fx_pairs.items():
        current_prices[fx_pair] = params['rate']

    # Initialize analyzer
    analyzer = ScenarioAnalyzer()

    # Run historical scenarios
    print("\n1. Historical Scenario Analysis:")
    print("-" * 60)
    scenario_results = analyzer.run_historical_scenarios(portfolio, current_prices)
    print(scenario_results.to_string(index=False))

    # Sensitivity analysis
    print("\n2. Sensitivity Analysis (Sample - CORN):")
    print("-" * 60)
    sensitivity = analyzer.sensitivity_analysis(portfolio, current_prices)
    corn_sensitivity = sensitivity[sensitivity['Instrument'] == 'CORN']
    print(corn_sensitivity.to_string(index=False))

    # Correlation stress test
    print("\n3. Correlation Stress Test:")
    print("-" * 60)

    # Combine returns
    commodity_returns = generator.generate_returns(commodity_prices)
    n_assets = len(commodity_returns.columns)
    weights = np.ones(n_assets) / n_assets
    portfolio_value = portfolio['Notional_USD'].sum()

    corr_stress = analyzer.correlation_stress_test(
        commodity_returns, weights, portfolio_value, correlation_shock=0.5
    )

    for key, value in corr_stress.items():
        if isinstance(value, float):
            print(f"  {key}: {value:,.2f}")
        else:
            print(f"  {key}: {value}")

    # Reverse stress test
    print("\n4. Reverse Stress Test:")
    print("-" * 60)
    target_loss = -10_000_000  # $10M loss
    reverse_result = analyzer.reverse_stress_test(
        portfolio, current_prices, target_loss
    )

    for key, value in reverse_result.items():
        if isinstance(value, float):
            print(f"  {key}: {value:,.2f}")
        else:
            print(f"  {key}: {value}")

    return scenario_results, sensitivity, corr_stress


if __name__ == "__main__":
    main()
