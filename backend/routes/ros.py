import time
from typing import Annotated

import roslibpy
from fastapi import Depends, APIRouter, HTTPException, status
from sqlalchemy.orm import Session

import models
from database import SessionLocal


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]

router = APIRouter(prefix="/ros", tags=["ros"])


class RosbridgeGoalPublisher:
    def __init__(self, host='localhost', port=9090):
        self.client = roslibpy.Ros(host=host, port=port)
        self.publisher = roslibpy.Topic(self.client, '/move_base_simple/goal', 'geometry_msgs/PoseStamped')

    def publish_goal(self, position_dict):
        self.client.run()
        print(position_dict)
        if not self.client.is_connected:
            raise ConnectionError("Could not connect to rosbridge server.")

        message = {
            'header': {
                'stamp': {'secs': 0, 'nsecs': 0},
                'frame_id': 'map'
            },
            'pose': {
                'position': {
                    'x': position_dict['x'],
                    'y': position_dict['y'],
                    'z': position_dict.get('z', 0.0)
                },
                'orientation': {
                    'x': 0.0,
                    'y': 0.0,
                    'z': 0.0,
                    'w': 1.0
                }
            }
        }

        self.publisher.publish(roslibpy.Message(message))


goal_publisher = RosbridgeGoalPublisher(host='localhost', port=9090)  # set your ROS host IP here


# POST endpoint to navigate to the detection
@router.post("/{detection_id}/navigate")
async def navigate(detection_id: int, db: db_dependency):
    db_detection = db.query(models.Detections).filter(models.Detections.id == detection_id).first()

    if not db_detection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Detection not found"
        )

    try:
        # position = json.loads(db_detection.position)  # fix single quotes
        goal_publisher.publish_goal(db_detection.position)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Invalid position format: {str(e)}")

    return {"message": "Navigation goal published", "position": db_detection.position}
