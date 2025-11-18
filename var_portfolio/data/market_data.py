"""
Market Data Generator for Commodity and FX Markets
Simulates realistic market data for agricultural commodities and FX pairs
relevant to COFCO International's trading activities.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional


class MarketDataGenerator:
    """Generate synthetic market data for commodities and FX pairs."""

    def __init__(self, seed: int = 42):
        np.random.seed(seed)

        # Agricultural commodities traded by COFCO
        self.commodities = {
            'CORN': {'price': 450, 'vol': 0.25, 'unit': 'USD/bushel'},
            'SOYBEAN': {'price': 1350, 'vol': 0.22, 'unit': 'USD/bushel'},
            'WHEAT': {'price': 650, 'vol': 0.28, 'unit': 'USD/bushel'},
            'SUGAR': {'price': 22, 'vol': 0.30, 'unit': 'USD/lb'},
            'PALM_OIL': {'price': 3800, 'vol': 0.26, 'unit': 'MYR/tonne'},
            'SOYBEAN_OIL': {'price': 58, 'vol': 0.24, 'unit': 'USD/lb'},
            'SOYBEAN_MEAL': {'price': 380, 'vol': 0.23, 'unit': 'USD/ton'},
        }

        # FX pairs relevant to APAC commodity trading
        self.fx_pairs = {
            'USDCNY': {'rate': 7.25, 'vol': 0.05},
            'USDSGD': {'rate': 1.34, 'vol': 0.04},
            'USDBRL': {'rate': 4.95, 'vol': 0.15},
            'USDMYR': {'rate': 4.45, 'vol': 0.06},
            'USDINR': {'rate': 83.5, 'vol': 0.05},
            'EURUSD': {'rate': 1.08, 'vol': 0.07},
            'USDARS': {'rate': 350, 'vol': 0.35},
        }

    def generate_price_series(
        self,
        initial_price: float,
        volatility: float,
        days: int = 252,
        mu: float = 0.0
    ) -> np.ndarray:
        """
        Generate price series using Geometric Brownian Motion.

        Args:
            initial_price: Starting price
            volatility: Annual volatility
            days: Number of trading days
            mu: Annual drift (expected return)

        Returns:
            Array of simulated prices
        """
        dt = 1/252  # Daily time step
        prices = np.zeros(days)
        prices[0] = initial_price

        for t in range(1, days):
            dW = np.random.standard_normal()
            prices[t] = prices[t-1] * np.exp(
                (mu - 0.5 * volatility**2) * dt +
                volatility * np.sqrt(dt) * dW
            )

        return prices

    def generate_commodity_data(
        self,
        days: int = 252,
        start_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """
        Generate historical price data for all commodities.

        Args:
            days: Number of trading days
            start_date: Starting date for the series

        Returns:
            DataFrame with commodity prices
        """
        if start_date is None:
            start_date = datetime.now() - timedelta(days=days)

        dates = pd.date_range(start=start_date, periods=days, freq='B')
        data = {'Date': dates}

        for commodity, params in self.commodities.items():
            prices = self.generate_price_series(
                params['price'],
                params['vol'],
                days
            )
            data[commodity] = prices

        return pd.DataFrame(data).set_index('Date')

    def generate_fx_data(
        self,
        days: int = 252,
        start_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """
        Generate historical FX rate data.

        Args:
            days: Number of trading days
            start_date: Starting date for the series

        Returns:
            DataFrame with FX rates
        """
        if start_date is None:
            start_date = datetime.now() - timedelta(days=days)

        dates = pd.date_range(start=start_date, periods=days, freq='B')
        data = {'Date': dates}

        for pair, params in self.fx_pairs.items():
            rates = self.generate_price_series(
                params['rate'],
                params['vol'],
                days
            )
            data[pair] = rates

        return pd.DataFrame(data).set_index('Date')

    def generate_returns(self, prices: pd.DataFrame) -> pd.DataFrame:
        """Calculate log returns from price series."""
        return np.log(prices / prices.shift(1)).dropna()

    def generate_correlation_matrix(
        self,
        returns: pd.DataFrame
    ) -> pd.DataFrame:
        """Calculate correlation matrix from returns."""
        return returns.corr()

    def generate_portfolio_positions(
        self,
        num_positions: int = 20
    ) -> pd.DataFrame:
        """
        Generate sample portfolio positions for commodities and FX.

        Args:
            num_positions: Number of positions to generate

        Returns:
            DataFrame with position details
        """
        commodities = list(self.commodities.keys())
        fx_pairs = list(self.fx_pairs.keys())
        all_instruments = commodities + fx_pairs

        positions = []
        for i in range(num_positions):
            instrument = np.random.choice(all_instruments)
            position_type = np.random.choice(['LONG', 'SHORT'])

            if instrument in commodities:
                # Commodity position in contracts
                quantity = np.random.randint(10, 500) * (1 if position_type == 'LONG' else -1)
                price = self.commodities[instrument]['price']
                notional = abs(quantity) * price * 100  # Contract multiplier
            else:
                # FX position in millions
                quantity = np.random.randint(1, 50) * (1 if position_type == 'LONG' else -1)
                price = self.fx_pairs[instrument]['rate']
                notional = abs(quantity) * 1_000_000

            positions.append({
                'Position_ID': f'POS_{i+1:03d}',
                'Instrument': instrument,
                'Type': 'Commodity' if instrument in commodities else 'FX',
                'Direction': position_type,
                'Quantity': quantity,
                'Entry_Price': price * (1 + np.random.uniform(-0.05, 0.05)),
                'Current_Price': price,
                'Notional_USD': notional,
                'Desk': np.random.choice(['APAC_Grains', 'APAC_Oilseeds', 'LATAM_Sugar', 'FX_Hedging']),
            })

        return pd.DataFrame(positions)

    def generate_options_portfolio(
        self,
        num_options: int = 15
    ) -> pd.DataFrame:
        """
        Generate sample options portfolio for commodity options.

        Args:
            num_options: Number of option positions

        Returns:
            DataFrame with options positions
        """
        commodities = list(self.commodities.keys())

        options = []
        for i in range(num_options):
            underlying = np.random.choice(commodities)
            spot = self.commodities[underlying]['price']
            vol = self.commodities[underlying]['vol']

            option_type = np.random.choice(['CALL', 'PUT'])
            # Strike around current spot
            strike = spot * np.random.uniform(0.85, 1.15)
            # Time to expiry 1-12 months
            tte = np.random.randint(20, 252) / 252

            options.append({
                'Option_ID': f'OPT_{i+1:03d}',
                'Underlying': underlying,
                'Option_Type': option_type,
                'Strike': round(strike, 2),
                'Spot': spot,
                'Time_to_Expiry': round(tte, 3),
                'Volatility': vol,
                'Risk_Free_Rate': 0.05,
                'Contracts': np.random.randint(10, 200) * np.random.choice([1, -1]),
                'Desk': np.random.choice(['APAC_Options', 'Hedging']),
            })

        return pd.DataFrame(options)


def main():
    """Demo the market data generator."""
    generator = MarketDataGenerator()

    print("=" * 60)
    print("MARKET DATA GENERATOR - COFCO International Risk Analytics")
    print("=" * 60)

    # Generate commodity data
    commodity_prices = generator.generate_commodity_data(days=252)
    print("\nCommodity Prices (Last 5 days):")
    print(commodity_prices.tail())

    # Generate FX data
    fx_rates = generator.generate_fx_data(days=252)
    print("\nFX Rates (Last 5 days):")
    print(fx_rates.tail())

    # Generate returns
    commodity_returns = generator.generate_returns(commodity_prices)
    print("\nCommodity Returns Statistics:")
    print(commodity_returns.describe())

    # Generate portfolio
    portfolio = generator.generate_portfolio_positions(20)
    print("\nSample Portfolio Positions:")
    print(portfolio.head(10))

    # Generate options portfolio
    options = generator.generate_options_portfolio(10)
    print("\nSample Options Portfolio:")
    print(options)

    return commodity_prices, fx_rates, portfolio, options


if __name__ == "__main__":
    main()
