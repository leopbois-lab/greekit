"""Black-Scholes-Merton pricing and Greeks for European options.

All functions support a continuous dividend yield ``q`` (or foreign rate for FX,
or ``q = r`` for options on futures, i.e. the Black-76 model).

Conventions
-----------
- ``s``: spot price, ``k``: strike, ``t``: time to maturity in years
- ``r``: continuously compounded risk-free rate, ``q``: dividend yield
- ``sigma``: annualised volatility
- ``kind``: ``"call"`` or ``"put"``
- ``theta`` is returned per year (divide by 365 for a daily theta)
- ``vega`` and ``rho`` are returned per unit change (divide by 100 for 1%)
"""

from __future__ import annotations

import math
from dataclasses import dataclass

__all__ = ["Greeks", "price", "greeks", "d1_d2", "norm_cdf", "norm_pdf"]

_SQRT_2PI = math.sqrt(2.0 * math.pi)


def norm_pdf(x: float) -> float:
    """Standard normal probability density function."""
    return math.exp(-0.5 * x * x) / _SQRT_2PI


def norm_cdf(x: float) -> float:
    """Standard normal cumulative distribution function."""
    return 0.5 * math.erfc(-x / math.sqrt(2.0))


def _check_kind(kind: str) -> int:
    kind = kind.lower()
    if kind in ("call", "c"):
        return 1
    if kind in ("put", "p"):
        return -1
    raise ValueError(f"kind must be 'call' or 'put', got {kind!r}")


def _check_inputs(s: float, k: float, t: float, sigma: float) -> None:
    if s <= 0 or k <= 0:
        raise ValueError("spot and strike must be strictly positive")
    if t < 0:
        raise ValueError("time to maturity must be non-negative")
    if sigma < 0:
        raise ValueError("volatility must be non-negative")


def d1_d2(s: float, k: float, t: float, r: float, sigma: float, q: float = 0.0) -> tuple[float, float]:
    """Return the Black-Scholes ``d1`` and ``d2`` terms."""
    vol_sqrt_t = sigma * math.sqrt(t)
    d1 = (math.log(s / k) + (r - q + 0.5 * sigma * sigma) * t) / vol_sqrt_t
    return d1, d1 - vol_sqrt_t


def price(s: float, k: float, t: float, r: float, sigma: float, kind: str = "call", q: float = 0.0) -> float:
    """Price a European option with the Black-Scholes-Merton formula.

    >>> round(price(42, 40, 0.5, 0.10, 0.20, "call"), 4)
    4.7594
    """
    _check_inputs(s, k, t, sigma)
    phi = _check_kind(kind)
    df_r, df_q = math.exp(-r * t), math.exp(-q * t)
    if t == 0 or sigma == 0:
        # Deterministic limit: discounted intrinsic value of the forward.
        return max(phi * (s * df_q - k * df_r), 0.0)
    d1, d2 = d1_d2(s, k, t, r, sigma, q)
    return phi * (s * df_q * norm_cdf(phi * d1) - k * df_r * norm_cdf(phi * d2))


@dataclass(frozen=True)
class Greeks:
    """Price and first/second order sensitivities of an option."""

    price: float
    delta: float
    gamma: float
    vega: float
    theta: float
    rho: float

    def as_dict(self) -> dict[str, float]:
        return {
            "price": self.price,
            "delta": self.delta,
            "gamma": self.gamma,
            "vega": self.vega,
            "theta": self.theta,
            "rho": self.rho,
        }


def greeks(s: float, k: float, t: float, r: float, sigma: float, kind: str = "call", q: float = 0.0) -> Greeks:
    """Compute the price and analytical Greeks of a European option."""
    _check_inputs(s, k, t, sigma)
    if t == 0 or sigma == 0:
        raise ValueError("Greeks are undefined for zero maturity or zero volatility")
    phi = _check_kind(kind)
    sqrt_t = math.sqrt(t)
    df_r, df_q = math.exp(-r * t), math.exp(-q * t)
    d1, d2 = d1_d2(s, k, t, r, sigma, q)
    pdf_d1 = norm_pdf(d1)

    value = phi * (s * df_q * norm_cdf(phi * d1) - k * df_r * norm_cdf(phi * d2))
    delta = phi * df_q * norm_cdf(phi * d1)
    gamma = df_q * pdf_d1 / (s * sigma * sqrt_t)
    vega = s * df_q * pdf_d1 * sqrt_t
    theta = (
        -s * df_q * pdf_d1 * sigma / (2.0 * sqrt_t)
        - phi * r * k * df_r * norm_cdf(phi * d2)
        + phi * q * s * df_q * norm_cdf(phi * d1)
    )
    rho = phi * k * t * df_r * norm_cdf(phi * d2)
    return Greeks(value, delta, gamma, vega, theta, rho)
