"""Command-line interface: ``python -m greekit S K T R SIGMA [--put] [--q Q]``."""

from __future__ import annotations

import argparse

from .black_scholes import greeks


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="greekit", description="Black-Scholes price and Greeks")
    parser.add_argument("s", type=float, help="spot price")
    parser.add_argument("k", type=float, help="strike")
    parser.add_argument("t", type=float, help="time to maturity (years)")
    parser.add_argument("r", type=float, help="risk-free rate, e.g. 0.03")
    parser.add_argument("sigma", type=float, help="volatility, e.g. 0.2")
    parser.add_argument("--put", action="store_true", help="price a put (default: call)")
    parser.add_argument("--q", type=float, default=0.0, help="dividend yield")
    args = parser.parse_args(argv)

    kind = "put" if args.put else "call"
    for name, value in greeks(args.s, args.k, args.t, args.r, args.sigma, kind, args.q).as_dict().items():
        print(f"{name:>6}: {value: .6f}")


if __name__ == "__main__":
    main()
