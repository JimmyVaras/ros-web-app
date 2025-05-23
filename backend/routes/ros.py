import time
from typing import Annotated

from fastapi import Depends, APIRouter, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse

import models
from database import SessionLocal
import requests
import os

tunnel_url = os.getenv('TUNNEL_URL')
token = os.getenv('TUNNEL_AUTH_TOKEN')

now = time.time()
secs = int(now)
nsecs = int((now - secs) * 1e9)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]

router = APIRouter(prefix="/ros", tags=["ros"])


def publish_goal(position_dict):
    message = {
        'header': {
            'stamp': {'secs': 0, 'nsecs': 0},  # You can later update with real ROS time
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

    print(token)
    print(tunnel_url)

    try:
        response = requests.post(
            tunnel_url + "/publish",
            headers={
                'X-Tunnel-Authorization': 'tunnel ' + token
            },
            json={
                'topic': '/move_base_simple/goal',
                'type': 'geometry_msgs/PoseStamped',
                'message': message
            },
            timeout=5
        )
        response.raise_for_status()
        print("Goal successfully published via API.")
    except requests.RequestException as e:
        print(f"Failed to publish goal: {e}")


# POST endpoint to navigate to the detection
@router.post("/{detection_id}/navigate")
async def navigate(detection_id: int, db: db_dependency):
    db_detection = db.query(models.Detection).filter(models.Detection.id == detection_id).first()

    if not db_detection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Detection not found"
        )

    try:
        publish_goal(db_detection.position)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Invalid request: {str(e)}")

    return {"message": "Navigation goal published", "position": db_detection.position}

# Authentication required for theses 2 proxies
@router.get("/proxy-camera")
def proxy_camera():
    headers={
        'X-Tunnel-Authorization': 'tunnel ' + token
    }

    r = requests.get(f"{tunnel_url}/camera/stream", headers=headers, stream=True)

    return StreamingResponse(r.raw, media_type=r.headers.get("content-type", "image/jpeg"))

@router.get("/proxy-map")
def proxy_map():
    headers={
        'X-Tunnel-Authorization': 'tunnel ' + token
    }

    r = requests.get(f"{tunnel_url}/map/snapshot", headers=headers, stream=True)

    return StreamingResponse(r.raw, media_type=r.headers.get("content-type", "image/jpeg"))