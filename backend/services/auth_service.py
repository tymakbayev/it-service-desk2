from datetime import datetime, timedelta
import bcrypt
from models.user_model import UserModel
from utils.jwt_util import JWTUtil
from config.database import db
from flask import current_app

class AuthService:
    @staticmethod
    def login(username, password):
        """
        Authenticate user and generate JWT token
        
        Args:
            username (str): User's username
            password (str): User's password
            
        Returns:
            dict: JWT tokens and user info or None if authentication fails
        """
        user = UserModel.query.filter_by(username=username).first()
        
        if not user or not bcrypt.checkpw(password.encode('utf-8'), user.password_hash):
            return None
            
        # Generate access and refresh tokens
        access_token = JWTUtil.generate_token({
            'user_id': user.id,
            'role': user.role,
            'type': 'access'
        })
        
        refresh_token = JWTUtil.generate_token({
            'user_id': user.id,
            'type': 'refresh'
        }, expires_in=current_app.config['JWT_REFRESH_EXPIRATION'])
        
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'full_name': user.full_name
            }
        }
    
    @staticmethod
    def register(user_data):
        """
        Register a new user
        
        Args:
            user_data (dict): User registration data
            
        Returns:
            int: User ID if registration successful, None otherwise
        """
        # Check if user already exists
        existing_user = UserModel.query.filter(
            (UserModel.username == user_data['username']) | 
            (UserModel.email == user_data['email'])
        ).first()
        
        if existing_user:
            return None
            
        # Hash password
        password_hash = bcrypt.hashpw(user_data['password'].encode('utf-8'), bcrypt.gensalt())
        
        # Create new user
        new_user = UserModel(
            username=user_data['username'],
            email=user_data['email'],
            password_hash=password_hash,
            full_name=user_data.get('full_name', ''),
            role=user_data.get('role', 'user'),  # Default role is 'user'
            created_at=datetime.utcnow()
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        return new_user.id
    
    @staticmethod
    def verify_token(token):
        """
        Verify JWT token and return user info
        
        Args:
            token (str): JWT token
            
        Returns:
            dict: User info if token is valid, None otherwise
        """
        payload = JWTUtil.decode_token(token)
        
        if not payload or payload.get('type') != 'access':
            return None
            
        user_id = payload.get('user_id')
        user = UserModel.query.get(user_id)
        
        if not user:
            return None
            
        return {
            'user_id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'full_name': user.full_name
        }
    
    @staticmethod
    def refresh_token(refresh_token):
        """
        Generate new access token using refresh token
        
        Args:
            refresh_token (str): JWT refresh token
            
        Returns:
            str: New access token if refresh token is valid, None otherwise
        """
        payload = JWTUtil.decode_token(refresh_token)
        
        if not payload or payload.get('type') != 'refresh':
            return None
            
        user_id = payload.get('user_id')
        user = UserModel.query.get(user_id)
        
        if not user:
            return None
            
        # Generate new access token
        access_token = JWTUtil.generate_token({
            'user_id': user.id,
            'role': user.role,
            'type': 'access'
        })
        
        return {
            'access_token': access_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'full_name': user.full_name
            }
        }
    
    @staticmethod
    def get_user_permissions(user_id):
        """
        Get user permissions based on role
        
        Args:
            user_id (int): User ID
            
        Returns:
            list: List of permissions
        """
        user = UserModel.query.get(user_id)
        
        if not user:
            return []
            
        # Define permissions based on role
        role_permissions = {
            'admin': [
                'view_dashboard', 'manage_users', 'manage_equipment',
                'manage_incidents', 'view_reports', 'generate_reports',
                'view_analytics', 'manage_settings'
            ],
            'technician': [
                'view_dashboard', 'view_equipment', 'update_equipment',
                'view_incidents', 'update_incidents', 'resolve_incidents',
                'view_reports'
            ],
            'user': [
                'view_dashboard', 'view_equipment', 'report_incident',
                'view_own_incidents'
            ]
        }
        
        return role_permissions.get(user.role, [])