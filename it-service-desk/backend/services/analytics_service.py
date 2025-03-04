from datetime import datetime, timedelta
from sqlalchemy import func, and_, or_, desc
from typing import Dict, List, Any, Optional, Union

from ..models.incident_model import IncidentModel
from ..models.equipment_model import EquipmentModel
from ..models.user_model import UserModel
from ..database import db

class AnalyticsService:
    def get_incident_stats(self, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate statistics about incidents based on provided filters
        
        Args:
            filters: Optional dictionary containing filter parameters
                - date_from: Start date for the analysis
                - date_to: End date for the analysis
                - department_id: Filter by department
                - created_by: Filter by creator
                - assigned_to: Filter by assignee
        
        Returns:
            Dictionary containing various incident statistics
        """
        if filters is None:
            filters = {}
            
        # Default to last 30 days if no date range specified
        date_to = filters.get('date_to', datetime.now())
        if isinstance(date_to, str):
            date_to = datetime.fromisoformat(date_to)
            
        date_from = filters.get('date_from', date_to - timedelta(days=30))
        if isinstance(date_from, str):
            date_from = datetime.fromisoformat(date_from)
        
        # Base query with date filter
        base_query = IncidentModel.query.filter(
            IncidentModel.created_at.between(date_from, date_to)
        )
        
        # Apply additional filters if provided
        if 'department_id' in filters:
            base_query = base_query.join(UserModel, IncidentModel.created_by == UserModel.id)\
                                  .filter(UserModel.department_id == filters['department_id'])
        
        if 'created_by' in filters:
            base_query = base_query.filter(IncidentModel.created_by == filters['created_by'])
            
        if 'assigned_to' in filters:
            base_query = base_query.filter(IncidentModel.assigned_to == filters['assigned_to'])
        
        # Total incidents count
        total_incidents = base_query.count()
        
        # Incidents by status
        status_counts = db.session.query(
            IncidentModel.status, func.count(IncidentModel.id)
        ).filter(
            IncidentModel.created_at.between(date_from, date_to)
        ).group_by(IncidentModel.status).all()
        
        status_stats = {status: count for status, count in status_counts}
        
        # Incidents by priority
        priority_counts = db.session.query(
            IncidentModel.priority, func.count(IncidentModel.id)
        ).filter(
            IncidentModel.created_at.between(date_from, date_to)
        ).group_by(IncidentModel.priority).all()
        
        priority_stats = {priority: count for priority, count in priority_counts}
        
        # Average resolution time
        resolved_incidents = base_query.filter(
            IncidentModel.status == 'resolved',
            IncidentModel.resolved_at.isnot(None)
        ).all()
        
        if resolved_incidents:
            total_resolution_time = sum(
                (incident.resolved_at - incident.created_at).total_seconds() / 3600
                for incident in resolved_incidents
            )
            avg_resolution_time = total_resolution_time / len(resolved_incidents)
        else:
            avg_resolution_time = 0
        
        # Incidents by day
        daily_counts = db.session.query(
            func.date(IncidentModel.created_at), func.count(IncidentModel.id)
        ).filter(
            IncidentModel.created_at.between(date_from, date_to)
        ).group_by(func.date(IncidentModel.created_at)).all()
        
        daily_stats = {str(date): count for date, count in daily_counts}
        
        return {
            'total_incidents': total_incidents,
            'by_status': status_stats,
            'by_priority': priority_stats,
            'avg_resolution_time_hours': round(avg_resolution_time, 2),
            'daily_incidents': daily_stats
        }
    
    def get_equipment_stats(self, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate statistics about equipment based on provided filters
        
        Args:
            filters: Optional dictionary containing filter parameters
                - department_id: Filter by department
                - category: Filter by equipment category
                - status: Filter by equipment status
        
        Returns:
            Dictionary containing various equipment statistics
        """
        if filters is None:
            filters = {}
        
        # Base query
        base_query = EquipmentModel.query
        
        # Apply filters if provided
        if 'department_id' in filters:
            base_query = base_query.filter(EquipmentModel.department_id == filters['department_id'])
        
        if 'category' in filters:
            base_query = base_query.filter(EquipmentModel.category == filters['category'])
            
        if 'status' in filters:
            base_query = base_query.filter(EquipmentModel.status == filters['status'])
        
        # Total equipment count
        total_equipment = base_query.count()
        
        # Equipment by status
        status_counts = db.session.query(
            EquipmentModel.status, func.count(EquipmentModel.id)
        ).group_by(EquipmentModel.status).all()
        
        status_stats = {status: count for status, count in status_counts}
        
        # Equipment by category
        category_counts = db.session.query(
            EquipmentModel.category, func.count(EquipmentModel.id)
        ).group_by(EquipmentModel.category).all()
        
        category_stats = {category: count for category, count in category_counts}
        
        # Equipment by department
        department_counts = db.session.query(
            EquipmentModel.department_id, func.count(EquipmentModel.id)
        ).group_by(EquipmentModel.department_id).all()
        
        department_stats = {str(dept_id): count for dept_id, count in department_counts}
        
        # Equipment with most incidents
        equipment_incidents = db.session.query(
            EquipmentModel.id, EquipmentModel.name, func.count(IncidentModel.id).label('incident_count')
        ).join(
            IncidentModel, IncidentModel.equipment_id == EquipmentModel.id
        ).group_by(
            EquipmentModel.id, EquipmentModel.name
        ).order_by(
            desc('incident_count')
        ).limit(10).all()
        
        top_equipment_with_incidents = [
            {'id': eq_id, 'name': name, 'incident_count': count}
            for eq_id, name, count in equipment_incidents
        ]
        
        return {
            'total_equipment': total_equipment,
            'by_status': status_stats,
            'by_category': category_stats,
            'by_department': department_stats,
            'top_equipment_with_incidents': top_equipment_with_incidents
        }
    
    def generate_report(self, report_type: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a detailed report based on the specified type and parameters
        
        Args:
            report_type: Type of report to generate ('incident', 'equipment', 'user_activity')
            params: Parameters for the report generation
        
        Returns:
            Dictionary containing the report data
        """
        if report_type == 'incident':
            return self._generate_incident_report(params)
        elif report_type == 'equipment':
            return self._generate_equipment_report(params)
        elif report_type == 'user_activity':
            return self._generate_user_activity_report(params)
        else:
            raise ValueError(f"Unknown report type: {report_type}")
    
    def _generate_incident_report(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a detailed incident report"""
        date_from = params.get('date_from', (datetime.now() - timedelta(days=30)).isoformat())
        date_to = params.get('date_to', datetime.now().isoformat())
        
        if isinstance(date_from, str):
            date_from = datetime.fromisoformat(date_from)
        if isinstance(date_to, str):
            date_to = datetime.fromisoformat(date_to)
        
        # Get incidents in the date range
        incidents = IncidentModel.query.filter(
            IncidentModel.created_at.between(date_from, date_to)
        ).all()
        
        # Format incident data
        incident_data = []
        for incident in incidents:
            creator = UserModel.query.get(incident.created_by)
            assignee = UserModel.query.get(incident.assigned_to) if incident.assigned_to else None
            equipment = EquipmentModel.query.get(incident.equipment_id) if incident.equipment_id else None
            
            incident_data.append({
                'id': incident.id,
                'title': incident.title,
                'description': incident.description,
                'status': incident.status,
                'priority': incident.priority,
                'created_at': incident.created_at.isoformat(),
                'resolved_at': incident.resolved_at.isoformat() if incident.resolved_at else None,
                'resolution_time_hours': round((incident.resolved_at - incident.created_at).total_seconds() / 3600, 2) if incident.resolved_at else None,
                'creator': {
                    'id': creator.id,
                    'name': f"{creator.first_name} {creator.last_name}",
                    'email': creator.email
                },
                'assignee': {
                    'id': assignee.id,
                    'name': f"{assignee.first_name} {assignee.last_name}",
                    'email': assignee.email
                } if assignee else None,
                'equipment': {
                    'id': equipment.id,
                    'name': equipment.name,
                    'category': equipment.category
                } if equipment else None
            })
        
        # Calculate summary statistics
        stats = self.get_incident_stats({
            'date_from': date_from,
            'date_to': date_to
        })
        
        return {
            'report_type': 'incident',
            'generated_at': datetime.now().isoformat(),
            'period': {
                'from': date_from.isoformat(),
                'to': date_to.isoformat()
            },
            'summary': stats,
            'incidents': incident_data
        }
    
    def _generate_equipment_report(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a detailed equipment report"""
        department_id = params.get('department_id')
        category = params.get('category')
        status = params.get('status')
        
        # Build query with filters
        query = EquipmentModel.query
        
        if department_id:
            query = query.filter(EquipmentModel.department_id == department_id)
        if category:
            query = query.filter(EquipmentModel.category == category)
        if status:
            query = query.filter(EquipmentModel.status == status)
        
        equipment_items = query.all()
        
        # Format equipment data
        equipment_data = []
        for item in equipment_items:
            # Count incidents for this equipment
            incident_count = IncidentModel.query.filter(IncidentModel.equipment_id == item.id).count()
            
            equipment_data.append({
                'id': item.id,
                'name': item.name,
                'serial_number': item.serial_number,
                'category': item.category,
                'status': item.status,
                'purchase_date': item.purchase_date.isoformat() if item.purchase_date else None,
                'warranty_expiry': item.warranty_expiry.isoformat() if item.warranty_expiry else None,
                'department_id': item.department_id,
                'location': item.location,
                'incident_count': incident_count
            })
        
        # Calculate summary statistics
        stats = self.get_equipment_stats({
            'department_id': department_id,
            'category': category,
            'status': status
        })
        
        return {
            'report_type': 'equipment',
            'generated_at': datetime.now().isoformat(),
            'filters': {
                'department_id': department_id,
                'category': category,
                'status': status
            },
            'summary': stats,
            'equipment': equipment_data
        }
    
    def _generate_user_activity_report(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a report on user activity"""
        date_from = params.get('date_from', (datetime.now() - timedelta(days=30)).isoformat())
        date_to = params.get('date_to', datetime.now().isoformat())
        role = params.get('role')
        
        if isinstance(date_from, str):
            date_from = datetime.fromisoformat(date_from)
        if isinstance(date_to, str):
            date_to = datetime.fromisoformat(date_to)
        
        # Get users filtered by role if specified
        user_query = UserModel.query
        if role:
            user_query = user_query.filter(UserModel.role == role)
        
        users = user_query.all()
        
        # Collect activity data for each user
        user_activity = []
        for user in users:
            # Count incidents created by user
            created_incidents = IncidentModel.query.filter(
                IncidentModel.created_by == user.id,
                IncidentModel.created_at.between(date_from, date_to)
            ).count()
            
            # Count incidents assigned to user (for technicians)
            assigned_incidents = 0
            resolved_incidents = 0
            avg_resolution_time = 0
            
            if user.role in ['technician', 'admin']:
                assigned_incidents = IncidentModel.query.filter(
                    IncidentModel.assigned_to == user.id,
                    IncidentModel.created_at.between(date_from, date_to)
                ).count()
                
                resolved = IncidentModel.query.filter(
                    IncidentModel.assigned_to == user.id,
                    IncidentModel.status == 'resolved',
                    IncidentModel.resolved_at.isnot(None),
                    IncidentModel.resolved_at.between(date_from, date_to)
                ).all()
                
                resolved_incidents = len(resolved)
                
                if resolved_incidents > 0:
                    total_resolution_time = sum(
                        (incident.resolved_at - incident.created_at).total_seconds() / 3600
                        for incident in resolved
                    )
                    avg_resolution_time = total_resolution_time / resolved_incidents
            
            user_activity.append({
                'user_id': user.id,
                'name': f"{user.first_name} {user.last_name}",
                'email': user.email,
                'role': user.role,
                'created_incidents': created_incidents,
                'assigned_incidents': assigned_incidents,
                'resolved_incidents': resolved_incidents,
                'avg_resolution_time_hours': round(avg_resolution_time, 2)
            })
        
        # Sort by most active users (by created + assigned incidents)
        user_activity.sort(key=lambda x: x['created_incidents'] + x['assigned_incidents'], reverse=True)
        
        return {
            'report_type': 'user_activity',
            'generated_at': datetime.now().isoformat(),
            'period': {
                'from': date_from.isoformat(),
                'to': date_to.isoformat()
            },
            'filters': {
                'role': role
            },
            'user_activity': user_activity
        }
    
    def get_dashboard_data(self, user_id: int) -> Dict[str, Any]:
        """Get dashboard data for a specific user based on their role
        
        Args:
            user_id: ID of the user requesting dashboard data
        
        Returns:
            Dictionary containing dashboard data tailored to the user's role
        """
        user = UserModel.query.get(user_id)
        if not user:
            raise ValueError(f"User with ID {user_id} not found")
        
        # Common data for all roles
        date_from = datetime.now() - timedelta(days=30)
        date_to = datetime.now()
        
        # Get basic incident stats for the last 30 days
        incident_stats = self.get_incident_stats({
            'date_from': date_from,
            'date_to': date_to
        })
        
        # Role-specific dashboard data
        if user.role == 'user':
            # For regular users, show their own incidents
            user_incidents = IncidentModel.query.filter(
                IncidentModel.created_by == user_id
            ).order_by(IncidentModel.created_at.desc()).limit(5).all()
            
            user_incident_data = [{
                'id': incident.id,
                'title': incident.title,
                'status': incident.status,
                'priority': incident.priority,
                'created_at': incident.created_at.isoformat()
            } for incident in user_incidents]
            
            # Count incidents by status for this user
            user_incident_stats = self.get_incident_stats({
                'date_from': date_from,
                'date_to': date_to,
                'created_by': user_id
            })
            
            return {
                'recent_incidents': user_incident_data,
                'user_incident_stats': user_incident_stats,
                'overall_incident_stats': incident_stats
            }
            
        elif user.role == 'technician':
            # For technicians, show assigned incidents and overall stats
            assigned_incidents = IncidentModel.query.filter(
                IncidentModel.assigned_to == user_id,
                IncidentModel.status != 'resolved'
            ).order_by(IncidentModel.priority.desc(), IncidentModel.created_at.asc()).limit(10).all()
            
            assigned_incident_data = [{
                'id': incident.id,
                'title': incident.title,
                'status': incident.status,
                'priority': incident.priority,
                'created_at': incident.created_at.isoformat(),
                'created_by': incident.created_by
            } for incident in assigned_incidents]
            
            # Get technician's performance stats
            technician_stats = self.get_incident_stats({
                'date_from': date_from,
                'date_to': date_to,
                'assigned_to': user_id
            })
            
            # Get equipment with most incidents
            equipment_stats = self.get_equipment_stats()
            
            return {
                'assigned_incidents': assigned_incident_data,
                'technician_stats': technician_stats,
                'overall_incident_stats': incident_stats,
                'equipment_stats': equipment_stats['top_equipment_with_incidents']
            }
            
        elif user.role == 'admin':
            # For admins, show comprehensive dashboard with all stats
            # Recent unresolved high priority incidents
            high_priority_incidents = IncidentModel.query.filter(
                IncidentModel.priority.in_(['high', 'critical']),
                IncidentModel.status != 'resolved'
            ).order_by(IncidentModel.created_at.asc()).limit(5).all()
            
            high_priority_data = [{
                'id': incident.id,
                'title': incident.title,
                'status': incident.status,
                'priority': incident.priority,
                'created_at': incident.created_at.isoformat(),
                'created_by': incident.created_by,
                'assigned_to': incident.assigned_to
            } for incident in high_priority_incidents]
            
            # Unassigned incidents
            unassigned_incidents = IncidentModel.query.filter(
                IncidentModel.assigned_to.is_(None),
                IncidentModel.status != 'resolved'
            ).order_by(IncidentModel.created_at.asc()).limit(5).all()
            
            unassigned_data = [{
                'id': incident.id,
                'title': incident.title,
                'status': incident.status,
                'priority': incident.priority,
                'created_at': incident.created_at.isoformat(),
                'created_by': incident.created_by
            } for incident in unassigned_incidents]
            
            # Equipment stats
            equipment_stats = self.get_equipment_stats()
            
            # Technician performance comparison
            technicians = UserModel.query.filter(UserModel.role == 'technician').all()
            technician_performance = []
            
            for tech in technicians:
                tech_stats = self.get_incident_stats({
                    'date_from': date_from,
                    'date_to': date_to,
                    'assigned_to': tech.id
                })
                
                technician_performance.append({
                    'id': tech.id,
                    'name': f"{tech.first_name} {tech.last_name}",
                    'resolved_count': tech_stats['by_status'].get('resolved', 0),
                    'open_count': tech_stats['by_status'].get('open', 0) + \
                                tech_stats['by_status'].get('in_progress', 0),
                    'avg_resolution_time': tech_stats['avg_resolution_time_hours']
                })
            
            return {
                'high_priority_incidents': high_priority_data,
                'unassigned_incidents': unassigned_data,
                'overall_incident_stats': incident_stats,
                'equipment_stats': equipment_stats,
                'technician_performance': technician_performance
            }
        
        # Default case
        return {
            'overall_incident_stats': incident_stats
        }
