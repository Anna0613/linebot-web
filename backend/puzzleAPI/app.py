import os
import json
import uuid
from fastapi import FastAPI, Depends, HTTPException, status, APIRouter
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, Boolean, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker, Session, relationship, declarative_base
from pydantic import BaseModel, Json
from typing import List, Optional
from datetime import datetime

from auth_service import verify_password, get_password_hash, verify_token

# FastAPI app
app = FastAPI(title="LINE Bot Management API")

# Create API router with prefix
api_router = APIRouter(prefix="/api")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://localhost:3000",
        "http://localhost:5173",
        "https://localhost:5173",
        "http://127.0.0.1:5173",
        "https://127.0.0.1:5173",
        "http://127.0.0.1:8080",
        "https://127.0.0.1:8080",
        "http://line-login.jkl921102.org",
        "https://line-login.jkl921102.org",
        "http://puzzle-api.jkl921102.org",
        "https://puzzle-api.jkl921102.org"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
)

# Additional CORS handling
@app.middleware("http")
async def cors_handler(request, call_next):
    response = await call_next(request)
    origin = request.headers.get("origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept, Origin, X-Requested-With"
    return response

# Database configuration
DB_HOST = "sql.jkl921102.org"
DB_PORT = "5432"
DB_NAME = "LineBot_01"
DB_USER = "11131230"
DB_PASSWORD = "11131230"
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# OAuth2 scheme for JWT token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")

# Database Models
class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    username = Column(String, nullable=False, unique=True)
    password = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    email_verified = Column(Boolean, default=False)
    bots = relationship("Bot", back_populates="user")
    flex_messages = relationship("FlexMessage", back_populates="user")
    bot_codes = relationship("BotCode", back_populates="user")

class Bot(Base):
    __tablename__ = "bots"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    channel_token = Column(String, nullable=False)
    channel_secret = Column(String, nullable=False)
    user = relationship("User", back_populates="bots")
    bot_code = relationship("BotCode", back_populates="bot", uselist=False)

class FlexMessage(Base):
    __tablename__ = "flex_messages"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)  # JSON string
    user = relationship("User", back_populates="flex_messages")

class BotCode(Base):
    __tablename__ = "bot_codes"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    bot_id = Column(UUID(as_uuid=True), ForeignKey("bots.id"), nullable=False)
    code = Column(Text, nullable=False)
    user = relationship("User", back_populates="bot_codes")
    bot = relationship("Bot", back_populates="bot_code")

# Don't create tables as they already exist
# Base.metadata.create_all(bind=engine)

# Pydantic Schemas
class BotCreate(BaseModel):
    name: str
    channel_token: str
    channel_secret: str

class BotUpdate(BaseModel):
    name: Optional[str] = None
    channel_token: Optional[str] = None
    channel_secret: Optional[str] = None

class BotResponse(BaseModel):
    id: str  # UUID as string
    name: str
    channel_token: str
    channel_secret: str
    user_id: str  # UUID as string

class FlexMessageCreate(BaseModel):
    content: Json

class FlexMessageUpdate(BaseModel):
    content: Optional[Json] = None

class FlexMessageResponse(BaseModel):
    id: str  # UUID as string
    content: Json
    user_id: str  # UUID as string

class BotCodeCreate(BaseModel):
    bot_id: str  # UUID as string
    code: str

class BotCodeUpdate(BaseModel):
    code: Optional[str] = None

class BotCodeResponse(BaseModel):
    id: str  # UUID as string
    bot_id: str  # UUID as string
    code: str
    user_id: str  # UUID as string

class UserCreate(BaseModel):
    username: str
    password: str
    email: str

# Dependencies
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = verify_token(token)
        username = payload.get("username")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user

# Routes
@api_router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    db_user = User(username=user.username, password=hashed_password, email=user.email)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"message": "User created successfully"}

