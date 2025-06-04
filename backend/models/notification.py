from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Enum, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
import enum
import uuid

from config.database import db, Base

class NotificationType(enum.Enum):
    """Типы уведомлений в системе"""
    INCIDENT_CREATED = "incident_created"
    INCIDENT_UPDATED = "incident_updated"
    INCIDENT_ASSIGNED = "incident_assigned"
    INCIDENT_RESOLVED = "incident_resolved"
    INCIDENT_CLOSED = "incident_closed"
    INCIDENT_REOPENED = "incident_reopened"
    EQUIPMENT_ADDED = "equipment_added"
    EQUIPMENT_UPDATED = "equipment_updated"
    EQUIPMENT_STATUS_CHANGED = "equipment_status_changed"
    MAINTENANCE_SCHEDULED = "maintenance_scheduled"
    MAINTENANCE_COMPLETED = "maintenance_completed"
    WARRANTY_EXPIRING = "warranty_expiring"
    SYSTEM = "system"
    TASK_ASSIGNED = "task_assigned"
    COMMENT_ADDED = "comment_added"
    MENTION = "mention"

class NotificationPriority(enum.Enum):
    """Приоритеты уведомлений"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class Notification(Base):
    """
    Модель уведомлений в системе IT Service Desk
    
    Уведомления отправляются пользователям при различных событиях в системе,
    таких как создание инцидента, назначение задачи, изменение статуса оборудования и т.д.
    """
    __tablename__ = 'notifications'

    id = Column(Integer, primary_key=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()))
    
    # Пользователь, которому адресовано уведомление
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    user = relationship("User", back_populates="notifications")
    
    # Тип уведомления
    type = Column(Enum(NotificationType), default=NotificationType.SYSTEM, nullable=False)
    
    # Приоритет уведомления
    priority = Column(Enum(NotificationPriority), default=NotificationPriority.NORMAL, nullable=False)
    
    # Заголовок уведомления (опционально)
    title = Column(String(255), nullable=True)
    
    # Текст уведомления
    message = Column(Text, nullable=False)
    
    # Ссылка для перехода при клике на уведомление (опционально)
    link = Column(String(255), nullable=True)
    
    # Связанные объекты (опционально)
    related_incident_id = Column(Integer, ForeignKey('incidents.id'), nullable=True)
    related_equipment_id = Column(Integer, ForeignKey('equipment.id'), nullable=True)
    
    # Отношения к связанным объектам
    related_incident = relationship("Incident", foreign_keys=[related_incident_id])
    related_equipment = relationship("Equipment", foreign_keys=[related_equipment_id])
    
    # Статус прочтения
    is_read = Column(Boolean, default=False, nullable=False)
    read_at = Column(DateTime, nullable=True)
    
    # Возможность отметить уведомление как важное
    is_important = Column(Boolean, default=False, nullable=False)
    
    # Мета-данные в формате JSON (опционально)
    extra_data = Column(Text, nullable=True)  # JSON строка с дополнительными данными
    
    # Системные поля для отслеживания
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<Notification(id={self.id}, user_id={self.user_id}, type={self.type})>"
    
    def mark_as_read(self):
        """Отметить уведомление как прочитанное"""
        self.is_read = True
        self.read_at = datetime.utcnow()
    
    def to_dict(self):
        """Преобразовать объект уведомления в словарь для API"""
        return {
            'id': self.id,
            'uuid': self.uuid,
            'user_id': self.user_id,
            'type': self.type.value,
            'priority': self.priority.value,
            'title': self.title,
            'message': self.message,
            'link': self.link,
            'related_incident_id': self.related_incident_id,
            'related_equipment_id': self.related_equipment_id,
            'is_read': self.is_read,
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'is_important': self.is_important,
            'metadata': self.extra_data,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

# Добавляем обратную связь в модель User, если она еще не определена
from models.user import User
if not hasattr(User, 'notifications'):
    User.notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")