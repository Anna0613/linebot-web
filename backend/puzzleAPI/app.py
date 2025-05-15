from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import sessionmaker, Session, relationship, declarative_base
from pydantic import BaseModel, Json
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import List, Optional
import os
import json

# FastAPI app
app = FastAPI(title="LINE Bot Management API")

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


# JWT configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")

# Database Models
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, nullable=False, unique=True)
    password = Column(Text, nullable=False)
    email = Column(String, nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    email_verified = Column(Boolean, default=False)
    bots = relationship("Bot", back_populates="user")
    flex_messages = relationship("FlexMessage", back_populates="user")
    bot_codes = relationship("BotCode", back_populates="user")

class Bot(Base):
    __tablename__ = "bots"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    channel_token = Column(String, nullable=False)
    channel_secret = Column(String, nullable=False)
    user = relationship("User", back_populates="bots")
    bot_code = relationship("BotCode", back_populates="bot", uselist=False)

class FlexMessage(Base):
    __tablename__ = "flex_messages"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)  # JSON string
    user = relationship("User", back_populates="flex_messages")

class BotCode(Base):
    __tablename__ = "bot_codes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bot_id = Column(Integer, ForeignKey("bots.id"), nullable=False)
    code = Column(Text, nullable=False)
    user = relationship("User", back_populates="bot_codes")
    bot = relationship("Bot", back_populates="bot_code")

# Create tables
Base.metadata.create_all(bind=engine)

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
    id: int
    name: str
    channel_token: str
    channel_secret: str
    user_id: int

class FlexMessageCreate(BaseModel):
    content: Json

class FlexMessageUpdate(BaseModel):
    content: Optional[Json] = None

class FlexMessageResponse(BaseModel):
    id: int
    content: Json
    user_id: int

class BotCodeCreate(BaseModel):
    bot_id: int
    code: str

class BotCodeUpdate(BaseModel):
    code: Optional[str] = None

class BotCodeResponse(BaseModel):
    id: int
    bot_id: int
    code: str
    user_id: int

class Token(BaseModel):
    access_token: str
    token_type: str

class UserCreate(BaseModel):
    username: str
    password: str
    email: str

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# JWT Authentication
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

# Routes
@app.post("/users", status_code=status.HTTP_201_CREATED)
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

