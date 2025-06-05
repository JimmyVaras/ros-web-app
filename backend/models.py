from sqlalchemy import Column, Integer, String, JSON, ForeignKey
from sqlalchemy.orm import relationship

from database import Base


class Detection(Base):
    __tablename__ = 'detections'

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String, index=True)
    position = Column(JSON)
    robot_id = Column(Integer, ForeignKey("robots.id"))
    robot = relationship("Robot", back_populates="detections")

class TempDetection(Base):
    __tablename__ = 'temp_detections'

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String, index=True)
    position = Column(JSON)
    robot_id = Column(Integer, ForeignKey("robots.id"))
    robot = relationship("Robot", back_populates="temp_detections")
    confidence = Column(Integer)

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

