from functools import wraps
from typing import Dict, Any, Callable, Optional
from flask import request, jsonify, g
from werkzeug.local import LocalProxy

from utils.jwt_util import JWTUtil
from models.user import User

class AuthMiddleware:
    @staticmethod
    def authenticate(request) -> Optional[Dict[str, Any]]:
        """
        Проверяет аутентификацию пользователя по JWT токену в заголовке
        
        Args:
            request: Объект запроса Flask
            
        Returns:
            Dict или None: Информация о пользователе или None, если аутентификация не удалась
        """
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.split(' ')[1]
        user_data = JWTUtil.verify_token(token)
        
        if not user_data:
            return None
        
        # Проверяем существование пользователя в базе данных
        user = User.query.get(user_data['id'])
        if not user:
            return None
        
        # Добавляем дополнительную информацию о пользователе
        user_data['is_active'] = user.is_active
        return user_data
    
    @staticmethod
    def require_auth(f: Callable) -> Callable:
        """
        Декоратор для проверки аутентификации пользователя
        
        Args:
            f: Функция, которую нужно обернуть
            
        Returns:
            Callable: Обернутая функция
        """
        @wraps(f)
        def decorated(*args, **kwargs):
            user_info = AuthMiddleware.authenticate(request)
            
            if not user_info:
                return jsonify({
                    'success': False,
                    'message': 'Требуется аутентификация'
                }), 401
            
            # Сохраняем информацию о пользователе в контексте запроса
            g.user = user_info
            
            return f(*args, **kwargs)
        return decorated
    
    @staticmethod
    def require_role(role: str) -> Callable:
        """
        Декоратор для проверки роли пользователя
        
        Args:
            role: Требуемая роль (admin, technician, user)
            
        Returns:
            Callable: Декоратор
        """
        def decorator(f: Callable) -> Callable:
            @wraps(f)
            def decorated(*args, **kwargs):
                user_info = AuthMiddleware.authenticate(request)
                
                if not user_info:
                    return jsonify({
                        'success': False,
                        'message': 'Требуется аутентификация'
                    }), 401
                
                if user_info['role'] != role and user_info['role'] != 'admin':
                    return jsonify({
                        'success': False,
                        'message': f'Требуется роль {role}'
                    }), 403
                
                # Сохраняем информацию о пользователе в контексте запроса
                g.user = user_info
                
                return f(*args, **kwargs)
            return decorated
        return decorator

# Прокси для доступа к текущему пользователю
current_user = LocalProxy(lambda: getattr(g, 'user', None))
