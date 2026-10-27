"""Implied volatility solver for European options.

Uses a safeguarded Newton-Raphson iteration: Newton steps on vega whenever they
stay inside the current bracket, bisection otherwise. This converges in a few
iterations for typical inputs and never diverges, even deep in or out of the
money where vega is tiny.
"""

from __future__ import annotations

import math

from .black_scholes import _check_kind, greeks, price

__all__ = ["implied_vol", "ImpliedVolError"]


class ImpliedVolError(ValueError):
    """Raised when no volatility reproduces the given market price."""


def implied_vol(
    market_price: float,
    s: float,
    k: float,
    t: float,
    r: float,
    kind: str = "call",
    q: float = 0.0,
    *,
    tol: float = 1e-10,
    max_iter: int = 100,
    vol_low: float = 1e-6,
    vol_high: float = 5.0,
) -> float:
    """Return the Black-Scholes volatility matching ``market_price``.

    Raises :class:`ImpliedVolError` if the price violates no-arbitrage bounds.

    >>> round(implied_vol(4.7594, 42, 40, 0.5, 0.10, "call"), 4)
    0.2
    """
    if t <= 0:
        raise ImpliedVolError("time to maturity must be strictly positive")
    phi = _check_kind(kind)
    df_r, df_q = math.exp(-r * t), math.exp(-q * t)

    lower = max(phi * (s * df_q - k * df_r), 0.0)
    upper = s * df_q if phi == 1 else k * df_r
    if not lower - tol <= market_price <= upper + tol:
        raise ImpliedVolError(
            f"price {market_price:.6g} outside no-arbitrage bounds [{lower:.6g}, {upper:.6g}]"
        )

    lo, hi = vol_low, vol_high
    if price(s, k, t, r, hi, kind, q) < market_price:
        raise ImpliedVolError(f"implied volatility above vol_high={vol_high}")
    if price(s, k, t, r, lo, kind, q) > market_price:
        return lo

    # Brenner-Subrahmanyam initial guess, clipped to the bracket.
    sigma = math.sqrt(2.0 * math.pi / t) * market_price / s
    sigma = min(max(sigma, lo), hi)

    for _ in range(max_iter):
        g = greeks(s, k, t, r, sigma, kind, q)
        diff = g.price - market_price
        if abs(diff) < tol:
            return sigma
        if diff > 0:
            hi = sigma
        else:
            lo = sigma
        newton = sigma - diff / g.vega if g.vega > 1e-12 else math.nan
        sigma = newton if lo < newton < hi else 0.5 * (lo + hi)
        if hi - lo < tol:
            return sigma
    raise ImpliedVolError(f"no convergence after {max_iter} iterations")
