# --------------------
# En este archivo se definen las clases y las tablas
# de la BD del backend.
# Autor: Jaime Varas Cáceres
# --------------------

from sqlalchemy import Column, Integer, String, JSON, ForeignKey
from sqlalchemy.orm import relationship

from database import Base


class Detection(Base):
    __tablename__ = 'detections'

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String, index=True)
    position_nav = Column(JSON)
    position_obj = Column(JSON)
    robot_id = Column(Integer, ForeignKey("robots.id"))
    robot = relationship("Robot", back_populates="detections")
    room_id = Column(Integer, ForeignKey("rooms.id"))
    room = relationship("Room")


class TempDetection(Base):
    __tablename__ = 'temp_detections'

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String, index=True)
    position_nav = Column(JSON)
    position_obj = Column(JSON)
    robot_id = Column(Integer, ForeignKey("robots.id"))
    robot = relationship("Robot", back_populates="temp_detections")
    confidence = Column(Integer)
    room_id = Column(Integer, ForeignKey("rooms.id"))
    room = relationship("Room")


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    robots = relationship("Robot", back_populates="owner")


class Robot(Base):
    __tablename__ = 'robots'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    model = Column(String, unique=False)
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="robots")
    detections = relationship("Detection", back_populates="robot")
    temp_detections = relationship("TempDetection", back_populates="robot")


class Room(Base):
    __tablename__ = 'rooms'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    position_start = Column(JSON)
    position_end = Column(JSON)
    position_ref = Column(JSON)
    # TODO: Add association to user/robot
