from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.orm import relationship
import uuid

from config.database import db, Base

class Role(Base):
    """
    Модель ролей пользователей в системе IT Service Desk
    
    Роли определяют уровень доступа и разрешения пользователей в системе.
    Основные роли: администратор, техник, пользователь.
    """
    __tablename__ = 'roles'

    id = Column(Integer, primary_key=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    
    # Разрешения
    can_manage_users = Column(Boolean, default=False, nullable=False)
    can_manage_roles = Column(Boolean, default=False, nullable=False)
    can_manage_equipment = Column(Boolean, default=False, nullable=False)
    can_view_all_incidents = Column(Boolean, default=False, nullable=False)
    can_assign_incidents = Column(Boolean, default=False, nullable=False)
    can_resolve_incidents = Column(Boolean, default=False, nullable=False)
    can_close_incidents = Column(Boolean, default=False, nullable=False)
    can_view_reports = Column(Boolean, default=False, nullable=False)
    can_export_data = Column(Boolean, default=False, nullable=False)
    can_manage_settings = Column(Boolean, default=False, nullable=False)
    can_view_analytics = Column(Boolean, default=False, nullable=False)
    
    # Метаданные
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Отношения
    users = relationship("User", back_populates="role", cascade="all, delete-orphan")
    
    def __init__(self, name, description=None, **permissions):
        self.name = name
        self.description = description
        
        # Установка разрешений
        for permission, value in permissions.items():
            if hasattr(self, permission):
                setattr(self, permission, value)
    
    @classmethod
    def create_default_roles(cls, db_session):
        """
        Создает стандартные роли в системе, если они не существуют
        """
        # Проверяем, существуют ли уже роли
        if db_session.query(cls).count() > 0:
            return
        
        # Роль администратора
        admin_role = cls(
            name="Administrator",
            description="Полный доступ ко всем функциям системы",
            can_manage_users=True,
            can_manage_roles=True,
            can_manage_equipment=True,
            can_view_all_incidents=True,
            can_assign_incidents=True,
            can_resolve_incidents=True,
            can_close_incidents=True,
            can_view_reports=True,
            can_export_data=True,
            can_manage_settings=True,
            can_view_analytics=True
        )
        
        # Роль техника (IT-специалист)
        technician_role = cls(
            name="Technician",
            description="Доступ к управлению инцидентами и оборудованием",
            can_manage_users=False,
            can_manage_roles=False,
            can_manage_equipment=True,
            can_view_all_incidents=True,
            can_assign_incidents=True,
            can_resolve_incidents=True,
            can_close_incidents=True,
            can_view_reports=True,
            can_export_data=True,
            can_manage_settings=False,
            can_view_analytics=True
        )
        
        # Роль обычного пользователя
        user_role = cls(
            name="User",
            description="Базовый доступ для создания и отслеживания своих инцидентов",
            can_manage_users=False,
            can_manage_roles=False,
            can_manage_equipment=False,
            can_view_all_incidents=False,
            can_assign_incidents=False,
            can_resolve_incidents=False,
            can_close_incidents=False,
            can_view_reports=False,
            can_export_data=False,
            can_manage_settings=False,
            can_view_analytics=False
        )
        
        # Добавляем роли в сессию
        db_session.add_all([admin_role, technician_role, user_role])
        db_session.commit()
    
    def __repr__(self):
        return f"<Role {self.name}>"
    
    def to_dict(self):
        """
        Преобразует объект роли в словарь для API
        """
        return {
            'id': self.id,
            'uuid': self.uuid,
            'name': self.name,
            'description': self.description,
            'permissions': {
                'can_manage_users': self.can_manage_users,
                'can_manage_roles': self.can_manage_roles,
                'can_manage_equipment': self.can_manage_equipment,
                'can_view_all_incidents': self.can_view_all_incidents,
                'can_assign_incidents': self.can_assign_incidents,
                'can_resolve_incidents': self.can_resolve_incidents,
                'can_close_incidents': self.can_close_incidents,
                'can_view_reports': self.can_view_reports,
                'can_export_data': self.can_export_data,
                'can_manage_settings': self.can_manage_settings,
                'can_view_analytics': self.can_view_analytics
            },
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }