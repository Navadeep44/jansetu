"""Spatial statistics: Getis-Ord Gi* hotspot detection over planning areas
(k-nearest-neighbour binary weights, self included), computed per country."""
import math

from app.services.geo.gazetteer import haversine_km


def getis_ord_gi_star(points: list[dict], value_key: str = "value", k: int = 4) -> dict[int, dict]:
    """points: [{id, lat, lng, value}] -> {id: {z, p, class}}"""
    n = len(points)
    if n < 3:
        return {p["id"]: {"z": 0.0, "p": 1.0, "class": "not_significant"} for p in points}
    xs = [float(p[value_key]) for p in points]
    mean = sum(xs) / n
    s = math.sqrt(max(sum(x * x for x in xs) / n - mean * mean, 1e-12))
    out = {}
    kk = min(k, n - 1)
    for i, p in enumerate(points):
        d = sorted(((haversine_km(p["lat"], p["lng"], q["lat"], q["lng"]), j) for j, q in enumerate(points) if j != i))
        neigh = [i] + [j for _, j in d[:kk]]
        w_sum = len(neigh)
        lag = sum(xs[j] for j in neigh)
        num = lag - mean * w_sum
        den = s * math.sqrt((n * w_sum - w_sum ** 2) / (n - 1))
        z = num / den if den > 0 else 0.0
        pval = math.erfc(abs(z) / math.sqrt(2))
        cls = ("hot_99" if z >= 2.58 else "hot_95" if z >= 1.96 else "hot_90" if z >= 1.65 else
               "cold_95" if z <= -1.96 else "not_significant")
        out[p["id"]] = {"z": round(z, 2), "p": round(pval, 3), "class": cls}
    return out
