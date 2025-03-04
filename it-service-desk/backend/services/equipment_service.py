from typing import Dict, List, Optional, Any
from datetime import datetime
from models.equipment_model import EquipmentModel
from models.user_model import UserModel
from services.notification_service import NotificationService

class EquipmentService:
    def __init__(self, notification_service: NotificationService):
        self.notification_service = notification_service

    def add_equipment(self, equipment_data: Dict[str, Any]) -> int:
        """
        Add new equipment to the database
        
        Args:
            equipment_data: Dictionary containing equipment details
            
        Returns:
            equipment_id: ID of the newly created equipment
        """
        # Create new equipment record
        equipment = EquipmentModel(
            name=equipment_data.get('name'),
            type=equipment_data.get('type'),
            serial_number=equipment_data.get('serial_number'),
            purchase_date=datetime.strptime(equipment_data.get('purchase_date', ''), '%Y-%m-%d') if equipment_data.get('purchase_date') else None,
            status=equipment_data.get('status', 'available'),
            notes=equipment_data.get('notes', ''),
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Save to database
        equipment.save()
        
        # Notify admins about new equipment
        self.notification_service.create_notification(
            title="New Equipment Added",
            message=f"New {equipment.type} '{equipment.name}' has been added to inventory",
            notification_type="equipment_added",
            related_id=equipment.id,
            user_roles=["admin", "technician"]
        )
        
        return equipment.id
    
    def update_equipment(self, equipment_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update existing equipment
        
        Args:
            equipment_id: ID of the equipment to update
            data: Dictionary containing updated equipment details
            
        Returns:
            updated_equipment: Dictionary with updated equipment data
        """
        equipment = EquipmentModel.get_by_id(equipment_id)
        if not equipment:
            raise ValueError(f"Equipment with ID {equipment_id} not found")
        
        # Update fields
        for key, value in data.items():
            if key == 'purchase_date' and value:
                value = datetime.strptime(value, '%Y-%m-%d')
            setattr(equipment, key, value)
        
        equipment.updated_at = datetime.now()
        equipment.save()
        
        # Notify about equipment update if status changed
        if 'status' in data:
            self.notification_service.create_notification(
                title="Equipment Status Updated",
                message=f"Equipment '{equipment.name}' status changed to {equipment.status}",
                notification_type="equipment_updated",
                related_id=equipment.id,
                user_roles=["admin", "technician"]
            )
        
        return equipment.to_dict()
    
    def get_equipment(self, equipment_id: int) -> Dict[str, Any]:
        """
        Get equipment by ID
        
        Args:
            equipment_id: ID of the equipment to retrieve
            
        Returns:
            equipment: Dictionary with equipment data
        """
        equipment = EquipmentModel.get_by_id(equipment_id)
        if not equipment:
            raise ValueError(f"Equipment with ID {equipment_id} not found")
        
        return equipment.to_dict()
    
    def get_all_equipment(self, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Get all equipment with optional filtering
        
        Args:
            filters: Optional dictionary with filter parameters
            
        Returns:
            equipment_list: List of equipment dictionaries
        """
        query = EquipmentModel.query
        
        if filters:
            if 'status' in filters:
                query = query.filter(EquipmentModel.status == filters['status'])
            if 'type' in filters:
                query = query.filter(EquipmentModel.type == filters['type'])
            if 'assigned_to' in filters:
                query = query.filter(EquipmentModel.assigned_to == filters['assigned_to'])
            if 'search' in filters and filters['search']:
                search_term = f"%{filters['search']}%"
                query = query.filter(
                    (EquipmentModel.name.ilike(search_term)) | 
                    (EquipmentModel.serial_number.ilike(search_term))
                )
        
        equipment_list = query.all()
        return [equipment.to_dict() for equipment in equipment_list]
    
    def assign_equipment(self, equipment_id: int, user_id: int) -> Dict[str, Any]:
        """
        Assign equipment to a user
        
        Args:
            equipment_id: ID of the equipment to assign
            user_id: ID of the user to assign equipment to
            
        Returns:
            updated_equipment: Dictionary with updated equipment data
        """
        equipment = EquipmentModel.get_by_id(equipment_id)
        if not equipment:
            raise ValueError(f"Equipment with ID {equipment_id} not found")
        
        user = UserModel.get_by_id(user_id)
        if not user:
            raise ValueError(f"User with ID {user_id} not found")
        
        # Update equipment assignment
        equipment.assigned_to = user_id
        equipment.status = 'assigned'
        equipment.updated_at = datetime.now()
        equipment.save()
        
        # Create notification for the user
        self.notification_service.create_notification(
            title="Equipment Assigned",
            message=f"Equipment '{equipment.name}' has been assigned to you",
            notification_type="equipment_assigned",
            related_id=equipment.id,
            user_ids=[user_id]
        )
        
        return equipment.to_dict()
    
    def mark_as_defective(self, equipment_id: int, reason: str) -> Dict[str, Any]:
        """
        Mark equipment as defective
        
        Args:
            equipment_id: ID of the equipment to mark as defective
            reason: Reason for marking as defective
            
        Returns:
            updated_equipment: Dictionary with updated equipment data
        """
        equipment = EquipmentModel.get_by_id(equipment_id)
        if not equipment:
            raise ValueError(f"Equipment with ID {equipment_id} not found")
        
        # Update equipment status
        equipment.status = 'defective'
        equipment.notes = f"{equipment.notes}\n[{datetime.now().strftime('%Y-%m-%d')}] Marked as defective: {reason}"
        equipment.updated_at = datetime.now()
        equipment.save()
        
        # Notify technicians and admins
        self.notification_service.create_notification(
            title="Equipment Marked as Defective",
            message=f"Equipment '{equipment.name}' has been marked as defective. Reason: {reason}",
            notification_type="equipment_defective",
            related_id=equipment.id,
            user_roles=["admin", "technician"]
        )
        
        return equipment.to_dict()
