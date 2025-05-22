from sqlalchemy import Column, Integer, String, JSON, ForeignKey
from sqlalchemy.orm import foreign, relationship

from database import Base


class Detections(Base):
    __tablename__ = 'detections'

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String, index=True)
    position = Column(JSON)

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
