import time
import math
from typing import Annotated, Dict

from fastapi import Depends, APIRouter, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse

from models import User, Detection
from auth import get_current_user, get_current_user_from_request
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


def publish_goal(position_dict_obj, position_dict_nav):
    def yaw_to_quaternion(yaw):
        q = {}
        q['x'] = 0.0
        q['y'] = 0.0
        q['z'] = math.sin(yaw / 2.0)
        q['w'] = math.cos(yaw / 2.0)
        return q

    dx = position_dict_obj['x'] - position_dict_nav['x']
    dy = position_dict_obj['y'] - position_dict_nav['y']
    yaw = math.atan2(dy, dx)
    quat = yaw_to_quaternion(yaw)

    message = {
        'header': {
            'stamp': {'secs': 0, 'nsecs': 0},
            'frame_id': 'map'
        },
        'pose': {
            'position': {
                'x': position_dict_nav['x'],
                'y': position_dict_nav['y'],
                'z': 0.0
            },
            'orientation': {
                'x': quat['x'],
                'y': quat['y'],
                'z': quat['z'],
                'w': quat['w']
            }
        }
    }

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
        return True
    except requests.RequestException as e:
        print(f"Failed to publish goal: {e}")
        return False



# POST endpoint to navigate to the detection
@router.post("/{detection_id}/navigate")
async def navigate_detection(detection_id: int, db: db_dependency, current_user: User = Depends(get_current_user)):
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="You don't have permission to do that"
        )

    db_detection = db.query(Detection).filter(Detection.id == detection_id).first()

    if not db_detection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Detection not found"
        )

    try:
        result = publish_goal(db_detection.position_obj, db_detection.position_nav)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Invalid request: {str(e)}")

    return {"message": "Navigation goal published", "position": str(db_detection.position_nav), "status": str(result)}

@router.post("/navigate")
def navigate_coords(position: Dict[str, float], current_user: User = Depends(get_current_user)):
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="You don't have permission to do that"
        )

    try:
        result = publish_goal(position)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Invalid request: {str(e)}")

    return {"message": "Navigation goal published", "position": position, "status": result}

# TODO: Date-time watermarks in images
@router.get("/proxy-camera")
def proxy_camera(current_user: User = Depends(get_current_user_from_request)):
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="You don't have permission to do that"
        )

    headers={
        'X-Tunnel-Authorization': 'tunnel ' + token
    }

    r = requests.get(f"{tunnel_url}/camera/stream", headers=headers, stream=True)

    return StreamingResponse(r.raw, media_type=r.headers.get("content-type", "image/jpeg"))

@router.get("/proxy-map")
def proxy_map(current_user: User = Depends(get_current_user_from_request)):
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="You don't have permission to do that"
        )

    headers={
        'X-Tunnel-Authorization': 'tunnel ' + token
    }

    r = requests.get(f"{tunnel_url}/map/snapshot", headers=headers, stream=True)

    return StreamingResponse(r.raw, media_type=r.headers.get("content-type", "image/jpeg"))

@router.get("/proxy-detections")
def proxy_camera(current_user: User = Depends(get_current_user_from_request)):
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="You don't have permission to do that"
        )

    headers={
        'X-Tunnel-Authorization': 'tunnel ' + token
    }

    r = requests.get(f"{tunnel_url}/detections/stream", headers=headers, stream=True)

    return StreamingResponse(r.raw, media_type=r.headers.get("content-type", "image/jpeg"))

@router.post("/move-back")
def move_backwards():
    try:
        response = requests.post(
            tunnel_url + "/move-back",
            headers={
                'X-Tunnel-Authorization': 'tunnel ' + token
            },
            timeout=5
        )
        response.raise_for_status()
        print("Message successfully published via API.")
        return True
    except requests.RequestException as e:
        print(f"Failed to move back: {e}")
        return False

@router.post("/camera/stream/disable")
def disable_stream_camera():
    try:
        response = requests.post(
            tunnel_url + "/camera/stream/disable",
            headers={
                'X-Tunnel-Authorization': 'tunnel ' + token
            },
            timeout=5
        )
        response.raise_for_status()
        print("Message successfully published via API.")
        return True
    except requests.RequestException as e:
        print(f"Failed to disable camera stream: {e}")
        return False

@router.post("/camera/stream/enable")
def enable_stream_camera():
    try:
        response = requests.post(
            tunnel_url + "/camera/stream/enable",
            headers={
                'X-Tunnel-Authorization': 'tunnel ' + token
            },
            timeout=5
        )
        response.raise_for_status()
        print("Message successfully published via API.")
        return True
    except requests.RequestException as e:
        print(f"Failed to enable camera stream: {e}")
        return False