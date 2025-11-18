"""
Options Greeks Calculator
Implements Black-Scholes model for pricing commodity options
and calculating Greeks (Delta, Gamma, Vega, Theta, Rho).
"""

import numpy as np
import pandas as pd
from scipy.stats import norm
from typing import Dict, List, Tuple, Optional


class OptionsGreeksCalculator:
    """
    Calculate option prices and Greeks using Black-Scholes model.
    Suitable for European-style commodity options.
    """

    def __init__(self):
        """Initialize the Greeks calculator."""
        pass

    def d1(
        self,
        S: float,
        K: float,
        T: float,
        r: float,
        sigma: float
    ) -> float:
        """Calculate d1 parameter for Black-Scholes."""
        return (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))

    def d2(
        self,
        S: float,
        K: float,
        T: float,
        r: float,
        sigma: float
    ) -> float:
        """Calculate d2 parameter for Black-Scholes."""
        return self.d1(S, K, T, r, sigma) - sigma * np.sqrt(T)

    def black_scholes_price(
        self,
        S: float,
        K: float,
        T: float,
        r: float,
        sigma: float,
        option_type: str = 'CALL'
    ) -> float:
        """
        Calculate Black-Scholes option price.

        Args:
            S: Current spot price
            K: Strike price
            T: Time to expiration (in years)
            r: Risk-free interest rate
            sigma: Volatility
            option_type: 'CALL' or 'PUT'

        Returns:
            Option price
        """
        d1 = self.d1(S, K, T, r, sigma)
        d2 = self.d2(S, K, T, r, sigma)

        if option_type.upper() == 'CALL':
            price = S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
        else:  # PUT
            price = K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)

        return price

    def delta(
        self,
        S: float,
        K: float,
        T: float,
        r: float,
        sigma: float,
        option_type: str = 'CALL'
    ) -> float:
        """
        Calculate Delta - sensitivity to underlying price change.

        Delta represents the change in option price for a $1 change in underlying.
        """
        d1 = self.d1(S, K, T, r, sigma)

        if option_type.upper() == 'CALL':
            return norm.cdf(d1)
        else:  # PUT
            return norm.cdf(d1) - 1

    def gamma(
        self,
        S: float,
        K: float,
        T: float,
        r: float,
        sigma: float
    ) -> float:
        """
        Calculate Gamma - rate of change of Delta.

        Gamma represents the change in Delta for a $1 change in underlying.
        Same for both calls and puts.
        """
        d1 = self.d1(S, K, T, r, sigma)
        return norm.pdf(d1) / (S * sigma * np.sqrt(T))

    def vega(
        self,
        S: float,
        K: float,
        T: float,
        r: float,
        sigma: float
    ) -> float:
        """
        Calculate Vega - sensitivity to volatility changes.

        Vega represents the change in option price for a 1% change in volatility.
        Same for both calls and puts. Returned per 1% vol change.
        """
        d1 = self.d1(S, K, T, r, sigma)
        return S * norm.pdf(d1) * np.sqrt(T) / 100  # Per 1% vol change

    def theta(
        self,
        S: float,
        K: float,
        T: float,
        r: float,
        sigma: float,
        option_type: str = 'CALL'
    ) -> float:
        """
        Calculate Theta - time decay (per day).

        Theta represents the change in option price for one day passage of time.
        """
        d1 = self.d1(S, K, T, r, sigma)
        d2 = self.d2(S, K, T, r, sigma)

        first_term = -(S * norm.pdf(d1) * sigma) / (2 * np.sqrt(T))

        if option_type.upper() == 'CALL':
            second_term = -r * K * np.exp(-r * T) * norm.cdf(d2)
        else:  # PUT
            second_term = r * K * np.exp(-r * T) * norm.cdf(-d2)

        return (first_term + second_term) / 365  # Per day

    def rho(
        self,
        S: float,
        K: float,
        T: float,
        r: float,
        sigma: float,
        option_type: str = 'CALL'
    ) -> float:
        """
        Calculate Rho - sensitivity to interest rate changes.

        Rho represents the change in option price for a 1% change in interest rate.
        """
        d2 = self.d2(S, K, T, r, sigma)

        if option_type.upper() == 'CALL':
            return K * T * np.exp(-r * T) * norm.cdf(d2) / 100
        else:  # PUT
            return -K * T * np.exp(-r * T) * norm.cdf(-d2) / 100

    def calculate_all_greeks(
        self,
        S: float,
        K: float,
        T: float,
        r: float,
        sigma: float,
        option_type: str = 'CALL',
        contracts: int = 1,
        multiplier: int = 100
    ) -> Dict[str, float]:
        """
        Calculate all Greeks for an option position.

        Args:
            S: Current spot price
            K: Strike price
            T: Time to expiration (in years)
            r: Risk-free interest rate
            sigma: Volatility
            option_type: 'CALL' or 'PUT'
            contracts: Number of contracts (positive for long, negative for short)
            multiplier: Contract multiplier

        Returns:
            Dictionary with all Greeks and option value
        """
        position_size = contracts * multiplier

        price = self.black_scholes_price(S, K, T, r, sigma, option_type)

        return {
            'Option_Type': option_type,
            'Spot': S,
            'Strike': K,
            'Time_to_Expiry': T,
            'Volatility': sigma * 100,  # As percentage
            'Price': price,
            'Position_Value': price * position_size,
            'Delta': self.delta(S, K, T, r, sigma, option_type) * position_size,
            'Gamma': self.gamma(S, K, T, r, sigma) * position_size,
            'Vega': self.vega(S, K, T, r, sigma) * position_size,
            'Theta': self.theta(S, K, T, r, sigma, option_type) * position_size,
            'Rho': self.rho(S, K, T, r, sigma, option_type) * position_size,
            'Contracts': contracts
        }

    def portfolio_greeks(
        self,
        options_df: pd.DataFrame
    ) -> Tuple[pd.DataFrame, Dict[str, float]]:
        """
        Calculate Greeks for entire options portfolio.

        Args:
            options_df: DataFrame with columns:
                - Underlying, Option_Type, Strike, Spot,
                - Time_to_Expiry, Volatility, Risk_Free_Rate, Contracts

        Returns:
            Tuple of (detailed results DataFrame, aggregated portfolio Greeks)
        """
        results = []

        for _, row in options_df.iterrows():
            greeks = self.calculate_all_greeks(
                S=row['Spot'],
                K=row['Strike'],
                T=row['Time_to_Expiry'],
                r=row['Risk_Free_Rate'],
                sigma=row['Volatility'],
                option_type=row['Option_Type'],
                contracts=row['Contracts']
            )
            greeks['Option_ID'] = row.get('Option_ID', '')
            greeks['Underlying'] = row['Underlying']
            results.append(greeks)

        results_df = pd.DataFrame(results)

        # Aggregate portfolio Greeks
        portfolio_summary = {
            'Total_Value': results_df['Position_Value'].sum(),
            'Total_Delta': results_df['Delta'].sum(),
            'Total_Gamma': results_df['Gamma'].sum(),
            'Total_Vega': results_df['Vega'].sum(),
            'Total_Theta': results_df['Theta'].sum(),
            'Total_Rho': results_df['Rho'].sum(),
            'Num_Positions': len(results_df)
        }

        return results_df, portfolio_summary

    def delta_hedge_ratio(
        self,
        S: float,
        K: float,
        T: float,
        r: float,
        sigma: float,
        option_type: str,
        contracts: int,
        multiplier: int = 100
    ) -> Dict[str, float]:
        """
        Calculate hedge ratio for delta-neutral hedging.

        Args:
            S: Current spot price
            K: Strike price
            T: Time to expiration
            r: Risk-free rate
            sigma: Volatility
            option_type: 'CALL' or 'PUT'
            contracts: Number of option contracts
            multiplier: Contract multiplier

        Returns:
            Dictionary with hedging requirements
        """
        delta = self.delta(S, K, T, r, sigma, option_type)
        position_delta = delta * contracts * multiplier

        # Hedge requires opposite position in underlying
        hedge_units = -position_delta
        hedge_value = hedge_units * S

        return {
            'Option_Delta': delta,
            'Position_Delta': position_delta,
            'Hedge_Units': hedge_units,
            'Hedge_Value': hedge_value,
            'Hedge_Direction': 'SELL' if hedge_units < 0 else 'BUY'
        }

    def implied_volatility(
        self,
        market_price: float,
        S: float,
        K: float,
        T: float,
        r: float,
        option_type: str = 'CALL',
        max_iterations: int = 100,
        tolerance: float = 1e-6
    ) -> float:
        """
        Calculate implied volatility using Newton-Raphson method.

        Args:
            market_price: Observed market price of option
            S: Current spot price
            K: Strike price
            T: Time to expiration
            r: Risk-free rate
            option_type: 'CALL' or 'PUT'
            max_iterations: Maximum iterations for convergence
            tolerance: Convergence tolerance

        Returns:
            Implied volatility
        """
        sigma = 0.3  # Initial guess

        for _ in range(max_iterations):
            price = self.black_scholes_price(S, K, T, r, sigma, option_type)
            vega = self.vega(S, K, T, r, sigma) * 100  # Actual vega

            if vega < 1e-10:
                break

            diff = market_price - price

            if abs(diff) < tolerance:
                break

            sigma += diff / vega
            sigma = max(0.001, min(5.0, sigma))  # Bound sigma

        return sigma

    def volatility_surface(
        self,
        S: float,
        r: float,
        strikes: List[float],
        expiries: List[float],
        market_prices: np.ndarray,
        option_type: str = 'CALL'
    ) -> pd.DataFrame:
        """
        Build implied volatility surface from market prices.

        Args:
            S: Current spot price
            r: Risk-free rate
            strikes: List of strike prices
            expiries: List of expiration times
            market_prices: 2D array of market prices [strikes x expiries]
            option_type: 'CALL' or 'PUT'

        Returns:
            DataFrame with implied volatility surface
        """
        results = []

        for i, K in enumerate(strikes):
            for j, T in enumerate(expiries):
                iv = self.implied_volatility(
                    market_prices[i, j], S, K, T, r, option_type
                )
                results.append({
                    'Strike': K,
                    'Expiry': T,
                    'Moneyness': S / K,
                    'Implied_Vol': iv * 100
                })

        return pd.DataFrame(results)


