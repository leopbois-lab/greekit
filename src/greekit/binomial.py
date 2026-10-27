"""Cox-Ross-Rubinstein binomial tree for European and American options."""

from __future__ import annotations

import math

from .black_scholes import _check_inputs, _check_kind

__all__ = ["binomial_price"]


def binomial_price(
    s: float,
    k: float,
    t: float,
    r: float,
    sigma: float,
    kind: str = "put",
    q: float = 0.0,
    *,
    steps: int = 500,
    american: bool = True,
) -> float:
    """Price an option on a CRR binomial tree.

    Set ``american=True`` (default) to allow early exercise.

    >>> round(binomial_price(50, 52, 2, 0.05, 0.30, "put", steps=2000), 2)
    7.47
    """
    _check_inputs(s, k, t, sigma)
    if t == 0 or sigma == 0:
        raise ValueError("binomial tree requires positive maturity and volatility")
    if steps < 1:
        raise ValueError("steps must be >= 1")
    phi = _check_kind(kind)

    dt = t / steps
    u = math.exp(sigma * math.sqrt(dt))
    d = 1.0 / u
    disc = math.exp(-r * dt)
    p = (math.exp((r - q) * dt) - d) / (u - d)
    if not 0.0 < p < 1.0:
        raise ValueError("arbitrage in tree: increase steps or check inputs")

    values = [max(phi * (s * u**j * d ** (steps - j) - k), 0.0) for j in range(steps + 1)]
    for i in range(steps - 1, -1, -1):
        for j in range(i + 1):
            cont = disc * (p * values[j + 1] + (1.0 - p) * values[j])
            if american:
                cont = max(cont, phi * (s * u**j * d ** (i - j) - k))
            values[j] = cont
    return values[0]
