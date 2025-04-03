from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

DATABASE_URL = 'postgresql://postgres.gzvnedcfkrdtyvhwphdu:1y0punr6cGoQkB8n@aws-0-eu-central-2.pooler.supabase.com:6543/postgres'
engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
