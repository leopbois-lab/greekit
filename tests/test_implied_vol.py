import pytest

from greekit import ImpliedVolError, implied_vol, price


@pytest.mark.parametrize("kind", ["call", "put"])
@pytest.mark.parametrize("k", [50.0, 90.0, 100.0, 110.0, 160.0])
@pytest.mark.parametrize("sigma", [0.05, 0.2, 0.6, 1.5])
def test_round_trip(kind, k, sigma):
    s, t, r, q = 100.0, 0.75, 0.03, 0.01
    p = price(s, k, t, r, sigma, kind, q)
    intrinsic = price(s, k, t, r, 0.0, kind, q)
    if p - intrinsic < 1e-8:
        pytest.skip("time value below numerical precision, volatility not identifiable")
    assert implied_vol(p, s, k, t, r, kind, q) == pytest.approx(sigma, abs=1e-6)


def test_price_above_upper_bound_raises():
    with pytest.raises(ImpliedVolError):
        implied_vol(150.0, 100, 100, 1, 0.02, "call")


def test_price_below_intrinsic_raises():
    with pytest.raises(ImpliedVolError):
        implied_vol(1.0, 100, 80, 1, 0.0, "call")


def test_zero_maturity_raises():
    with pytest.raises(ImpliedVolError):
        implied_vol(5.0, 100, 100, 0, 0.02)
