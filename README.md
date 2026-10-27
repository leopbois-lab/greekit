# greekit

[![CI](https://github.com/leopbois-lab/greekit/actions/workflows/ci.yml/badge.svg)](https://github.com/leopbois-lab/greekit/actions/workflows/ci.yml)
![Python](https://img.shields.io/badge/python-3.9%2B-blue)
![License: MIT](https://img.shields.io/badge/license-MIT-green)

**Lightweight, dependency-free option pricing in pure Python.**

`greekit` gives you Black-Scholes-Merton prices, analytical Greeks, a robust implied
volatility solver and a binomial tree for American options, in a few hundred
readable lines with zero dependencies.

## Why?

- **QuantLib** is powerful but heavy, C++-first, and overkill for a notebook, a
  course or a quick script.
- Many small Python snippets online have **wrong theta or rho signs**, ignore
  dividends, or use an implied-vol solver that **diverges** deep in or out of the money.

`greekit` aims to be the small library you can trust and read: every formula is
tested against textbook values (Hull) and against finite differences.

## Install

```bash
pip install git+https://github.com/leopbois-lab/greekit.git
```

## Quick start

```python
from greekit import price, greeks, implied_vol, binomial_price

# European call: S=42, K=40, T=0.5y, r=10%, sigma=20%
price(42, 40, 0.5, 0.10, 0.20, "call")           # 4.7594

g = greeks(42, 40, 0.5, 0.10, 0.20, "call")
g.delta, g.gamma, g.vega, g.theta, g.rho          # (0.779, 0.0500, 8.81, -4.56, 13.98)

# Back out the volatility from a market price
implied_vol(4.7594, 42, 40, 0.5, 0.10, "call")    # 0.2000

# American put with early exercise (CRR tree)
binomial_price(50, 52, 2, 0.05, 0.30, "put")      # ~7.47
```

Dividend yields (or a foreign rate for FX options) are supported everywhere with `q=`.
Use `q=r` to price options on futures (Black-76).

### Command line

```bash
$ greekit 42 40 0.5 0.1 0.2
 price:  4.759422
 delta:  0.779131
 gamma:  0.049963
  vega:  8.813415
 theta: -4.559092
   rho:  13.982046
```

## Features

| Feature | Function |
| --- | --- |
| Black-Scholes-Merton price (calls/puts, dividend yield) | `price` |
| Analytical delta, gamma, vega, theta, rho | `greeks` |
| Implied volatility (safeguarded Newton + bisection, no-arbitrage checks) | `implied_vol` |
| European / American options on a CRR binomial tree | `binomial_price` |

**Conventions:** theta is per year (divide by 365 for daily), vega and rho per
unit change (divide by 100 for 1%).

## Roadmap

- [ ] NumPy vectorisation for pricing full option chains
- [ ] Second-order Greeks (vanna, volga, charm)
- [ ] Bachelier (normal) model for rates and negative prices
- [ ] SVI fitting of volatility smiles
- [ ] Publish on PyPI

Ideas and contributions are welcome: open an issue or see [CONTRIBUTING.md](CONTRIBUTING.md).

## Development

```bash
git clone https://github.com/leopbois-lab/greekit.git
cd greekit
pip install -e ".[dev]"
pytest
```

## License

MIT. See [LICENSE](LICENSE).
