import math

from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Annotated, List

from auth import get_current_user
from database import SessionLocal
from models import Detection, User, Robot, TempDetection


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
    confidence: float
    robot_id: int


class MarkerList(BaseModel):
    markers: List[MarkerData]


def is_close(p1, p2, threshold=1):
    """Calcula la distancia euclidiana entre dos puntos 3D."""
    dx = p1["x"] - p2["x"]
    dy = p1["y"] - p2["y"]
    return math.sqrt(dx ** 2 + dy ** 2) < threshold

@router.get("")
async def get_detections_for_robot(
        robot_id: int = Query(..., description="ID of the robot"),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    # Verificar que el robot existe y pertenece al usuario actual
    robot = db.query(Robot).filter(Robot.id == robot_id, Robot.owner_id == current_user.id).first()
    if not robot:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access this robot's data."
        )

    # Obtener detecciones relacionadas con el robot
    detections = db.query(Detection).filter(Detection.robot_id == robot_id).all()
    return detections

@router.get("/temp")
async def get_detections_for_robot(
        robot_id: int = Query(..., description="ID of the robot"),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    # Verificar que el robot existe y pertenece al usuario actual
    robot = db.query(Robot).filter(Robot.id == robot_id, Robot.owner_id == current_user.id).first()
    if not robot:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access this robot's data."
        )

    # Obtener detecciones relacionadas con el robot
    temp_detections = db.query(TempDetection).filter(TempDetection.robot_id == robot_id).all()
    return temp_detections


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

# POST endpoint to save a temporal detection
@router.post("/temp")
def save_markers(data: MarkerList, db: Session = Depends(get_db)):
    print("entered endpoint")
    added_count = 0

    for marker in data.markers:
        new_pos = {
            "x": marker.position.x,
            "y": marker.position.y,
            "z": marker.position.z
        }

        # Buscar detecciones existentes con el mismo label
        existing_detections = db.query(TempDetection).filter_by(label=marker.name).all()

        # Verificar si alguna está dentro del umbral de 0.5m
        duplicate = any(is_close(d.position, new_pos) for d in existing_detections)

        if not duplicate:
            detection = TempDetection(label=marker.name, position=new_pos, robot_id=marker.robot_id, confidence=int(marker.confidence))
            db.add(detection)
            added_count += 1

    db.commit()
    return {"status": "created", "added": added_count}

# POST endpoint to persisit temporal detections
@router.post("/save/{temp_detection_id}")
def save_markers(temp_detection_id: int, db: Session = Depends(get_db)):
    db_temp_detection = db.query(TempDetection).filter(TempDetection.id == temp_detection_id).first()

    if not db_temp_detection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="TempDetection not found"
        )

    try:
        new_pos = {
            "x": db_temp_detection.position["x"],
            "y": db_temp_detection.position["y"],
            "z": 0
        }

        # Buscar detecciones existentes con el mismo label
        existing_detections = db.query(Detection).filter_by(label=db_temp_detection.label).all()

        # Verificar si alguna está dentro del umbral de 0.5m
        duplicate = any(is_close(d.position, new_pos) for d in existing_detections)

        if duplicate:
            db.rollback()  # Ensure no partial changes are left
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Duplicate object found closer than 0.5m"
            )

        detection = Detection(label=db_temp_detection.label, position=new_pos, robot_id=db_temp_detection.robot_id)
        db.add(detection)
        db.delete(db_temp_detection)
        db.commit()
        result = "created"

    except HTTPException:
        raise  # Re-raise HTTPException without wrapping in 500
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving temporary detection: {str(e)}."
        )

    return {"status": result}


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
        return {"status": "200"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting detection: {str(e)}"
        )

@router.delete("/temp/{temp_detection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_temp_detection(temp_detection_id: int, db: db_dependency):
    db_temp_detection = db.query(TempDetection).filter(TempDetection.id == temp_detection_id).first()

    if not db_temp_detection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="TempDetection not found"
        )

    try:
        db.delete(db_temp_detection)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting temporary detection: {str(e)}"
        )

@router.delete("/temp/remove/all", status_code=status.HTTP_204_NO_CONTENT)
async def delete_all_temp_detections(db: db_dependency):
    try:
        # Delete all records from TempDetection table
        db.query(TempDetection).delete()
        db.commit()
        return {"status": "200"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting all temporary detections: {str(e)}"
        )