# Bot Management
@api_router.post("/bots", response_model=BotResponse, status_code=status.HTTP_201_CREATED)
def create_bot(bot: BotCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        # 檢查用戶是否已達到Bot數量限制
        bot_count = db.query(Bot).filter(Bot.user_id == user.id).count()
        if bot_count >= 3:
            raise HTTPException(status_code=400, detail="Maximum 3 bots allowed per user")
        
        # 檢查Bot名稱是否重複 (在同一用戶下)
        existing_bot = db.query(Bot).filter(
            Bot.name == bot.name, 
            Bot.user_id == user.id
        ).first()
        if existing_bot:
            raise HTTPException(status_code=400, detail=f"duplicate key value violates unique constraint \"unique_bot_name_per_user\"")
        
        # 創建新的Bot
        db_bot = Bot(**bot.dict(), user_id=user.id)
        db.add(db_bot)
        db.commit()
        db.refresh(db_bot)
        
        # Convert UUID to string for response
        return BotResponse(
            id=str(db_bot.id),
            name=db_bot.name,
            channel_token=db_bot.channel_token,
            channel_secret=db_bot.channel_secret,
            user_id=str(db_bot.user_id)
        )
        
    except HTTPException:
        # 重新拋出HTTPException
        raise
    except IntegrityError as e:
        # 處理資料庫完整性錯誤
        db.rollback()
        if "unique constraint" in str(e).lower():
            if "unique_bot_name_per_user" in str(e) or "name" in str(e).lower():
                raise HTTPException(status_code=400, detail="duplicate key value violates unique constraint \"unique_bot_name_per_user\"")
            else:
                raise HTTPException(status_code=400, detail="Duplicate entry detected")
        else:
            raise HTTPException(status_code=400, detail="Database constraint violation")
    except Exception as e:
        # 處理其他未預期的錯誤
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@api_router.get("/bots", response_model=List[BotResponse])
def get_bots(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bots = db.query(Bot).filter(Bot.user_id == user.id).all()
    return [
        BotResponse(
            id=str(bot.id),
            name=bot.name,
            channel_token=bot.channel_token,
            channel_secret=bot.channel_secret,
            user_id=str(bot.user_id)
        ) for bot in bots
    ]

@api_router.get("/bots/{bot_id}", response_model=BotResponse)
def get_bot(bot_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        bot_uuid = uuid.UUID(bot_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid bot ID format")
    
    bot = db.query(Bot).filter(Bot.id == bot_uuid, Bot.user_id == user.id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    return BotResponse(
        id=str(bot.id),
        name=bot.name,
        channel_token=bot.channel_token,
        channel_secret=bot.channel_secret,
        user_id=str(bot.user_id)
    )

@api_router.put("/bots/{bot_id}", response_model=BotResponse)
def update_bot(bot_id: str, bot_update: BotUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        bot_uuid = uuid.UUID(bot_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid bot ID format")
    
    bot = db.query(Bot).filter(Bot.id == bot_uuid, Bot.user_id == user.id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    for key, value in bot_update.dict(exclude_unset=True).items():
        setattr(bot, key, value)
    db.commit()
    db.refresh(bot)
    
    return BotResponse(
        id=str(bot.id),
        name=bot.name,
        channel_token=bot.channel_token,
        channel_secret=bot.channel_secret,
        user_id=str(bot.user_id)
    )

@api_router.delete("/bots/{bot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bot(bot_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        bot_uuid = uuid.UUID(bot_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid bot ID format")
    
    bot = db.query(Bot).filter(Bot.id == bot_uuid, Bot.user_id == user.id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    db.delete(bot)
    db.commit()

# Flex Message Management
@api_router.post("/messages", response_model=FlexMessageResponse, status_code=status.HTTP_201_CREATED)
def create_flex_message(message: FlexMessageCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    message_count = db.query(FlexMessage).filter(FlexMessage.user_id == user.id).count()
    if message_count >= 10:
        raise HTTPException(status_code=400, detail="Maximum 10 flex messages allowed per user")
    db_message = FlexMessage(content=json.dumps(message.content), user_id=user.id)
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return FlexMessageResponse(id=str(db_message.id), content=json.loads(db_message.content), user_id=str(db_message.user_id))

@api_router.get("/messages", response_model=List[FlexMessageResponse])
def get_flex_messages(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    messages = db.query(FlexMessage).filter(FlexMessage.user_id == user.id).all()
    return [FlexMessageResponse(id=str(m.id), content=json.loads(m.content), user_id=str(m.user_id)) for m in messages]

@api_router.get("/messages/{message_id}", response_model=FlexMessageResponse)
def get_flex_message(message_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        message_uuid = uuid.UUID(message_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid message ID format")
    
    message = db.query(FlexMessage).filter(FlexMessage.id == message_uuid, FlexMessage.user_id == user.id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Flex message not found")
    return FlexMessageResponse(id=str(message.id), content=json.loads(message.content), user_id=str(message.user_id))

@api_router.put("/messages/{message_id}", response_model=FlexMessageResponse)
def update_flex_message(message_id: str, message_update: FlexMessageUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        message_uuid = uuid.UUID(message_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid message ID format")
    
    message = db.query(FlexMessage).filter(FlexMessage.id == message_uuid, FlexMessage.user_id == user.id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Flex message not found")
    if message_update.content is not None:
        message.content = json.dumps(message_update.content)
    db.commit()
    db.refresh(message)
    return FlexMessageResponse(id=str(message.id), content=json.loads(message.content), user_id=str(message.user_id))

@api_router.delete("/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_flex_message(message_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        message_uuid = uuid.UUID(message_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid message ID format")
    
    message = db.query(FlexMessage).filter(FlexMessage.id == message_uuid, FlexMessage.user_id == user.id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Flex message not found")
    db.delete(message)
    db.commit()

@api_router.post("/messages/{message_id}/send")
def send_flex_message(message_id: str, bot_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        message_uuid = uuid.UUID(message_id)
        bot_uuid = uuid.UUID(bot_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    
    message = db.query(FlexMessage).filter(FlexMessage.id == message_uuid, FlexMessage.user_id == user.id).first()
    bot = db.query(Bot).filter(Bot.id == bot_uuid, Bot.user_id == user.id).first()
    if not message or not bot:
        raise HTTPException(status_code=404, detail="Flex message or bot not found")
    return {"message": f"Flex message {message_id} sent via bot {bot_id}"}

# Bot Code Management
@api_router.post("/codes", response_model=BotCodeResponse, status_code=status.HTTP_201_CREATED)
def create_bot_code(code: BotCodeCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    code_count = db.query(BotCode).filter(BotCode.user_id == user.id).count()
    if code_count >= 3:
        raise HTTPException(status_code=400, detail="Maximum 3 bot codes allowed per user")
    
    try:
        bot_uuid = uuid.UUID(code.bot_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid bot ID format")
    
    bot = db.query(Bot).filter(Bot.id == bot_uuid, Bot.user_id == user.id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    existing_code = db.query(BotCode).filter(BotCode.bot_id == bot_uuid).first()
    if existing_code:
        raise HTTPException(status_code=400, detail="Bot already has code")
    
    db_code = BotCode(bot_id=bot_uuid, code=code.code, user_id=user.id)
    db.add(db_code)
    db.commit()
    db.refresh(db_code)
    
    return BotCodeResponse(
        id=str(db_code.id),
        bot_id=str(db_code.bot_id),
        code=db_code.code,
        user_id=str(db_code.user_id)
    )

@api_router.get("/codes", response_model=List[BotCodeResponse])
def get_bot_codes(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    codes = db.query(BotCode).filter(BotCode.user_id == user.id).all()
    return [
        BotCodeResponse(
            id=str(code.id),
            bot_id=str(code.bot_id),
            code=code.code,
            user_id=str(code.user_id)
        ) for code in codes
    ]

@api_router.get("/codes/{code_id}", response_model=BotCodeResponse)
def get_bot_code(code_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        code_uuid = uuid.UUID(code_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid code ID format")
    
    code = db.query(BotCode).filter(BotCode.id == code_uuid, BotCode.user_id == user.id).first()
    if not code:
        raise HTTPException(status_code=404, detail="Bot code not found")
    
    return BotCodeResponse(
        id=str(code.id),
        bot_id=str(code.bot_id),
        code=code.code,
        user_id=str(code.user_id)
    )

@api_router.put("/codes/{code_id}", response_model=BotCodeResponse)
def update_bot_code(code_id: str, code_update: BotCodeUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        code_uuid = uuid.UUID(code_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid code ID format")
    
    code = db.query(BotCode).filter(BotCode.id == code_uuid, BotCode.user_id == user.id).first()
    if not code:
        raise HTTPException(status_code=404, detail="Bot code not found")
    if code_update.code is not None:
        code.code = code_update.code
    db.commit()
    db.refresh(code)
    
    return BotCodeResponse(
        id=str(code.id),
        bot_id=str(code.bot_id),
        code=code.code,
        user_id=str(code.user_id)
    )

@api_router.delete("/codes/{code_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bot_code(code_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        code_uuid = uuid.UUID(code_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid code ID format")
    
    code = db.query(BotCode).filter(BotCode.id == code_uuid, BotCode.user_id == user.id).first()
    if not code:
        raise HTTPException(status_code=404, detail="Bot code not found")
    db.delete(code)
    db.commit()

# Include API router in the main app
app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT_PUZZLE", 5503)))
