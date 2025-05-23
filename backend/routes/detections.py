import math

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Annotated, List
from database import SessionLocal
from models import Detection


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]

router = APIRouter(prefix="/detections", tags=["detections"])


class MarkerPosition(BaseModel):
    x: float
    y: float
    z: float


class MarkerData(BaseModel):
    name: str
    position: MarkerPosition


class MarkerList(BaseModel):
    markers: List[MarkerData]


def is_close(p1, p2, threshold=1):
    """Calcula la distancia euclidiana entre dos puntos 3D."""
    dx = p1["x"] - p2["x"]
    dy = p1["y"] - p2["y"]
    dz = p1["z"] - p2["z"]
    return math.sqrt(dx ** 2 + dy ** 2 + dz ** 2) < threshold


@router.get("")
async def get_all_detections(db: db_dependency):
    detections = db.query(Detection).all()
    return detections


# POST endpoint to save detections
@router.post("")
def save_markers(data: MarkerList, db: Session = Depends(get_db)):
    added_count = 0

    for marker in data.markers:
        new_pos = {
            "x": marker.position.x,
            "y": marker.position.y,
            "z": marker.position.z
        }

        # Buscar detecciones existentes con el mismo label
        existing_detections = db.query(Detection).filter_by(label=marker.name).all()

        # Verificar si alguna está dentro del umbral de 0.5m
        duplicate = any(is_close(d.position, new_pos) for d in existing_detections)

        if not duplicate:
            detection = Detection(label=marker.name, position=new_pos, robot_id=marker.robot_id)
            db.add(detection)
            added_count += 1

    db.commit()
    return {"status": "created", "added": added_count}


@router.delete("/{detection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_detection(detection_id: int, db: db_dependency):
    db_detection = db.query(Detection).filter(Detection.id == detection_id).first()

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
