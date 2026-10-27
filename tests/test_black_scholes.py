import math

import pytest

from greekit import greeks, price

# Reference values: Hull, "Options, Futures and Other Derivatives", Example 15.6
S, K, T, R, SIGMA = 42.0, 40.0, 0.5, 0.10, 0.20


def test_reference_values():
    assert price(S, K, T, R, SIGMA, "call") == pytest.approx(4.7594, abs=1e-4)
    assert price(S, K, T, R, SIGMA, "put") == pytest.approx(0.8086, abs=1e-4)


@pytest.mark.parametrize("q", [0.0, 0.03])
@pytest.mark.parametrize("k", [20.0, 40.0, 42.0, 80.0])
def test_put_call_parity(k, q):
    call = price(S, k, T, R, SIGMA, "call", q)
    put = price(S, k, T, R, SIGMA, "put", q)
    assert call - put == pytest.approx(S * math.exp(-q * T) - k * math.exp(-R * T), abs=1e-10)


def test_zero_maturity_is_intrinsic():
    assert price(50, 40, 0, R, SIGMA, "call") == pytest.approx(10.0)
    assert price(50, 40, 0, R, SIGMA, "put") == 0.0


@pytest.mark.parametrize("kind", ["call", "put"])
@pytest.mark.parametrize("q", [0.0, 0.02])
def test_greeks_match_finite_differences(kind, q):
    g = greeks(S, K, T, R, SIGMA, kind, q)
    h = 1e-4

    def p(s=S, t=T, r=R, sigma=SIGMA):
        return price(s, K, t, r, sigma, kind, q)

    assert g.price == pytest.approx(p(), abs=1e-12)
    assert g.delta == pytest.approx((p(s=S + h) - p(s=S - h)) / (2 * h), abs=1e-6)
    assert g.gamma == pytest.approx((p(s=S + h) - 2 * p() + p(s=S - h)) / h**2, abs=1e-4)
    assert g.vega == pytest.approx((p(sigma=SIGMA + h) - p(sigma=SIGMA - h)) / (2 * h), abs=1e-6)
    assert g.rho == pytest.approx((p(r=R + h) - p(r=R - h)) / (2 * h), abs=1e-6)
    # theta is the sensitivity to the passage of time, i.e. -dV/dT
    assert g.theta == pytest.approx(-(p(t=T + h) - p(t=T - h)) / (2 * h), abs=1e-5)


def test_invalid_inputs():
    with pytest.raises(ValueError):
        price(-1, K, T, R, SIGMA)
    with pytest.raises(ValueError):
        price(S, K, T, R, SIGMA, "straddle")
    with pytest.raises(ValueError):
        greeks(S, K, 0, R, SIGMA)
