import pytest

from greekit import binomial_price, price


@pytest.mark.parametrize("kind", ["call", "put"])
def test_european_tree_converges_to_black_scholes(kind):
    args = (100.0, 105.0, 1.0, 0.04, 0.25)
    tree = binomial_price(*args, kind=kind, steps=2000, american=False)
    assert tree == pytest.approx(price(*args, kind=kind), abs=5e-3)


def test_american_put_has_early_exercise_premium():
    args = (100.0, 110.0, 1.0, 0.08, 0.2)
    american = binomial_price(*args, kind="put", steps=1000)
    european = price(*args, kind="put")
    assert american > european + 0.1
    assert american >= 110.0 - 100.0  # never below intrinsic value


def test_american_call_without_dividends_equals_european():
    args = (100.0, 95.0, 1.0, 0.05, 0.3)
    american = binomial_price(*args, kind="call", steps=1000)
    european = binomial_price(*args, kind="call", steps=1000, american=False)
    assert american == pytest.approx(european, abs=1e-10)


def test_invalid_steps():
    with pytest.raises(ValueError):
        binomial_price(100, 100, 1, 0.05, 0.2, steps=0)
