from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from services.notification_service import NotificationService
from services.auth_service import AuthService

notification_bp = Blueprint('notification', __name__)

class NotificationController:
    def __init__(self, notification_service: NotificationService, auth_service: AuthService):
        self.notification_service = notification_service
        self.auth_service = auth_service
        self._register_routes()
    
    def _register_routes(self):
        notification_bp.route('/', methods=['GET'])(self.get_notifications)
        notification_bp.route('/<int:notification_id>/read', methods=['PATCH'])(self.mark_as_read)
        notification_bp.route('/read-all', methods=['PATCH'])(self.mark_all_as_read)
    
    @jwt_required
    def get_notifications(self):
        """
        Get notifications for the current user
        ---
        tags:
          - Notifications
        parameters:
          - name: unread_only
            in: query
            type: boolean
            required: false
            description: Filter to show only unread notifications
          - name: limit
            in: query
            type: integer
            required: false
            description: Limit the number of notifications returned
        responses:
          200:
            description: List of notifications
        """
        user_id = get_jwt_identity()
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        limit = request.args.get('limit', None)
        
        if limit and limit.isdigit():
            limit = int(limit)
        else:
            limit = None
        
        try:
            notifications = self.notification_service.get_user_notifications(
                user_id=user_id,
                unread_only=unread_only,
                limit=limit
            )
            
            # Get unread count for badge display
            unread_count = self.notification_service.get_unread_count(user_id)
            
            return jsonify({
                'status': 'success',
                'data': notifications,
                'unread_count': unread_count,
                'count': len(notifications)
            }), 200
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 500
    
    @jwt_required
    def mark_as_read(self, notification_id):
        """
        Mark a notification as read
        ---
        tags:
          - Notifications
        parameters:
          - name: notification_id
            in: path
            type: integer
            required: true
            description: ID of the notification to mark as read
        responses:
          200:
            description: Notification marked as read
          404:
            description: Notification not found
        """
        user_id = get_jwt_identity()
        
        try:
            updated_notification = self.notification_service.mark_as_read(notification_id, user_id)
            return jsonify({
                'status': 'success',
                'message': 'Notification marked as read',
                'data': updated_notification
            }), 200
        except ValueError as e:
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 404
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 500
    
    @jwt_required
    def mark_all_as_read(self):
        """
        Mark all notifications as read for the current user
        ---
        tags:
          - Notifications
        responses:
          200:
            description: All notifications marked as read
        """
        user_id = get_jwt_identity()
        
        try:
            count = self.notification_service.mark_all_as_read(user_id)
            return jsonify({
                'status': 'success',
                'message': f'{count} notifications marked as read'
            }), 200
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 500