def main():
    """Demo the Options Greeks Calculator."""
    print("=" * 60)
    print("OPTIONS GREEKS CALCULATOR - COFCO International Risk Analytics")
    print("=" * 60)

    calculator = OptionsGreeksCalculator()

    # Example: Soybean call option
    S = 1350  # Spot price
    K = 1400  # Strike price
    T = 0.25  # 3 months to expiry
    r = 0.05  # Risk-free rate
    sigma = 0.22  # Volatility

    print("\n1. Single Option Analysis - Soybean Call:")
    print("-" * 60)

    greeks = calculator.calculate_all_greeks(
        S, K, T, r, sigma, 'CALL', contracts=100
    )

    for key, value in greeks.items():
        if isinstance(value, float):
            print(f"  {key}: {value:,.4f}")
        else:
            print(f"  {key}: {value}")

    # Portfolio analysis
    print("\n2. Portfolio Greeks Analysis:")
    print("-" * 60)

    # Create sample options portfolio
    from data.market_data import MarketDataGenerator
    generator = MarketDataGenerator()
    options_portfolio = generator.generate_options_portfolio(10)

    results_df, portfolio_summary = calculator.portfolio_greeks(options_portfolio)

    print("\nIndividual Option Greeks:")
    print(results_df[['Option_ID', 'Underlying', 'Option_Type', 'Delta', 'Gamma', 'Vega', 'Theta']].to_string(index=False))

    print("\nPortfolio Summary:")
    for key, value in portfolio_summary.items():
        print(f"  {key}: {value:,.2f}")

    # Delta hedging
    print("\n3. Delta Hedging Analysis:")
    print("-" * 60)

    hedge = calculator.delta_hedge_ratio(
        S=1350, K=1400, T=0.25, r=0.05, sigma=0.22,
        option_type='CALL', contracts=100
    )

    for key, value in hedge.items():
        if isinstance(value, float):
            print(f"  {key}: {value:,.2f}")
        else:
            print(f"  {key}: {value}")

    # Implied volatility
    print("\n4. Implied Volatility Calculation:")
    print("-" * 60)

    market_price = 45.0  # Observed market price
    iv = calculator.implied_volatility(
        market_price, S, K, T, r, 'CALL'
    )
    print(f"  Market Price: ${market_price}")
    print(f"  Implied Volatility: {iv*100:.2f}%")

    return results_df, portfolio_summary


if __name__ == "__main__":
    import sys
    sys.path.insert(0, '/home/user/var_portfolio')
    main()
