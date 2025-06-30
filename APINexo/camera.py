# --------------------
# Este archivo Python contiene los endpoints para la retrasmisión
# de la cámara de TurtleBot3 desde API Nexo
# Autor: Jaime Varas Cáceres
# --------------------

import base64
import threading
import cv2
import numpy as np
import roslibpy
import time

from fastapi import APIRouter, HTTPException, status, Depends, Query
from fastapi.responses import StreamingResponse


# Conexión a ROS
ros = roslibpy.Ros(host='localhost', port=9090)
ros.run()

router = APIRouter(prefix="/camera", tags=["camera"])

# Para activar/desactivar la retrasmisión y reducir la carga
stream_detections_enabled = True
stream_camera_enabled = True

# Guardado de la última imagen recibida de la cámara
latest_image = None
lock = threading.Lock()

# Subscriber que actualiza latest_image
def subscribe_to_camera():
    def callback(message):
        global latest_image
        try:
            # Decodificar la imagen base64 para sensor_msgs/CompressedImage
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
        if not stream_camera_enabled:
            time.sleep(0.5)
            continue

        with lock:
            if latest_image is not None:
                ret, jpeg = cv2.imencode('.jpg', latest_image, [int(cv2.IMWRITE_JPEG_QUALITY), 50]) # Comprimido al 50%
                frame = jpeg.tobytes()
            else:
                frame = None

        if frame:
            yield (
                b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n'
            )
        time.sleep(0.1)  # ~10 FPS

# TODO: fix auth here
@router.get("/stream")
async def stream_camera():
    return StreamingResponse(mjpeg_generator(), media_type='multipart/x-mixed-replace; boundary=frame')

@router.post("/stream/enable")
async def enable_detections_stream():
    global stream_camera_enabled
    stream_camera_enabled = True
    return {"status": "enabled"}

@router.post("/stream/disable")
async def disable_detections_stream():
    global stream_camera_enabled
    stream_camera_enabled = False
    return {"status": "disabled"}