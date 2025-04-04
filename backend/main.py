from fastapi import FastAPI, Depends, APIRouter
from fastapi.middleware.cors import CORSMiddleware

import models
from database import engine
from routes import detections

app = FastAPI()
models.Base.metadata.create_all(bind=engine)

origins = [
    "https://ros-web-app-backend.onrender.com",
    "https://ros-web-app-theta.vercel.app/",
    "http://localhost:3000",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "This is the root endpoint of the app, Jimmy"}

api_router = APIRouter()
api_router.include_router(detections.router)
app.include_router(api_router)