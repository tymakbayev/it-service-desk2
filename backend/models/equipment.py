from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Enum, DateTime, ForeignKey, Float, Boolean
from sqlalchemy.orm import relationship
import enum
import uuid

from config.database import db, Base

class EquipmentStatus(enum.Enum):
    AVAILABLE = "available"
    IN_USE = "in_use"
    UNDER_REPAIR = "under_repair"
    DEFECTIVE = "defective"
    DECOMMISSIONED = "decommissioned"
    RESERVED = "reserved"

class EquipmentType(enum.Enum):
    DESKTOP = "desktop"
    LAPTOP = "laptop"
    SERVER = "server"
    PRINTER = "printer"
    NETWORK = "network"
    PERIPHERAL = "peripheral"
    MOBILE = "mobile"
    OTHER = "other"

class Equipment(Base):
    """
    Модель оборудования в системе IT Service Desk
    """
    __tablename__ = 'equipment'

    id = Column(Integer, primary_key=True)
    uuid = Column(String(36), unique=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    type = Column(Enum(EquipmentType), default=EquipmentType.OTHER, nullable=False)
    model = Column(String(255), nullable=True)
    manufacturer = Column(String(255), nullable=True)
    serial_number = Column(String(255), unique=True, nullable=False)
    inventory_number = Column(String(255), unique=True, nullable=True)
    purchase_date = Column(DateTime, nullable=True)
    warranty_end_date = Column(DateTime, nullable=True)
    status = Column(Enum(EquipmentStatus), default=EquipmentStatus.AVAILABLE, nullable=False)
    location = Column(String(255), nullable=True)
    ip_address = Column(String(45), nullable=True)
    mac_address = Column(String(17), nullable=True)
    os = Column(String(255), nullable=True)
    os_version = Column(String(100), nullable=True)
    cpu = Column(String(255), nullable=True)
    ram = Column(Integer, nullable=True)  # RAM in MB
    storage = Column(Integer, nullable=True)  # Storage in GB
    notes = Column(Text, nullable=True)
    last_maintenance_date = Column(DateTime, nullable=True)
    next_maintenance_date = Column(DateTime, nullable=True)
    purchase_price = Column(Float, nullable=True)
    current_value = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Внешние ключи
    assigned_to_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    department_id = Column(Integer, ForeignKey('departments.id'), nullable=True)
    
    # Даты и время
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Отношения
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], backref="assigned_equipment")
    department = relationship("Department", backref="equipment")
    incidents = relationship("Incident", back_populates="equipment")
    maintenance_logs = relationship("MaintenanceLog", back_populates="equipment", cascade="all, delete-orphan")
    
    def __init__(self, name, type, serial_number, **kwargs):
        self.name = name
        self.type = type
        self.serial_number = serial_number
        
        for key, value in kwargs.items():
            setattr(self, key, value)
    
    def __repr__(self):
        return f"<Equipment {self.id}: {self.name} ({self.type})>"
    
    def to_dict(self):
        """
        Преобразует модель в словарь для API
        """
        return {
            'id': self.id,
            'uuid': self.uuid,
            'name': self.name,
            'type': self.type.value if self.type else None,
            'model': self.model,
            'manufacturer': self.manufacturer,
            'serial_number': self.serial_number,
            'inventory_number': self.inventory_number,
            'purchase_date': self.purchase_date.isoformat() if self.purchase_date else None,
            'warranty_end_date': self.warranty_end_date.isoformat() if self.warranty_end_date else None,
            'status': self.status.value if self.status else None,
            'location': self.location,
            'ip_address': self.ip_address,
            'mac_address': self.mac_address,
            'os': self.os,
            'os_version': self.os_version,
            'cpu': self.cpu,
            'ram': self.ram,
            'storage': self.storage,
            'notes': self.notes,
            'last_maintenance_date': self.last_maintenance_date.isoformat() if self.last_maintenance_date else None,
            'next_maintenance_date': self.next_maintenance_date.isoformat() if self.next_maintenance_date else None,
            'purchase_price': self.purchase_price,
            'current_value': self.current_value,
            'is_active': self.is_active,
            'assigned_to_id': self.assigned_to_id,
            'department_id': self.department_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    def save(self):
        """
        Сохраняет модель в базу данных
        """
        db.session.add(self)
        db.session.commit()
        return self
    
    def delete(self):
        """
        Удаляет модель из базы данных
        """
        db.session.delete(self)
        db.session.commit()
    
    def assign_to_user(self, user_id):
        """
        Назначает оборудование пользователю
        """
        self.assigned_to_id = user_id
        self.status = EquipmentStatus.IN_USE
        self.updated_at = datetime.utcnow()
        self.save()
        return self
    
    def unassign(self):
        """
        Снимает назначение оборудования с пользователя
        """
        self.assigned_to_id = None
        self.status = EquipmentStatus.AVAILABLE
        self.updated_at = datetime.utcnow()
        self.save()
        return self
    
    def mark_as_defective(self):
        """
        Помечает оборудование как неисправное
        """
        self.status = EquipmentStatus.DEFECTIVE
        self.updated_at = datetime.utcnow()
        self.save()
        return self
    
    def mark_as_under_repair(self):
        """
        Помечает оборудование как находящееся в ремонте
        """
        self.status = EquipmentStatus.UNDER_REPAIR
        self.updated_at = datetime.utcnow()
        self.save()
        return self
    
    def mark_as_decommissioned(self):
        """
        Помечает оборудование как списанное
        """
        self.status = EquipmentStatus.DECOMMISSIONED
        self.is_active = False
        self.updated_at = datetime.utcnow()
        self.save()
        return self
    
    def calculate_depreciation(self, years=5):
        """
        Рассчитывает текущую стоимость оборудования с учетом амортизации
        
        Args:
            years (int): Количество лет для полной амортизации
            
        Returns:
            float: Текущая стоимость оборудования
        """
        if not self.purchase_price or not self.purchase_date:
            return None
            
        # Линейная амортизация
        days_since_purchase = (datetime.utcnow() - self.purchase_date).days
        total_days = years * 365
        
        if days_since_purchase >= total_days:
            # Полностью амортизировано
            return 0
            
        depreciation_rate = days_since_purchase / total_days
        current_value = self.purchase_price * (1 - depreciation_rate)
        
        return round(current_value, 2)
    
    def update_current_value(self, years=5):
        """
        Обновляет текущую стоимость оборудования с учетом амортизации
        
        Args:
            years (int): Количество лет для полной амортизации
            
        Returns:
            Equipment: Обновленный объект оборудования
        """
        self.current_value = self.calculate_depreciation(years)
        self.save()
        return self

class MaintenanceLog(Base):
    """
    Модель для хранения информации о техническом обслуживании оборудования
    """
    __tablename__ = 'maintenance_logs'
    
    id = Column(Integer, primary_key=True)
    equipment_id = Column(Integer, ForeignKey('equipment.id'), nullable=False)
    maintenance_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    maintenance_type = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    performed_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    cost = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Отношения
    equipment = relationship("Equipment", back_populates="maintenance_logs")
    performed_by = relationship("User", foreign_keys=[performed_by_id])
    
    def __repr__(self):
        return f"<MaintenanceLog {self.id}: {self.maintenance_type} for Equipment {self.equipment_id}>"