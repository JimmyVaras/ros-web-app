from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Annotated
import models
from database import engine, SessionLocal

app = FastAPI()
models.Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*']
)


class Detection(BaseModel):
    label: str
    position: str


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]

@app.get("/")
async def root():
    return {"message": "This is the root endpoint of the app, Jimmy"}

@app.get("/detections/")
async def get_all_detections(db: db_dependency):
    detections = db.query(models.Detections).all()
    return detections

@app.post("/detections/")
async def create_detections(detection: Detection, db: db_dependency):
    db_detection = models.Detections(label=detection.label, position=detection.position)
    db.add(db_detection)
    db.commit()
    db.refresh(db_detection)