@app.post("/token", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_types": "bearer"}

# Bot Management
@app.post("/bots", response_model=BotResponse, status_code=status.HTTP_201_CREATED)
def create_bot(bot: BotCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bot_count = db.query(Bot).filter(Bot.user_id == user.id).count()
    if bot_count >= 3:
        raise HTTPException(status_code=400, detail="Maximum 3 bots allowed per user")
    db_bot = Bot(**bot.dict(), user_id=user.id)
    db.add(db_bot)
    db.commit()
    db.refresh(db_bot)
    return db_bot

@app.get("/bots", response_model=List[BotResponse])
def get_bots(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Bot).filter(Bot.user_id == user.id).all()

@app.get("/bots/{bot_id}", response_model=BotResponse)
def get_bot(bot_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bot = db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == user.id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    return bot

@app.put("/bots/{bot_id}", response_model=BotResponse)
def update_bot(bot_id: int, bot_update: BotUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bot = db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == user.id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    for key, value in bot_update.dict(exclude_unset=True).items():
        setattr(bot, key, value)
    db.commit()
    db.refresh(bot)
    return bot

@app.delete("/bots/{bot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bot(bot_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bot = db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == user.id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    db.delete(bot)
    db.commit()

# Flex Message Management
@app.post("/messages", response_model=FlexMessageResponse, status_code=status.HTTP_201_CREATED)
def create_flex_message(message: FlexMessageCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    message_count = db.query(FlexMessage).filter(FlexMessage.user_id == user.id).count()
    if message_count >= 10:
        raise HTTPException(status_code=400, detail="Maximum 10 flex messages allowed per user")
    db_message = FlexMessage(content=json.dumps(message.content), user_id=user.id)
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return FlexMessageResponse(id=db_message.id, content=json.loads(db_message.content), user_id=db_message.user_id)

@app.get("/messages", response_model=List[FlexMessageResponse])
def get_flex_messages(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    messages = db.query(FlexMessage).filter(FlexMessage.user_id == user.id).all()
    return [FlexMessageResponse(id=m.id, content=json.loads(m.content), user_id=m.user_id) for m in messages]

@app.get("/messages/{message_id}", response_model=FlexMessageResponse)
def get_flex_message(message_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    message = db.query(FlexMessage).filter(FlexMessage.id == message_id, FlexMessage.user_id == user.id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Flex message not found")
    return FlexMessageResponse(id=message.id, content=json.loads(message.content), user_id=message.user_id)

@app.put("/messages/{message_id}", response_model=FlexMessageResponse)
def update_flex_message(message_id: int, message_update: FlexMessageUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    message = db.query(FlexMessage).filter(FlexMessage.id == message_id, FlexMessage.user_id == user.id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Flex message not found")
    if message_update.content is not None:
        message.content = json.dumps(message_update.content)
    db.commit()
    db.refresh(message)
    return FlexMessageResponse(id=message.id, content=json.loads(message.content), user_id=message.user_id)

@app.delete("/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_flex_message(message_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    message = db.query(FlexMessage).filter(FlexMessage.id == message_id, FlexMessage.user_id == user.id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Flex message not found")
    db.delete(message)
    db.commit()

@app.post("/messages/{message_id}/send")
def send_flex_message(message_id: int, bot_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    message = db.query(FlexMessage).filter(FlexMessage.id == message_id, FlexMessage.user_id == user.id).first()
    bot = db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == user.id).first()
    if not message or not bot:
        raise HTTPException(status_code=404, detail="Flex message or bot not found")
    # Placeholder for sending logic (requires LINE Messaging API integration)
    return {"message": f"Flex message {message_id} sent via bot {bot_id}"}

# Bot Code Management
@app.post("/codes", response_model=BotCodeResponse, status_code=status.HTTP_201_CREATED)
def create_bot_code(code: BotCodeCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    code_count = db.query(BotCode).filter(BotCode.user_id == user.id).count()
    if code_count >= 3:
        raise HTTPException(status_code=400, detail="Maximum 3 bot codes allowed per user")
    bot = db.query(Bot).filter(Bot.id == code.bot_id, Bot.user_id == user.id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    existing_code = db.query(BotCode).filter(BotCode.bot_id == code.bot_id).first()
    if existing_code:
        raise HTTPException(status_code=400, detail="Bot already has code")
    db_code = BotCode(**code.dict(), user_id=user.id)
    db.add(db_code)
    db.commit()
    db.refresh(db_code)
    return db_code

@app.get("/codes", response_model=List[BotCodeResponse])
def get_bot_codes(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(BotCode).filter(BotCode.user_id == user.id).all()

@app.get("/codes/{code_id}", response_model=BotCodeResponse)
def get_bot_code(code_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    code = db.query(BotCode).filter(BotCode.id == code_id, BotCode.user_id == user.id).first()
    if not code:
        raise HTTPException(status_code=404, detail="Bot code not found")
    return code

@app.put("/codes/{code_id}", response_model=BotCodeResponse)
def update_bot_code(code_id: int, code_update: BotCodeUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    code = db.query(BotCode).filter(BotCode.id == code_id, BotCode.user_id == user.id).first()
    if not code:
        raise HTTPException(status_code=404, detail="Bot code not found")
    if code_update.code is not None:
        code.code = code_update.code
    db.commit()
    db.refresh(code)
    return code

@app.delete("/codes/{code_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bot_code(code_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    code = db.query(BotCode).filter(BotCode.id == code_id, BotCode.user_id == user.id).first()
    if not code:
        raise HTTPException(status_code=404, detail="Bot code not found")
    db.delete(code)
    db.commit()