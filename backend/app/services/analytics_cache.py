"""Tiny versioned cache: analytics are recomputed only after data changes."""
_state = {"version": 0, "store": {}}


def bump():
    _state["version"] += 1
    _state["store"].clear()


def cached(key, fn):
    k = (key, _state["version"])
    if k not in _state["store"]:
        _state["store"][k] = fn()
    return _state["store"][k]
