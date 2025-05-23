from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from starlette import status

from auth import get_current_user, get_db  # Your auth dependency
from models import Robot, User

router = APIRouter(prefix="/robots", tags=["robots"])

@router.get("", response_model=list[dict])
async def get_user_robots(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # Ensures the user is authenticated
):

    robots = db.query(Robot).filter(Robot.owner_id == current_user.id).all()

    if not robots:
        return []  # Return empty list if no robots found

    return [
        {
            "id": robot.id,
            "name": robot.name,
            "model": robot.model,
            "owner_id": robot.owner_id
        }
        for robot in robots
    ]

@router.get("/{robot_id}", response_model=dict)
async def get_robot_by_id(
        robot_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)  # Ensures the user is authenticated
):
    # Query the robot with the given ID that belongs to the current user
    robot = db.query(Robot).filter(
        Robot.id == robot_id,
        Robot.owner_id == current_user.id
    ).first()

    if not robot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Robot not found or you don't have permission to access it"
        )

    return {
        "id": robot.id,
        "name": robot.name,
        "model": robot.model,
        "owner_id": robot.owner_id
    }