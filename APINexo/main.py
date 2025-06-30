# --------------------
# Este archivo principal de la API Nexo
# Autor: Jaime Varas Cáceres
# --------------------

from fastapi import FastAPI, Request, Header, HTTPException, status, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import roslibpy
from PIL import Image, ImageDraw
from io import BytesIO

from fastapi.responses import StreamingResponse
import threading
import cv2
import numpy as np
import base64
import time
import subprocess

import camera
from aux import move_backwards

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

# Enpoint base
@app.get("/")
async def root():
    return {"connected": ros.is_connected}


class PublishRequest(BaseModel):
    topic: str
    type: str
    message: dict

lock = threading.Lock()

@app.post("/publish")
async def publish_message(data: PublishRequest):
    if not ros.is_connected:
        return {"success": False, "error": "ROS is not connected"}

    try:
        topic = roslibpy.Topic(ros, data.topic, data.type)
        topic.publish(roslibpy.Message(data.message))
        return {"success": True, "message": "Published successfully"}
    except Exception as e:
        return {"success": False, "error": str(e)}


latest_map = None
latest_pose = None

def subscribe_topics():
    def map_callback(msg):
        global latest_map
        latest_map = msg

    def pose_callback(msg):
        global latest_pose
        latest_pose = msg

    roslibpy.Topic(ros, '/map', 'nav_msgs/OccupancyGrid').subscribe(map_callback)
    roslibpy.Topic(ros, '/amcl_pose', 'geometry_msgs/PoseWithCovarianceStamped').subscribe(pose_callback)

threading.Thread(target=subscribe_topics, daemon=True).start()

@app.get("/map/snapshot")
async def map_snapshot():
    if not latest_map or not latest_pose:
        raise HTTPException(status_code=503, detail="Map or pose not available")

    width = latest_map['info']['width']
    height = latest_map['info']['height']
    resolution = latest_map['info']['resolution']
    origin = latest_map['info']['origin']['position']
    data = latest_map['data']

    # Create an RGB image
    img = Image.new('RGB', (width, height), color='white')

    # Convert the map data to RGB format
    rgb_data = []
    for val in data:
        if val == -1:  # Unknown - typically shown as gray
            rgb = (128, 128, 128)
        else:
            # Convert occupancy value (0-100) to grayscale then to RGB
            intensity = 255 - int(val * 2.55)  # Convert 0-100 to 255-0
            rgb = (intensity, intensity, intensity)
        rgb_data.append(rgb)

    img.putdata(rgb_data)
    img = img.transpose(Image.FLIP_TOP_BOTTOM)

    x = latest_pose['pose']['pose']['position']['x']
    y = latest_pose['pose']['pose']['position']['y']
    px = int((x - origin['x']) / resolution)
    py = height - int((y - origin['y']) / resolution)

    draw = ImageDraw.Draw(img)
    draw.ellipse((px - 5, py - 5, px + 5, py + 5), fill="red")

    buffer = BytesIO()
    img.save(buffer, format='JPEG')
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="image/jpeg")

latest_detections_image = None

def subscribe_to_detections_image():
    def callback(message):
        global latest_detections_image
        try:
            img_data = base64.b64decode(message['data'])
            np_arr = np.frombuffer(img_data, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            with lock:
                latest_detections_image = frame
        except Exception as e:
            print(f"Error decoding detections image: {e}")

    image_topic = roslibpy.Topic(ros, '/yolo_detections/image/compressed', 'sensor_msgs/CompressedImage')
    image_topic.subscribe(callback)

threading.Thread(target=subscribe_to_detections_image, daemon=True).start()
stream_detections_enabled = True

@app.get("/detections/stream")
async def stream_detections():
    def generator():
        while True:
            if not stream_detections_enabled:
                time.sleep(0.5)
                continue # skips the stream encoding

            with lock:
                if latest_detections_image is not None:
                    ret, jpeg = cv2.imencode('.jpg', latest_detections_image, [int(cv2.IMWRITE_JPEG_QUALITY), 50])
                    frame = jpeg.tobytes()
                else:
                    frame = None

            if frame:
                yield (
                    b'--frame\r\n'
                    b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n'
                )
            time.sleep(0.1)

    return StreamingResponse(generator(), media_type='multipart/x-mixed-replace; boundary=frame')

# TODO implementar llamadas en frontend
@app.post("/detections/stream/enable")
async def enable_detections_stream():
    global stream_detections_enabled
    stream_detections_enabled = True
    return {"status": "enabled"}

@app.post("/detections/stream/disable")
async def disable_detections_stream():
    global stream_detections_enabled
    stream_detections_enabled = False
    return {"status": "disabled"}

@app.post("/move-back")
async def move_back():
    move_backwards()
    return {"status": "published"}

patrol_process = None

@app.post("/start_patrol")
def start_patrol():
    global patrol_process
    if patrol_process is not None and patrol_process.poll() is None:
        return {"status": "already running"}

    # Ajusta el comando según tu nodo y ruta
    command = [
        "roslaunch",
        "jimmy_tools_pkg",
        "patrol.launch"
    ]

    patrol_process = subprocess.Popen(command)
    return {"status": "patrol started"}

# TODO: no se elimina el último destino... Mandar a inicio al apagar el patrol?
@app.post("/stop_patrol")
def stop_patrol():
    global patrol_process
    if patrol_process is None or patrol_process.poll() is not None:
        return {"status": "patrol not running"}

    patrol_process.terminate()  # envía SIGTERM
    patrol_process.wait(timeout=5)
    patrol_process = None
    return {"status": "patrol stopped"}

api_router = APIRouter()
api_router.include_router(camera.router)
app.include_router(api_router)