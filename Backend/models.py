from sqlalchemy import Column, String, DateTime, Text, Float, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timezone
import uuid

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

class Report(Base):
    __tablename__ = 'reports'

    report_id = Column(String(36), primary_key=True, default=generate_uuid)
    telegram_chat_id = Column(String(32), nullable=False, index=True)
    crop_type = Column(String(128))
    detected_disease = Column(String(256))
    prescribed_chemical = Column(Text)
    farmer_feedback = Column(Text)
    status = Column(String(20), default='OPEN', nullable=False) # 'OPEN', 'CLOSED_SUCCESS', 'CLOSED_FAILED', 'HUMAN_ESCALATION'
    confidence_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

# Setup SQLite database connection
DATABASE_URL = "sqlite:///mourchid.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
