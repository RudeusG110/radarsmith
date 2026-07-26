from datetime import datetime
from uuid import UUID, uuid4

from app.database.database import Base
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql.schema import UniqueConstraint


class Radar(Base):
    __tablename__ = "radar"

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    purpose: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    quadrants: Mapped[list["RadarQuadrant"]] = relationship(
        back_populates="radar", cascade="all, delete-orphan", order_by="RadarQuadrant.position"
    )
    rings: Mapped[list["RadarRing"]] = relationship(back_populates="radar", cascade="all, delete-orphan", order_by="RadarRing.position")
    blips: Mapped[list["RadarBlip"]] = relationship(back_populates="radar", cascade="all, delete-orphan", order_by="RadarBlip.created_at")


class RadarQuadrant(Base):
    __tablename__ = "radar_quadrant"
    __table_args__ = (
        UniqueConstraint("radar_id", "position", name="uq_radar_quadrant_position"),
        UniqueConstraint("radar_id", "name", name="uq_radar_quadrant_name"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    radar_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("radar.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    radar: Mapped[Radar] = relationship(back_populates="quadrants")
    blips: Mapped[list["RadarBlip"]] = relationship(back_populates="quadrant")


class RadarRing(Base):
    __tablename__ = "radar_ring"
    __table_args__ = (
        UniqueConstraint("radar_id", "position", name="uq_radar_ring_position"),
        UniqueConstraint("radar_id", "name", name="uq_radar_ring_name"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    radar_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("radar.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    radar: Mapped[Radar] = relationship(back_populates="rings")
    blips: Mapped[list["RadarBlip"]] = relationship(back_populates="ring")


class RadarBlip(Base):
    __tablename__ = "radar_blip"

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    radar_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("radar.id", ondelete="CASCADE"), index=True)
    quadrant_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("radar_quadrant.id", ondelete="CASCADE"), index=True)
    ring_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("radar_ring.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    radar: Mapped[Radar] = relationship(back_populates="blips")
    quadrant: Mapped[RadarQuadrant] = relationship(back_populates="blips")
    ring: Mapped[RadarRing] = relationship(back_populates="blips")
