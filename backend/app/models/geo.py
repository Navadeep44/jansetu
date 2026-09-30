from sqlalchemy import JSON, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Country(Base):
    __tablename__ = "countries"
    code: Mapped[str] = mapped_column(String(2), primary_key=True)  # ISO 3166-1 alpha-2
    name: Mapped[str] = mapped_column(String(80))
    currency: Mapped[str] = mapped_column(String(3))
    languages: Mapped[list] = mapped_column(JSON, default=list)
    node_status: Mapped[str] = mapped_column(String(20), default="live")  # live | simulated


class Area(Base):
    """Lowest planning unit: a village / block (rural) or a ward / sub-prefecture (urban).
    `infra` holds 0..1 provisioning scores per sector (1 = fully served), modelled on
    India's Mission Antyodaya parameters, IBGE census and Stats SA GHS indicators."""
    __tablename__ = "areas"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    country_code: Mapped[str] = mapped_column(ForeignKey("countries.code"), index=True)
    state: Mapped[str] = mapped_column(String(80), index=True)
    district: Mapped[str] = mapped_column(String(80), index=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    aliases: Mapped[list] = mapped_column(JSON, default=list)  # native-script names for geo-resolution
    level: Mapped[str] = mapped_column(String(20))  # block | ward | subprefecture | township
    mandal: Mapped[str] = mapped_column(String(80), default="", index=True)
    village: Mapped[str] = mapped_column(String(120), default="", index=True)
    setting: Mapped[str] = mapped_column(String(10))  # rural | urban
    admin_code: Mapped[str] = mapped_column(String(40))  # LGD / IBGE / Stats SA code
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    population: Mapped[int] = mapped_column(Integer)
    households: Mapped[int] = mapped_column(Integer)
    vulnerability: Mapped[float] = mapped_column(Float)  # 0..1 composite (poverty, SC/ST, women-headed HH, disaster risk)
    connectivity: Mapped[float] = mapped_column(Float)  # 0..1 phone/internet access -> reporting propensity
    nightlights: Mapped[float] = mapped_column(Float, default=0.5)  # 0..1 normalised VIIRS radiance
    infra: Mapped[dict] = mapped_column(JSON, default=dict)
    primary_languages: Mapped[list] = mapped_column(JSON, default=list)

    country = relationship("Country")


class IndicatorHistory(Base):
    __tablename__ = "indicator_history"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    area_id: Mapped[int] = mapped_column(ForeignKey("areas.id"), index=True)
    sector: Mapped[str] = mapped_column(String(30))
    year: Mapped[int] = mapped_column(Integer)
    value: Mapped[float] = mapped_column(Float)
