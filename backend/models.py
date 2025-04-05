from sqlalchemy import Column, Integer, String, JSON
from database import Base


class Detections(Base):
    __tablename__ = 'detections'

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String, index=True)
    position = Column(JSON)
