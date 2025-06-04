from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from werkzeug.security import generate_password_hash, check_password_hash
import enum
import uuid

from config.database import db, Base
from models.role import Role

class UserStatus(enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING = "pending"

class User(Base):
    """
    Модель пользователя системы IT Service Desk
    """
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    department = Column(String(100), nullable=True)
    position = Column(String(100), nullable=True)
    role_id = Column(Integer, ForeignKey('roles.id'), nullable=False)
    status = Column(Enum(UserStatus), default=UserStatus.ACTIVE, nullable=False)
    avatar_url = Column(String(255), nullable=True)
    last_login = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    verification_token = Column(String(255), nullable=True)
    reset_password_token = Column(String(255), nullable=True)
    reset_password_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Отношения
    role = relationship("Role", back_populates="users")
    incidents_created = relationship("Incident", foreign_keys="Incident.created_by_id", back_populates="created_by")
    incidents_assigned = relationship("Incident", foreign_keys="Incident.assigned_to_id", back_populates="assigned_to")
    equipment_assigned = relationship("Equipment", back_populates="assigned_to")
    notifications = relationship("Notification", back_populates="user")
    
    def __init__(self, email, username, password, first_name, last_name, role_id, 
                 phone=None, department=None, position=None, status=UserStatus.ACTIVE,
                 avatar_url=None, is_active=True, is_verified=False):
        self.email = email
        self.username = username
        self.set_password(password)
        self.first_name = first_name
        self.last_name = last_name
        self.role_id = role_id
        self.phone = phone
        self.department = department
        self.position = position
        self.status = status
        self.avatar_url = avatar_url
        self.is_active = is_active
        self.is_verified = is_verified
        self.uuid = str(uuid.uuid4())
    
    def set_password(self, password):
        """
        Устанавливает хеш пароля для пользователя
        """
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """
        Проверяет соответствие пароля хешу
        """
        return check_password_hash(self.password_hash, password)
    
    def generate_verification_token(self):
        """
        Генерирует токен верификации для подтверждения email
        """
        self.verification_token = str(uuid.uuid4())
        return self.verification_token
    
    def verify_account(self):
        """
        Подтверждает аккаунт пользователя
        """
        self.is_verified = True
        self.verification_token = None
    
    def generate_reset_token(self, expires_in=3600):
        """
        Генерирует токен для сброса пароля с временем истечения
        """
        self.reset_password_token = str(uuid.uuid4())
        self.reset_password_expires = datetime.utcnow() + datetime.timedelta(seconds=expires_in)
        return self.reset_password_token
    
    def clear_reset_token(self):
        """
        Очищает токен сброса пароля
        """
        self.reset_password_token = None
        self.reset_password_expires = None
    
    def update_last_login(self):
        """
        Обновляет время последнего входа
        """
        self.last_login = datetime.utcnow()
    
    def is_password_reset_token_valid(self):
        """
        Проверяет, действителен ли токен сброса пароля
        """
        if not self.reset_password_token or not self.reset_password_expires:
            return False
        return datetime.utcnow() < self.reset_password_expires
    
    def get_full_name(self):
        """
        Возвращает полное имя пользователя
        """
        return f"{self.first_name} {self.last_name}"
    
    def to_dict(self):
        """
        Преобразует объект пользователя в словарь для API
        """
        return {
            'id': self.id,
            'uuid': self.uuid,
            'email': self.email,
            'username': self.username,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.get_full_name(),
            'phone': self.phone,
            'department': self.department,
            'position': self.position,
            'role_id': self.role_id,
            'role': self.role.name if self.role else None,
            'status': self.status.value,
            'avatar_url': self.avatar_url,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    def __repr__(self):
        return f"<User {self.username} ({self.email})>"