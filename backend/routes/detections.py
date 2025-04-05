from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Annotated
from database import SessionLocal
import models


class DetectionDTO(BaseModel):
    label: str
    position: str


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]

router = APIRouter(prefix="/detections", tags=["detections"])


@router.get("/")
async def get_all_detections(db: db_dependency):
    detections = db.query(models.Detections).all()
    return detections


# POST endpoint with proper imports
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_detection(detection: DetectionDTO, db: db_dependency):
    try:
        db_detection = models.Detections(
            label=detection.label,
            position=detection.position
        )
        db.add(db_detection)
        db.commit()
        db.refresh(db_detection)
        return db_detection
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating detection: {str(e)}"
        )


@router.delete("/{detection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_detection(detection_id: int, db: db_dependency):
    db_detection = db.query(models.Detections).filter(models.Detections.id == detection_id).first()

    if not db_detection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Detection not found"
        )

    try:
        db.delete(db_detection)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting detection: {str(e)}"
        )