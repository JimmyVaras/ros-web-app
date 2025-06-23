from fastapi import FastAPI, APIRouter, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from models import User
from database import engine, Base
from routes import detections, ros, robots
from auth import create_access_token, verify_token, authenticate_user, hash_password, get_db

app = FastAPI()
Base.metadata.create_all(bind=engine)

origins = [
    "https://ros-web-app-backend.onrender.com",
    "https://ros-web-app-theta.vercel.app",
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

@app.post("/signup")
def signup(username: str = Form(), password: str = Form(), db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.username == username).first()
    if existing_user:
        return {"error": "User already exists"}

    new_user = User(username=username, hashed_password=hash_password(password))
    db.add(new_user)
    db.commit()
    return {"message": "User created"}

@app.post("/login")
def login(username: str = Form(), password: str = Form(), db: Session = Depends(get_db)):
    user = authenticate_user(db, username, password)
    if not user:
        return {"error": "Credenciales inválidos"}

    token = create_access_token({"sub": user.username})
    return {"access_token": token}

api_router = APIRouter()
api_router.include_router(detections.router)
api_router.include_router(ros.router)
api_router.include_router(robots.router)
app.include_router(api_router)
