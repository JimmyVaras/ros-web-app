from fastapi import FastAPI, Request, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import roslibpy
import os

EXPECTED_TUNNEL_TOKEN = os.getenv("TUNNEL_AUTH_TOKEN")

app = FastAPI()

ALLOWED_ORIGINS = [
    "https://ros-web-app-backend.onrender.com",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ROS connection
ros = roslibpy.Ros(host='localhost', port=9090)
ros.run()


@app.get("/")
async def root():
    return {"connected": ros.is_connected}


class PublishRequest(BaseModel):
    topic: str
    type: str
    message: dict


@app.post("/publish")
async def publish_message(data: PublishRequest, x_tunnel_authorization: str = Header(None)):
    if x_tunnel_authorization != EXPECTED_TUNNEL_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing tunnel authorization token"
        )

    if not ros.is_connected:
        return {"success": False, "error": "ROS is not connected"}

    try:
        topic = roslibpy.Topic(ros, data.topic, data.type)
        topic.publish(roslibpy.Message(data.message))
        return {"success": True, "message": "Published successfully"}
    except Exception as e:
        return {"success": False, "error": str(e)}
