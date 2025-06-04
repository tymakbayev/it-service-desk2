from datetime import datetime
from typing import List, Dict, Any, Optional

from models.notification import Notification, NotificationType
from models.user import User
from config.database import db

class NotificationService:
    def send_notification(self, user_id: int, message: str, notification_type: str) -> int:
        """Send a notification to a specific user
        
        Args:
            user_id: ID of the user to receive the notification
            message: Content of the notification
            notification_type: Type of notification (e.g., 'incident_update', 'assignment', 'system')
            
        Returns:
            ID of the created notification
            
        Raises:
            ValueError: If the user doesn't exist
        """
        # Check if user exists
        user = User.query.get(user_id)
        if not user:
            raise ValueError(f"User with ID {user_id} not found")
        
        # Create notification
        notification = Notification(
            user_id=user_id,
            message=message,
            type=notification_type,
            created_at=datetime.now(),
            is_read=False
        )
        
        db.session.add(notification)
        db.session.commit()
        
        return notification.id
    
    def send_bulk_notifications(self, user_ids: List[int], message: str, notification_type: str) -> List[int]:
        """Send the same notification to multiple users
        
        Args:
            user_ids: List of user IDs to receive the notification
            message: Content of the notification
            notification_type: Type of notification
            
        Returns:
            List of created notification IDs
        """
        notification_ids = []
        
        for user_id in user_ids:
            try:
                notification_id = self.send_notification(user_id, message, notification_type)
                notification_ids.append(notification_id)
            except ValueError:
                # Skip users that don't exist
                continue
        
        return notification_ids
    
    def get_user_notifications(self, user_id: int, limit: int = 50, offset: int = 0, 
                              include_read: bool = False) -> List[Dict[str, Any]]:
        """Get notifications for a specific user
        
        Args:
            user_id: ID of the user
            limit: Maximum number of notifications to return
            offset: Number of notifications to skip (for pagination)
            include_read: Whether to include notifications that have been marked as read
            
        Returns:
            List of notification objects
        """
        # Check if user exists
        user = User.query.get(user_id)
        if not user:
            raise ValueError(f"User with ID {user_id} not found")
        
        # Build query
        query = Notification.query.filter(Notification.user_id == user_id)
        
        if not include_read:
            query = query.filter(Notification.is_read == False)
        
        # Order by creation time (newest first) and apply pagination
        notifications = query.order_by(Notification.created_at.desc())\
                            .limit(limit).offset(offset).all()
        
        # Format the notifications
        result = []
        for notification in notifications:
            result.append({
                'id': notification.id,
                'message': notification.message,
                'type': notification.type,
                'created_at': notification.created_at.isoformat(),
                'is_read': notification.is_read
            })
        
        return result
    
    def get_unread_count(self, user_id: int) -> int:
        """Get the count of unread notifications for a user
        
        Args:
            user_id: ID of the user
            
        Returns:
            Count of unread notifications
        """
        # Check if user exists
        user = User.query.get(user_id)
        if not user:
            raise ValueError(f"User with ID {user_id} not found")
        
        return Notification.query.filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).count()
    
    def mark_as_read(self, notification_id: int) -> Dict[str, Any]:
        """Mark a notification as read
        
        Args:
            notification_id: ID of the notification to mark as read
            
        Returns:
            Updated notification object
            
        Raises:
            ValueError: If the notification doesn't exist
        """
        notification = Notification.query.get(notification_id)
        if not notification:
            raise ValueError(f"Notification with ID {notification_id} not found")
        
        notification.is_read = True
        notification.read_at = datetime.now()
        
        db.session.commit()
        
        return {
            'id': notification.id,
            'message': notification.message,
            'type': notification.type,
            'created_at': notification.created_at.isoformat(),
            'is_read': notification.is_read,
            'read_at': notification.read_at.isoformat() if notification.read_at else None
        }
    
    def mark_all_as_read(self, user_id: int) -> int:
        """Mark all notifications for a user as read
        
        Args:
            user_id: ID of the user
            
        Returns:
            Number of notifications marked as read
        """
        # Check if user exists
        user = User.query.get(user_id)
        if not user:
            raise ValueError(f"User with ID {user_id} not found")
        
        # Get all unread notifications
        unread_notifications = Notification.query.filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).all()
        
        # Mark them as read
        now = datetime.now()
        for notification in unread_notifications:
            notification.is_read = True
            notification.read_at = now
        
        db.session.commit()
        
        return len(unread_notifications)
    
    def delete_notification(self, notification_id: int) -> bool:
        """Delete a notification
        
        Args:
            notification_id: ID of the notification to delete
            
        Returns:
            True if deletion was successful, False otherwise
        """
        notification = Notification.query.get(notification_id)
        if not notification:
            return False
        
        db.session.delete(notification)
        db.session.commit()
        
        return True
    
    def delete_old_notifications(self, days: int = 30) -> int:
        """Delete notifications older than the specified number of days
        
        Args:
            days: Number of days to keep notifications for
            
        Returns:
            Number of deleted notifications
        """
        cutoff_date = datetime.now() - datetime.timedelta(days=days)
        
        # Find notifications older than the cutoff date
        old_notifications = Notification.query.filter(
            Notification.created_at < cutoff_date
        ).all()
        
        # Delete them
        for notification in old_notifications:
            db.session.delete(notification)
        
        db.session.commit()
        
        return len(old_notifications)
    
    def send_incident_created_notification(self, incident_id: int, creator_id: int, title: str) -> None:
        """Send notification when a new incident is created
        
        Args:
            incident_id: ID of the created incident
            creator_id: ID of the user who created the incident
            title: Title of the incident
        """
        # Notify admins about new incident
        admins = User.query.filter(User.role == 'admin').all()
        admin_ids = [admin.id for admin in admins]
        
        message = f"New incident created: {title} (#{incident_id})"
        self.send_bulk_notifications(admin_ids, message, 'incident_created')
        
        # Confirm to creator
        creator_message = f"Your incident '{title}' has been submitted successfully (#{incident_id})"
        self.send_notification(creator_id, creator_message, 'incident_created')
    
    def send_incident_assigned_notification(self, incident_id: int, title: str, 
                                           assignee_id: int, assigner_id: int) -> None:
        """Send notification when an incident is assigned
        
        Args:
            incident_id: ID of the incident
            title: Title of the incident
            assignee_id: ID of the user the incident is assigned to
            assigner_id: ID of the user who made the assignment
        """
        # Notify the assignee
        assignee_message = f"Incident assigned to you: {title} (#{incident_id})"
        self.send_notification(assignee_id, assignee_message, 'incident_assigned')
        
        # Confirm to assigner
        assigner = User.query.get(assigner_id)
        assignee = User.query.get(assignee_id)
        
        if assigner and assignee:
            assigner_message = f"Incident #{incident_id} assigned to {assignee.first_name} {assignee.last_name}"
            self.send_notification(assigner_id, assigner_message, 'incident_assigned')
    
    def send_incident_status_update_notification(self, incident_id: int, title: str, 
                                                new_status: str, creator_id: int, 
                                                updater_id: int) -> None:
        """Send notification when an incident status is updated
        
        Args:
            incident_id: ID of the incident
            title: Title of the incident
            new_status: New status of the incident
            creator_id: ID of the user who created the incident
            updater_id: ID of the user who updated the status
        """
        # Notify the creator
        creator_message = f"Your incident '{title}' (#{incident_id}) status changed to: {new_status}"
        self.send_notification(creator_id, creator_message, 'incident_update')
        
        # Confirm to updater if different from creator
        if updater_id != creator_id:
            updater_message = f"You updated incident #{incident_id} status to: {new_status}"
            self.send_notification(updater_id, updater_message, 'incident_update')
