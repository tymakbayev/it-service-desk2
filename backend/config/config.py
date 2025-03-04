import os
from datetime import timedelta
from dotenv import load_dotenv

# Загрузка переменных окружения из .env файла
load_dotenv()

class Config:
    """Базовый класс конфигурации"""
    # Общие настройки
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = False
    TESTING = False
    
    # Настройки базы данных
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/it_service_desk')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Настройки JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_BLACKLIST_ENABLED = True
    JWT_BLACKLIST_TOKEN_CHECKS = ['access', 'refresh']
    
    # Настройки CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')
    
    # Настройки почты
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True').lower() in ('true', '1', 't')
    MAIL_USE_SSL = os.getenv('MAIL_USE_SSL', 'False').lower() in ('true', '1', 't')
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@itservicedesk.com')
    
    # Настройки Celery
    CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
    CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
    
    # Настройки Redis
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    
    # Настройки приложения
    APP_NAME = 'IT Service Desk'
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max upload
    
    # Настройки ролей пользователей
    USER_ROLES = ['admin', 'support', 'user']
    
    # Настройки статусов инцидентов
    INCIDENT_STATUSES = ['open', 'in_progress', 'resolved', 'closed']
    
    # Настройки приоритетов инцидентов
    INCIDENT_PRIORITIES = ['low', 'medium', 'high', 'critical']
    
    # Настройки типов оборудования
    EQUIPMENT_TYPES = ['laptop', 'desktop', 'server', 'printer', 'network', 'peripheral', 'other']
    
    # Настройки статусов оборудования
    EQUIPMENT_STATUSES = ['active', 'repair', 'reserved', 'decommissioned']
    
    # Настройки форматов отчетов
    REPORT_FORMATS = ['pdf', 'csv', 'excel']
    
    # Настройки для пагинации
    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE = 100


class DevelopmentConfig(Config):
    """Конфигурация для разработки"""
    DEBUG = True
    
    # Настройки для отладки SQL запросов
    SQLALCHEMY_ECHO = True


class TestingConfig(Config):
    """Конфигурация для тестирования"""
    TESTING = True
    DEBUG = True
    
    # Использование тестовой БД
    SQLALCHEMY_DATABASE_URI = os.getenv('TEST_DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/it_service_desk_test')
    
    # Отключение отправки реальных писем
    MAIL_SUPPRESS_SEND = True
    
    # Использование синхронных задач вместо Celery
    CELERY_ALWAYS_EAGER = True


class ProductionConfig(Config):
    """Конфигурация для продакшена"""
    # Проверка наличия обязательных переменных окружения
    @classmethod
    def init_app(cls, app):
        required_vars = [
            'SECRET_KEY', 
            'JWT_SECRET_KEY', 
            'DATABASE_URL',
            'MAIL_USERNAME',
            'MAIL_PASSWORD'
        ]
        
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        if missing_vars:
            raise Exception(f"Missing required environment variables: {', '.join(missing_vars)}")
    
    # Дополнительные настройки безопасности для продакшена
    SESSION_COOKIE_SECURE = True
    REMEMBER_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_HTTPONLY = True


# Словарь для выбора конфигурации
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

# Функция для получения текущей конфигурации
def get_config():
    env = os.getenv('FLASK_ENV', 'default')
    return config.get(env, config['default'])