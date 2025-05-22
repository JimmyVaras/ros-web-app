from fastapi import FastAPI, Request, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import roslibpy
import os

from fastapi.responses import StreamingResponse
import threading
import cv2
import numpy as np
import base64
import time

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

latest_image = None
lock = threading.Lock()

# Subscriber que actualiza latest_image
def subscribe_to_camera():
    def callback(message):
        global latest_image
        try:
            # Decodificar la imagen base64 si estás usando rosbridge con sensor_msgs/CompressedImage
            img_data = base64.b64decode(message['data'])
            np_arr = np.frombuffer(img_data, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            with lock:
                latest_image = frame
        except Exception as e:
            print(f"Error decoding image: {e}")

    image_topic = roslibpy.Topic(ros, '/camera/rgb/image_raw/compressed', 'sensor_msgs/CompressedImage')
    image_topic.subscribe(callback)

# Lanza el thread de suscripción al iniciar
threading.Thread(target=subscribe_to_camera, daemon=True).start()

# Generador MJPEG
def mjpeg_generator():
    while True:
        with lock:
            if latest_image is not None:
                ret, jpeg = cv2.imencode('.jpg', latest_image)
                frame = jpeg.tobytes()
            else:
                frame = None

        if frame:
            yield (
                b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n'
            )
        time.sleep(0.1)  # ~10 FPS

@app.get("/camera/stream")
async def stream_camera(x_tunnel_authorization: str = Header(None)):
    if False:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing tunnel authorization token"
        )

    return StreamingResponse(mjpeg_generator(), media_type='multipart/x-mixed-replace; boundary=frame')
