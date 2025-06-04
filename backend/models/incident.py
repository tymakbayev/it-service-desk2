from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Enum, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
import enum
import uuid

from config.database import db, Base
from models.user import User
from models.equipment import Equipment

class IncidentStatus(enum.Enum):
    NEW = "new"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    ON_HOLD = "on_hold"
    RESOLVED = "resolved"
    CLOSED = "closed"
    REOPENED = "reopened"
    CANCELED = "canceled"

class IncidentPriority(enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class IncidentCategory(enum.Enum):
    HARDWARE = "hardware"
    SOFTWARE = "software"
    NETWORK = "network"
    ACCESS = "access"
    EMAIL = "email"
    PRINTER = "printer"
    OTHER = "other"

class IncidentImpact(enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class Incident(Base):
    """
    Модель инцидента в системе IT Service Desk
    """
    __tablename__ = 'incidents'

    id = Column(Integer, primary_key=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(Enum(IncidentStatus), default=IncidentStatus.NEW, nullable=False)
    priority = Column(Enum(IncidentPriority), default=IncidentPriority.MEDIUM, nullable=False)
    category = Column(Enum(IncidentCategory), default=IncidentCategory.OTHER, nullable=False)
    impact = Column(Enum(IncidentImpact), default=IncidentImpact.MEDIUM, nullable=False)
    
    # Внешние ключи
    created_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    assigned_to_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    equipment_id = Column(Integer, ForeignKey('equipment.id'), nullable=True)
    
    # Даты и время
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    assigned_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    
    # Метрики и SLA
    sla_due_date = Column(DateTime, nullable=True)
    resolution_time = Column(Float, nullable=True)  # в часах
    response_time = Column(Float, nullable=True)  # в часах
    is_sla_breached = Column(Integer, default=0, nullable=False)  # 0 - нет, 1 - да
    
    # Дополнительные поля
    resolution_notes = Column(Text, nullable=True)
    internal_notes = Column(Text, nullable=True)
    root_cause = Column(String(255), nullable=True)
    solution = Column(Text, nullable=True)
    
    # Отношения
    created_by = relationship("User", foreign_keys=[created_by_id], backref="incidents_created")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], backref="incidents_assigned")
    equipment = relationship("Equipment", backref="incidents")
    comments = relationship("IncidentComment", backref="incident", cascade="all, delete-orphan")
    attachments = relationship("IncidentAttachment", backref="incident", cascade="all, delete-orphan")
    history = relationship("IncidentHistory", backref="incident", cascade="all, delete-orphan")
    
    def __init__(self, title, description, created_by_id, status=IncidentStatus.NEW, 
                 priority=IncidentPriority.MEDIUM, category=IncidentCategory.OTHER, 
                 impact=IncidentImpact.MEDIUM, equipment_id=None, assigned_to_id=None):
        self.uuid = str(uuid.uuid4())
        self.title = title
        self.description = description
        self.status = status
        self.priority = priority
        self.category = category
        self.impact = impact
        self.created_by_id = created_by_id
        self.equipment_id = equipment_id
        self.assigned_to_id = assigned_to_id
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        
        if assigned_to_id:
            self.assigned_at = datetime.utcnow()
    
    def to_dict(self):
        """
        Преобразует объект инцидента в словарь
        """
        return {
            'id': self.id,
            'uuid': self.uuid,
            'title': self.title,
            'description': self.description,
            'status': self.status.value if self.status else None,
            'priority': self.priority.value if self.priority else None,
            'category': self.category.value if self.category else None,
            'impact': self.impact.value if self.impact else None,
            'created_by_id': self.created_by_id,
            'assigned_to_id': self.assigned_to_id,
            'equipment_id': self.equipment_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'assigned_at': self.assigned_at.isoformat() if self.assigned_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'closed_at': self.closed_at.isoformat() if self.closed_at else None,
            'sla_due_date': self.sla_due_date.isoformat() if self.sla_due_date else None,
            'resolution_time': self.resolution_time,
            'response_time': self.response_time,
            'is_sla_breached': bool(self.is_sla_breached),
            'resolution_notes': self.resolution_notes,
            'internal_notes': self.internal_notes,
            'root_cause': self.root_cause,
            'solution': self.solution
        }
    
    def assign(self, user_id):
        """
        Назначает инцидент пользователю
        """
        self.assigned_to_id = user_id
        self.assigned_at = datetime.utcnow()
        self.status = IncidentStatus.ASSIGNED
        self.updated_at = datetime.utcnow()
    
    def resolve(self, resolution_notes=None, solution=None, root_cause=None):
        """
        Отмечает инцидент как разрешенный
        """
        self.status = IncidentStatus.RESOLVED
        self.resolved_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        
        if resolution_notes:
            self.resolution_notes = resolution_notes
        
        if solution:
            self.solution = solution
            
        if root_cause:
            self.root_cause = root_cause
            
        # Расчет времени разрешения в часах
        if self.assigned_at:
            delta = self.resolved_at - self.assigned_at
            self.resolution_time = delta.total_seconds() / 3600
    
    def close(self):
        """
        Закрывает инцидент
        """
        self.status = IncidentStatus.CLOSED
        self.closed_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def reopen(self):
        """
        Переоткрывает закрытый инцидент
        """
        self.status = IncidentStatus.REOPENED
        self.closed_at = None
        self.resolved_at = None
        self.updated_at = datetime.utcnow()
    
    def calculate_sla(self, sla_hours=24):
        """
        Рассчитывает дату выполнения SLA на основе приоритета
        """
        if not self.sla_due_date:
            # Разное время SLA в зависимости от приоритета
            priority_multipliers = {
                IncidentPriority.LOW: 2.0,      # 48 часов для низкого приоритета
                IncidentPriority.MEDIUM: 1.0,   # 24 часа для среднего приоритета
                IncidentPriority.HIGH: 0.5,     # 12 часов для высокого приоритета
                IncidentPriority.CRITICAL: 0.25 # 6 часов для критического приоритета
            }
            
            multiplier = priority_multipliers.get(self.priority, 1.0)
            hours = sla_hours * multiplier
            
            from datetime import timedelta
            self.sla_due_date = self.created_at + timedelta(hours=hours)
    
    def check_sla_breach(self):
        """
        Проверяет, нарушен ли SLA для инцидента
        """
        if not self.sla_due_date:
            self.calculate_sla()
            
        if self.status not in [IncidentStatus.RESOLVED, IncidentStatus.CLOSED]:
            now = datetime.utcnow()
            if now > self.sla_due_date:
                self.is_sla_breached = 1
            else:
                self.is_sla_breached = 0
        
        return bool(self.is_sla_breached)
    
    def save(self):
        """
        Сохраняет изменения в инциденте
        """
        db.session.add(self)
        db.session.commit()
    
    def delete(self):
        """
        Удаляет инцидент из базы данных
        """
        db.session.delete(self)
        db.session.commit()

class IncidentComment(Base):
    """
    Модель комментария к инциденту
    """
    __tablename__ = 'incident_comments'
    
    id = Column(Integer, primary_key=True)
    incident_id = Column(Integer, ForeignKey('incidents.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    text = Column(Text, nullable=False)
    is_internal = Column(Integer, default=0, nullable=False)  # 0 - публичный, 1 - внутренний
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Отношения
    user = relationship("User", backref="incident_comments")
    
    def to_dict(self):
        return {
            'id': self.id,
            'incident_id': self.incident_id,
            'user_id': self.user_id,
            'text': self.text,
            'is_internal': bool(self.is_internal),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'user': self.user.to_dict() if self.user else None
        }

class IncidentAttachment(Base):
    """
    Модель вложения к инциденту
    """
    __tablename__ = 'incident_attachments'
    
    id = Column(Integer, primary_key=True)
    incident_id = Column(Integer, ForeignKey('incidents.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size = Column(Integer, nullable=False)  # размер в байтах
    file_type = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Отношения
    user = relationship("User", backref="incident_attachments")
    
    def to_dict(self):
        return {
            'id': self.id,
            'incident_id': self.incident_id,
            'user_id': self.user_id,
            'filename': self.filename,
            'file_path': self.file_path,
            'file_size': self.file_size,
            'file_type': self.file_type,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class IncidentHistory(Base):
    """
    Модель истории изменений инцидента
    """
    __tablename__ = 'incident_history'
    
    id = Column(Integer, primary_key=True)
    incident_id = Column(Integer, ForeignKey('incidents.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    field_name = Column(String(100), nullable=False)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Отношения
    user = relationship("User", backref="incident_history_entries")
    
    def to_dict(self):
        return {
            'id': self.id,
            'incident_id': self.incident_id,
            'user_id': self.user_id,
            'field_name': self.field_name,
            'old_value': self.old_value,
            'new_value': self.new_value,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'user': self.user.to_dict() if self.user else None
        }