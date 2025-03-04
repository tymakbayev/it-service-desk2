import jwt
import datetime
from typing import Dict, Any, Optional
from flask import current_app

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
