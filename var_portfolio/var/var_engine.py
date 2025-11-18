"""
Value-at-Risk (VaR) Calculation Engine
Implements Historical, Parametric, and Monte Carlo VaR methodologies
for commodity and FX portfolios.
"""

import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, List, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')


class VaREngine:
    """
    Comprehensive VaR calculation engine supporting multiple methodologies.
    Designed for agricultural commodity and FX portfolios.
    """

    def __init__(self, confidence_level: float = 0.99):
        """
        Initialize VaR Engine.

        Args:
            confidence_level: Confidence level for VaR calculation (e.g., 0.95, 0.99)
        """
        self.confidence_level = confidence_level
        self.alpha = 1 - confidence_level

    def historical_var(
        self,
        returns: pd.DataFrame,
        portfolio_weights: np.ndarray,
        portfolio_value: float,
        holding_period: int = 1
    ) -> Dict[str, float]:
        """
        Calculate Historical VaR using full revaluation.

        Args:
            returns: DataFrame of historical returns
            portfolio_weights: Array of portfolio weights
            portfolio_value: Total portfolio value
            holding_period: Holding period in days

        Returns:
            Dictionary with VaR metrics
        """
        # Calculate portfolio returns
        portfolio_returns = returns.dot(portfolio_weights)

        # Scale for holding period
        scaled_returns = portfolio_returns * np.sqrt(holding_period)

        # Calculate VaR as percentile
        var_pct = np.percentile(scaled_returns, self.alpha * 100)
        var_dollar = abs(var_pct * portfolio_value)

        # Expected Shortfall (CVaR)
        es_returns = scaled_returns[scaled_returns <= var_pct]
        es_pct = es_returns.mean() if len(es_returns) > 0 else var_pct
        es_dollar = abs(es_pct * portfolio_value)

        return {
            'Method': 'Historical',
            'VaR_Percent': abs(var_pct) * 100,
            'VaR_Dollar': var_dollar,
            'ES_Percent': abs(es_pct) * 100,
            'ES_Dollar': es_dollar,
            'Confidence': self.confidence_level,
            'Holding_Period': holding_period,
            'Observations': len(returns)
        }

    def parametric_var(
        self,
        returns: pd.DataFrame,
        portfolio_weights: np.ndarray,
        portfolio_value: float,
        holding_period: int = 1
    ) -> Dict[str, float]:
        """
        Calculate Parametric (Variance-Covariance) VaR.

        Assumes returns are normally distributed.

        Args:
            returns: DataFrame of historical returns
            portfolio_weights: Array of portfolio weights
            portfolio_value: Total portfolio value
            holding_period: Holding period in days

        Returns:
            Dictionary with VaR metrics
        """
        # Calculate covariance matrix
        cov_matrix = returns.cov()

        # Portfolio variance and std
        portfolio_var = np.dot(portfolio_weights.T,
                              np.dot(cov_matrix, portfolio_weights))
        portfolio_std = np.sqrt(portfolio_var)

        # Portfolio mean return
        mean_returns = returns.mean()
        portfolio_mean = np.dot(portfolio_weights, mean_returns)

        # Scale for holding period
        scaled_std = portfolio_std * np.sqrt(holding_period)
        scaled_mean = portfolio_mean * holding_period

        # Z-score for confidence level
        z_score = stats.norm.ppf(self.alpha)

        # VaR calculation
        var_pct = -(scaled_mean + z_score * scaled_std)
        var_dollar = var_pct * portfolio_value

        # Expected Shortfall for normal distribution
        es_multiplier = stats.norm.pdf(z_score) / self.alpha
        es_pct = -(scaled_mean - es_multiplier * scaled_std)
        es_dollar = es_pct * portfolio_value

        return {
            'Method': 'Parametric',
            'VaR_Percent': var_pct * 100,
            'VaR_Dollar': var_dollar,
            'ES_Percent': es_pct * 100,
            'ES_Dollar': es_dollar,
            'Confidence': self.confidence_level,
            'Holding_Period': holding_period,
            'Portfolio_Volatility': portfolio_std * np.sqrt(252) * 100,  # Annualized
            'Z_Score': abs(z_score)
        }

    def monte_carlo_var(
        self,
        returns: pd.DataFrame,
        portfolio_weights: np.ndarray,
        portfolio_value: float,
        holding_period: int = 1,
        num_simulations: int = 10000
    ) -> Dict[str, float]:
        """
        Calculate Monte Carlo VaR using simulated returns.

        Args:
            returns: DataFrame of historical returns
            portfolio_weights: Array of portfolio weights
            portfolio_value: Total portfolio value
            holding_period: Holding period in days
            num_simulations: Number of Monte Carlo simulations

        Returns:
            Dictionary with VaR metrics
        """
        # Calculate mean and covariance
        mean_returns = returns.mean().values
        cov_matrix = returns.cov().values

        # Generate correlated random returns
        L = np.linalg.cholesky(cov_matrix)

        simulated_portfolio_returns = []

        for _ in range(num_simulations):
            # Simulate returns for holding period
            period_return = 0
            for _ in range(holding_period):
                Z = np.random.standard_normal(len(mean_returns))
                daily_returns = mean_returns + np.dot(L, Z)
                portfolio_daily_return = np.dot(portfolio_weights, daily_returns)
                period_return += portfolio_daily_return

            simulated_portfolio_returns.append(period_return)

        simulated_returns = np.array(simulated_portfolio_returns)

        # Calculate VaR
        var_pct = np.percentile(simulated_returns, self.alpha * 100)
        var_dollar = abs(var_pct * portfolio_value)

        # Expected Shortfall
        es_returns = simulated_returns[simulated_returns <= var_pct]
        es_pct = es_returns.mean() if len(es_returns) > 0 else var_pct
        es_dollar = abs(es_pct * portfolio_value)

        return {
            'Method': 'Monte Carlo',
            'VaR_Percent': abs(var_pct) * 100,
            'VaR_Dollar': var_dollar,
            'ES_Percent': abs(es_pct) * 100,
            'ES_Dollar': es_dollar,
            'Confidence': self.confidence_level,
            'Holding_Period': holding_period,
            'Simulations': num_simulations,
            'Sim_Mean': np.mean(simulated_returns) * 100,
            'Sim_Std': np.std(simulated_returns) * 100
        }

    def component_var(
        self,
        returns: pd.DataFrame,
        portfolio_weights: np.ndarray,
        portfolio_value: float
    ) -> pd.DataFrame:
        """
        Calculate Component VaR to identify risk contribution of each asset.

        Args:
            returns: DataFrame of historical returns
            portfolio_weights: Array of portfolio weights
            portfolio_value: Total portfolio value

        Returns:
            DataFrame with component VaR for each asset
        """
        # Covariance matrix
        cov_matrix = returns.cov().values

        # Portfolio variance
        portfolio_var = np.dot(portfolio_weights.T,
                              np.dot(cov_matrix, portfolio_weights))
        portfolio_std = np.sqrt(portfolio_var)

        # Marginal VaR
        z_score = abs(stats.norm.ppf(self.alpha))
        marginal_var = z_score * np.dot(cov_matrix, portfolio_weights) / portfolio_std

        # Component VaR
        component_var = portfolio_weights * marginal_var * portfolio_value

        # Percentage contribution
        total_var = z_score * portfolio_std * portfolio_value
        pct_contribution = component_var / total_var * 100

        results = pd.DataFrame({
            'Asset': returns.columns,
            'Weight': portfolio_weights * 100,
            'Marginal_VaR': marginal_var,
            'Component_VaR': component_var,
            'Pct_Contribution': pct_contribution
        })

        return results.sort_values('Component_VaR', ascending=False)

    def incremental_var(
        self,
        returns: pd.DataFrame,
        portfolio_weights: np.ndarray,
        portfolio_value: float,
        new_position_idx: int,
        increment: float = 0.01
    ) -> Dict[str, float]:
        """
        Calculate Incremental VaR for adding to a position.

        Args:
            returns: DataFrame of historical returns
            portfolio_weights: Array of portfolio weights
            portfolio_value: Total portfolio value
            new_position_idx: Index of position to increment
            increment: Size of increment (as fraction)

        Returns:
            Dictionary with incremental VaR analysis
        """
        # Current VaR
        current_var = self.parametric_var(
            returns, portfolio_weights, portfolio_value
        )['VaR_Dollar']

        # New weights after increment
        new_weights = portfolio_weights.copy()
        new_weights[new_position_idx] += increment
        new_weights = new_weights / new_weights.sum()  # Renormalize

        # New VaR
        new_var = self.parametric_var(
            returns, new_weights, portfolio_value
        )['VaR_Dollar']

        return {
            'Asset': returns.columns[new_position_idx],
            'Current_VaR': current_var,
            'New_VaR': new_var,
            'Incremental_VaR': new_var - current_var,
            'Pct_Change': (new_var - current_var) / current_var * 100
        }

    def var_backtesting(
        self,
        returns: pd.DataFrame,
        portfolio_weights: np.ndarray,
        window: int = 252
    ) -> pd.DataFrame:
        """
        Perform VaR backtesting using rolling window.

        Args:
            returns: DataFrame of historical returns
            portfolio_weights: Array of portfolio weights
            window: Rolling window size

        Returns:
            DataFrame with backtesting results
        """
        portfolio_returns = returns.dot(portfolio_weights)

        results = []

        for i in range(window, len(returns)):
            # Calculate VaR using historical window
            window_returns = returns.iloc[i-window:i]
            var_result = self.historical_var(
                window_returns,
                portfolio_weights,
                1.0  # Normalized
            )

            # Actual return on next day
            actual_return = portfolio_returns.iloc[i]

            # Check if VaR was exceeded
            breach = actual_return < -var_result['VaR_Percent'] / 100

            results.append({
                'Date': returns.index[i],
                'VaR': var_result['VaR_Percent'],
                'Actual_Return': actual_return * 100,
                'Breach': breach
            })

        results_df = pd.DataFrame(results)

        # Calculate breach statistics
        total_breaches = results_df['Breach'].sum()
        expected_breaches = len(results_df) * self.alpha
        breach_ratio = total_breaches / len(results_df)

        print(f"\nBacktest Results ({self.confidence_level*100}% VaR):")
        print(f"Total Observations: {len(results_df)}")
        print(f"Expected Breaches: {expected_breaches:.1f}")
        print(f"Actual Breaches: {total_breaches}")
        print(f"Breach Ratio: {breach_ratio*100:.2f}%")

        return results_df

    def calculate_all_var(
        self,
        returns: pd.DataFrame,
        portfolio_weights: np.ndarray,
        portfolio_value: float,
        holding_period: int = 1
    ) -> pd.DataFrame:
        """
        Calculate VaR using all three methodologies.

        Args:
            returns: DataFrame of historical returns
            portfolio_weights: Array of portfolio weights
            portfolio_value: Total portfolio value
            holding_period: Holding period in days

        Returns:
            DataFrame comparing all VaR methods
        """
        historical = self.historical_var(
            returns, portfolio_weights, portfolio_value, holding_period
        )
        parametric = self.parametric_var(
            returns, portfolio_weights, portfolio_value, holding_period
        )
        monte_carlo = self.monte_carlo_var(
            returns, portfolio_weights, portfolio_value, holding_period
        )

        results = pd.DataFrame([historical, parametric, monte_carlo])
        return results


