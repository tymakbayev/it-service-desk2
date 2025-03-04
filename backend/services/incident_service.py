from typing import Dict, Any, List, Optional
from datetime import datetime

from backend.models.incident_model import IncidentModel
from backend.models.user_model import UserModel
from backend.models.equipment_model import EquipmentModel
from backend.services.notification_service import NotificationService
from backend.services.equipment_service import EquipmentService
from backend.utils.enums import IncidentStatus, IncidentPriority, NotificationType

class IncidentService:
    def __init__(self, notification_service: NotificationService, equipment_service: EquipmentService):
        self.notification_service = notification_service
        self.equipment_service = equipment_service
    
    def create_incident(self, incident_data: Dict[str, Any]) -> int:
        """
        Создает новый инцидент
        
        Args:
            incident_data: Данные инцидента
            
        Returns:
            int: ID созданного инцидента
        """
        # Проверяем существование оборудования, если указано
        equipment_id = incident_data.get('equipment_id')
        if equipment_id:
            equipment = self.equipment_service.get_equipment(equipment_id)
            if not equipment:
                raise ValueError(f"Оборудование с ID {equipment_id} не найдено")
        
        # Создаем новый инцидент
        new_incident = IncidentModel(
            title=incident_data['title'],
            description=incident_data['description'],
            status=IncidentStatus.NEW.value,
            priority=incident_data.get('priority', IncidentPriority.MEDIUM.value),
            created_by=incident_data['created_by'],
            equipment_id=equipment_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Сохраняем в базу данных
        new_incident.save()
        
        # Отправляем уведомление о новом инциденте
        self.notification_service.send_notification(
            NotificationType.NEW_INCIDENT,
            {
                'incident_id': new_incident.id,
                'title': new_incident.title,
                'priority': new_incident.priority
            },
            # Отправляем уведомление техническим специалистам
            UserModel.query.filter_by(role='technician').all()
        )
        
        return new_incident.id
    
    def update_incident(self, incident_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Обновляет данные инцидента
        
        Args:
            incident_id: ID инцидента
            data: Новые данные инцидента
            
        Returns:
            Dict: Обновленный инцидент
        """
        incident = IncidentModel.query.get(incident_id)
        if not incident:
            raise ValueError(f"Инцидент с ID {incident_id} не найден")
        
        # Обновляем поля инцидента
        for key, value in data.items():
            if hasattr(incident, key) and key not in ['id', 'created_at']:
                setattr(incident, key, value)
        
        incident.updated_at = datetime.utcnow()
        incident.save()
        
        # Отправляем уведомление об обновлении инцидента
        self.notification_service.send_notification(
            NotificationType.INCIDENT_UPDATED,
            {
                'incident_id': incident.id,
                'title': incident.title,
                'status': incident.status,
                'updated_fields': list(data.keys())
            },
            # Отправляем уведомление создателю и назначенному специалисту
            [UserModel.query.get(incident.created_by), 
             UserModel.query.get(incident.assigned_to) if incident.assigned_to else None]
        )
        
        return incident.to_dict()
    
    def get_incident(self, incident_id: int) -> Dict[str, Any]:
        """
        Получает информацию об инциденте по ID
        
        Args:
            incident_id: ID инцидента
            
        Returns:
            Dict: Данные инцидента
        """
        incident = IncidentModel.query.get(incident_id)
        if not incident:
            raise ValueError(f"Инцидент с ID {incident_id} не найден")
        
        return incident.to_dict()
    
    def get_incidents(self, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Получает список инцидентов с применением фильтров
        
        Args:
            filters: Фильтры для выборки инцидентов
            
        Returns:
            List[Dict]: Список инцидентов
        """
        query = IncidentModel.query
        
        if filters:
            # Применяем фильтры
            if 'status' in filters:
                query = query.filter(IncidentModel.status == filters['status'])
            
            if 'priority' in filters:
                query = query.filter(IncidentModel.priority == filters['priority'])
            
            if 'created_by' in filters:
                query = query.filter(IncidentModel.created_by == filters['created_by'])
            
            if 'assigned_to' in filters:
                query = query.filter(IncidentModel.assigned_to == filters['assigned_to'])
            
            if 'equipment_id' in filters:
                query = query.filter(IncidentModel.equipment_id == filters['equipment_id'])
            
            if 'date_from' in filters:
                query = query.filter(IncidentModel.created_at >= filters['date_from'])
            
            if 'date_to' in filters:
                query = query.filter(IncidentModel.created_at <= filters['date_to'])
        
        # Сортировка по умолчанию - сначала новые
        incidents = query.order_by(IncidentModel.created_at.desc()).all()
        
        return [incident.to_dict() for incident in incidents]
    
    def assign_incident(self, incident_id: int, user_id: int) -> Dict[str, Any]:
        """
        Назначает инцидент техническому специалисту
        
        Args:
            incident_id: ID инцидента
            user_id: ID пользователя (технического специалиста)
            
        Returns:
            Dict: Обновленный инцидент
        """
        incident = IncidentModel.query.get(incident_id)
        if not incident:
            raise ValueError(f"Инцидент с ID {incident_id} не найден")
        
        user = UserModel.query.get(user_id)
        if not user:
            raise ValueError(f"Пользователь с ID {user_id} не найден")
        
        if user.role != 'technician' and user.role != 'admin':
            raise ValueError(f"Пользователь с ID {user_id} не является техническим специалистом")
        
        incident.assigned_to = user_id
        incident.status = IncidentStatus.IN_PROGRESS.value
        incident.updated_at = datetime.utcnow()
        incident.save()
        
        # Отправляем уведомления
        self.notification_service.send_notification(
            NotificationType.INCIDENT_ASSIGNED,
            {
                'incident_id': incident.id,
                'title': incident.title,
                'assigned_to': user.name,
                'assigned_to_id': user.id
            },
            # Уведомляем создателя инцидента и назначенного специалиста
            [UserModel.query.get(incident.created_by), user]
        )
        
        return incident.to_dict()
    
    def change_status(self, incident_id: int, status: str) -> Dict[str, Any]:
        """
        Изменяет статус инцидента
        
        Args:
            incident_id: ID инцидента
            status: Новый статус
            
        Returns:
            Dict: Обновленный инцидент
        """
        incident = IncidentModel.query.get(incident_id)
        if not incident:
            raise ValueError(f"Инцидент с ID {incident_id} не найден")
        
        # Проверяем валидность статуса
        try:
            new_status = IncidentStatus(status).value
        except ValueError:
            raise ValueError(f"Недопустимый статус: {status}")
        
        old_status = incident.status
        incident.status = new_status
        incident.updated_at = datetime.utcnow()
        
        # Если инцидент закрывается, добавляем дату закрытия
        if new_status == IncidentStatus.CLOSED.value:
            incident.closed_at = datetime.utcnow()
        
        incident.save()
        
        # Отправляем уведомление о смене статуса
        self.notification_service.send_notification(
            NotificationType.STATUS_CHANGED,
            {
                'incident_id': incident.id,
                'title': incident.title,
                'old_status': old_status,
                'new_status': new_status
            },
            # Уведомляем создателя и назначенного специалиста
            [UserModel.query.get(incident.created_by), 
             UserModel.query.get(incident.assigned_to) if incident.assigned_to else None]
        )
        
        return incident.to_dict()
