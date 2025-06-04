import jwt
import datetime
from typing import Dict, Any, Optional
from flask import current_app, request, jsonify, g
from functools import wraps

class JWTUtil:
    @staticmethod
    def generate_token(user_data: Dict[str, Any]) -> str:
        """
        Генерирует JWT токен на основе данных пользователя
        
        Args:
            user_data: Словарь с данными пользователя (id, role, etc.)
            
        Returns:
            str: JWT токен
        """
        payload = {
            'sub': user_data['id'],
            'role': user_data['role'],
            'name': user_data.get('name', ''),
            'email': user_data.get('email', ''),
            'iat': datetime.datetime.utcnow(),
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
        }
        
        return jwt.encode(
            payload,
            current_app.config['JWT_SECRET_KEY'],
            algorithm='HS256'
        )
    
    @staticmethod
    def verify_token(token: str) -> Optional[Dict[str, Any]]:
        """
        Проверяет JWT токен и возвращает данные пользователя
        
        Args:
            token: JWT токен для проверки
            
        Returns:
            Dict или None: Данные пользователя или None, если токен недействителен
        """
        try:
            payload = jwt.decode(
                token,
                current_app.config['JWT_SECRET_KEY'],
                algorithms=['HS256']
            )
            
            return {
                'id': payload['sub'],
                'role': payload['role'],
                'name': payload.get('name', ''),
                'email': payload.get('email', ''),
                'exp': payload.get('exp')
            }
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    @staticmethod
    def generate_refresh_token(user_id: int) -> str:
        """
        Генерирует refresh токен для обновления JWT токена
        
        Args:
            user_id: ID пользователя
            
        Returns:
            str: Refresh токен
        """
        payload = {
            'sub': user_id,
            'type': 'refresh',
            'iat': datetime.datetime.utcnow(),
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=30)
        }
        
        return jwt.encode(
            payload,
            current_app.config['JWT_REFRESH_SECRET_KEY'],
            algorithm='HS256'
        )


def jwt_required(func=None):
    """Simple JWT authorization decorator"""
    if func is None:
        return lambda f: jwt_required(f)

    @wraps(func)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        token = auth_header.split(' ')[1]
        user_data = JWTUtil.verify_token(token)
        if not user_data:
            return jsonify({'error': 'Invalid token'}), 401
        g.current_user = user_data
        return func(*args, **kwargs)

    return wrapper


def get_current_user():
    return getattr(g, 'current_user', None)


def generate_token(user_data: Dict[str, Any]) -> str:
    return JWTUtil.generate_token(user_data)


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    return JWTUtil.verify_token(token)


def validate_token(token: str) -> bool:
    return JWTUtil.verify_token(token) is not None