def main():
    """Demo the VaR Engine with sample data."""
    from data.market_data import MarketDataGenerator

    print("=" * 60)
    print("VALUE-AT-RISK ENGINE - COFCO International Risk Analytics")
    print("=" * 60)

    # Generate sample data
    generator = MarketDataGenerator()
    commodity_prices = generator.generate_commodity_data(days=504)
    returns = generator.generate_returns(commodity_prices)

    # Sample portfolio weights
    n_assets = len(returns.columns)
    weights = np.random.dirichlet(np.ones(n_assets))
    portfolio_value = 100_000_000  # $100M portfolio

    # Initialize VaR engine
    var_engine = VaREngine(confidence_level=0.99)

    # Calculate all VaR methods
    print("\n1. VaR Comparison (99% Confidence, 1-day holding):")
    print("-" * 60)
    var_results = var_engine.calculate_all_var(
        returns, weights, portfolio_value, holding_period=1
    )
    print(var_results[['Method', 'VaR_Dollar', 'ES_Dollar']].to_string(index=False))

    # 10-day VaR
    print("\n2. VaR Comparison (99% Confidence, 10-day holding):")
    print("-" * 60)
    var_results_10d = var_engine.calculate_all_var(
        returns, weights, portfolio_value, holding_period=10
    )
    print(var_results_10d[['Method', 'VaR_Dollar', 'ES_Dollar']].to_string(index=False))

    # Component VaR
    print("\n3. Component VaR Analysis:")
    print("-" * 60)
    component_var = var_engine.component_var(returns, weights, portfolio_value)
    print(component_var.to_string(index=False))

    # VaR Backtesting
    print("\n4. VaR Backtesting:")
    print("-" * 60)
    backtest = var_engine.var_backtesting(returns, weights, window=252)

    return var_results, component_var, backtest


if __name__ == "__main__":
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    main()
