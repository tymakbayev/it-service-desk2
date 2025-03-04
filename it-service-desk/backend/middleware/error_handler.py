from flask import jsonify, current_app
from werkzeug.exceptions import HTTPException
import traceback
import logging
import sys
from functools import wraps
from typing import Callable, Dict, Any, Tuple, Union

# Настройка логгера
logger = logging.getLogger(__name__)
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
))
logger.addHandler(handler)
logger.setLevel(logging.INFO)

class ErrorHandler:
    """
    Обработчик ошибок для Flask приложения.
    Предоставляет методы для единообразной обработки и логирования ошибок.
    """

    @staticmethod
    def handle_exception(e: Exception) -> Tuple[Dict[str, Any], int]:
        """
        Обрабатывает исключение и возвращает соответствующий HTTP ответ.
        
        Args:
            e: Исключение для обработки
            
        Returns:
            Tuple[Dict, int]: Словарь с информацией об ошибке и HTTP код ответа
        """
        # Логируем ошибку со стеком вызовов
        logger.error(f"Exception occurred: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Если это HTTP исключение, используем его код и сообщение
        if isinstance(e, HTTPException):
            return {
                'success': False,
                'error': {
                    'code': e.code,
                    'name': e.name,
                    'message': e.description
                }
            }, e.code
        
        # Для остальных исключений возвращаем 500 Internal Server Error
        error_message = str(e)
        if not error_message and hasattr(e, '__class__'):
            error_message = f"An error of type {e.__class__.__name__} occurred."
        
        # В режиме отладки включаем стек вызовов
        error_response = {
            'success': False,
            'error': {
                'code': 500,
                'name': 'Internal Server Error',
                'message': error_message
            }
        }
        
        if current_app.config.get('DEBUG', False):
            error_response['error']['traceback'] = traceback.format_exc()
        
        return error_response, 500

    @staticmethod
    def handle_validation_error(errors: Dict[str, Any]) -> Tuple[Dict[str, Any], int]:
        """
        Обрабатывает ошибки валидации и возвращает соответствующий HTTP ответ.
        
        Args:
            errors: Словарь с ошибками валидации
            
        Returns:
            Tuple[Dict, int]: Словарь с информацией об ошибках и HTTP код ответа
        """
        return {
            'success': False,
            'error': {
                'code': 400,
                'name': 'Validation Error',
                'message': 'Ошибка валидации данных',
                'details': errors
            }
        }, 400

    @staticmethod
    def handle_not_found(resource_type: str, resource_id: Union[str, int]) -> Tuple[Dict[str, Any], int]:
        """
        Обрабатывает ошибку "ресурс не найден" и возвращает соответствующий HTTP ответ.
        
        Args:
            resource_type: Тип ресурса (например, "user", "incident")
            resource_id: Идентификатор ресурса
            
        Returns:
            Tuple[Dict, int]: Словарь с информацией об ошибке и HTTP код ответа
        """
        return {
            'success': False,
            'error': {
                'code': 404,
                'name': 'Not Found',
                'message': f'{resource_type.capitalize()} с идентификатором {resource_id} не найден'
            }
        }, 404

    @staticmethod
    def handle_unauthorized() -> Tuple[Dict[str, Any], int]:
        """
        Обрабатывает ошибку неавторизованного доступа и возвращает соответствующий HTTP ответ.
        
        Returns:
            Tuple[Dict, int]: Словарь с информацией об ошибке и HTTP код ответа
        """
        return {
            'success': False,
            'error': {
                'code': 401,
                'name': 'Unauthorized',
                'message': 'Необходима авторизация для доступа к ресурсу'
            }
        }, 401

    @staticmethod
    def handle_forbidden() -> Tuple[Dict[str, Any], int]:
        """
        Обрабатывает ошибку запрещенного доступа и возвращает соответствующий HTTP ответ.
        
        Returns:
            Tuple[Dict, int]: Словарь с информацией об ошибке и HTTP код ответа
        """
        return {
            'success': False,
            'error': {
                'code': 403,
                'name': 'Forbidden',
                'message': 'У вас нет прав для доступа к этому ресурсу'
            }
        }, 403

    @staticmethod
    def handle_bad_request(message: str = "Некорректный запрос") -> Tuple[Dict[str, Any], int]:
        """
        Обрабатывает ошибку некорректного запроса и возвращает соответствующий HTTP ответ.
        
        Args:
            message: Сообщение об ошибке
            
        Returns:
            Tuple[Dict, int]: Словарь с информацией об ошибке и HTTP код ответа
        """
        return {
            'success': False,
            'error': {
                'code': 400,
                'name': 'Bad Request',
                'message': message
            }
        }, 400

    @staticmethod
    def handle_conflict(message: str = "Конфликт данных") -> Tuple[Dict[str, Any], int]:
        """
        Обрабатывает ошибку конфликта данных и возвращает соответствующий HTTP ответ.
        
        Args:
            message: Сообщение об ошибке
            
        Returns:
            Tuple[Dict, int]: Словарь с информацией об ошибке и HTTP код ответа
        """
        return {
            'success': False,
            'error': {
                'code': 409,
                'name': 'Conflict',
                'message': message
            }
        }, 409

    @staticmethod
    def api_error_handler(f: Callable) -> Callable:
        """
        Декоратор для обработки исключений в API-контроллерах.
        
        Args:
            f: Функция, которую нужно обернуть
            
        Returns:
            Callable: Обернутая функция
        """
        @wraps(f)
        def decorated(*args, **kwargs):
            try:
                return f(*args, **kwargs)
            except Exception as e:
                error_response, status_code = ErrorHandler.handle_exception(e)
                return jsonify(error_response), status_code
        return decorated


def register_error_handlers(app):
    """
    Регистрирует обработчики ошибок для Flask приложения.
    
    Args:
        app: Flask приложение
    """
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify(ErrorHandler.handle_bad_request()[0]), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify(ErrorHandler.handle_unauthorized()[0]), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify(ErrorHandler.handle_forbidden()[0]), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({
            'success': False,
            'error': {
                'code': 404,
                'name': 'Not Found',
                'message': 'Запрашиваемый ресурс не найден'
            }
        }), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({
            'success': False,
            'error': {
                'code': 405,
                'name': 'Method Not Allowed',
                'message': 'Метод не разрешен для запрашиваемого URL'
            }
        }), 405

    @app.errorhandler(409)
    def conflict(e):
        return jsonify(ErrorHandler.handle_conflict()[0]), 409

    @app.errorhandler(500)
    def internal_server_error(e):
        error_response, _ = ErrorHandler.handle_exception(e)
        return jsonify(error_response), 500

    # Обработчик для всех остальных ошибок
    @app.errorhandler(Exception)
    def handle_exception(e):
        error_response, status_code = ErrorHandler.handle_exception(e)
        return jsonify(error_response), status_code