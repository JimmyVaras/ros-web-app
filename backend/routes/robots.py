from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import get_current_user, get_db  # Your auth dependency
from models import Robot, User

router = APIRouter(prefix="/robots", tags=["robots"])

@router.get("/my-robots", response_model=list[dict])
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