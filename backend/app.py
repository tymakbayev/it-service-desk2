# backend/app.py
import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_migrate import Migrate
from dotenv import load_dotenv
from datetime import datetime

# Импорт конфигурации и базы данных
from config.config import Config
from config.database import db, init_db

# Импорт контроллеров
from controllers.auth_controller import auth_bp
from controllers.incident_controller import incident_bp
from controllers.equipment_controller import equipment_bp
from controllers.notification_controller import notification_bp
from controllers.analytics_controller import analytics_bp

# Импорт middleware
from middleware.error_handler import register_error_handlers
from utils.jwt_util import jwt_required, get_current_user

# Загрузка переменных окружения
load_dotenv()

def create_app(config_class=Config):
    """
    Фабрика приложения Flask
    
    Args:
        config_class: Класс конфигурации
        
    Returns:
        Flask application
    """
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Настройка CORS
    CORS(app, resources={r"/api/*": {"origins": app.config['CORS_ORIGINS']}})
    
    # Инициализация базы данных
    init_db(app)
    
    # Настройка миграций
    migrate = Migrate(app, db)
    
    # Регистрация обработчиков ошибок
    register_error_handlers(app)
    
    # Регистрация Blueprint'ов
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(incident_bp, url_prefix='/api/incidents')
    app.register_blueprint(equipment_bp, url_prefix='/api/equipment')
    app.register_blueprint(notification_bp, url_prefix='/api/notifications')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    
    # Создание директории для загрузки файлов, если она не существует
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Корневой маршрут для проверки работоспособности API
    @app.route('/api/health')
    def health_check():
        return jsonify({
            'status': 'ok',
            'timestamp': datetime.now().isoformat(),
            'app_name': app.config['APP_NAME'],
            'version': '1.0.0'
        })
    
    # Маршрут для получения информации о текущем пользователе
    @app.route('/api/me')
    @jwt_required
    def get_me():
        current_user = get_current_user()
        if not current_user:
            return jsonify({'error': 'Unauthorized'}), 401
        
        return jsonify({
            'id': current_user.id,
            'email': current_user.email,
            'username': current_user.username,
            'first_name': current_user.first_name,
            'last_name': current_user.last_name,
            'role': current_user.role.name,
            'department': current_user.department,
            'created_at': current_user.created_at.isoformat() if current_user.created_at else None,
            'last_login': current_user.last_login.isoformat() if current_user.last_login else None
        })
    
    # Настройка Celery для фоновых задач
    from celery import Celery
    
    def make_celery(app):
        celery = Celery(
            app.import_name,
            backend=app.config['CELERY_RESULT_BACKEND'],
            broker=app.config['CELERY_BROKER_URL']
        )
        celery.conf.update(app.config)
        
        class ContextTask(celery.Task):
            def __call__(self, *args, **kwargs):
                with app.app_context():
                    return self.run(*args, **kwargs)
        
        celery.Task = ContextTask
        return celery
    
    celery = make_celery(app)
    
    # Фоновая задача для отправки уведомлений
    @celery.task
    def send_notifications(notification_data):
        from services.notification_service import NotificationService
        notification_service = NotificationService()
        notification_service.send_notification(notification_data)
    
    # Фоновая задача для генерации отчетов
    @celery.task
    def generate_report(report_type, params):
        from services.analytics_service import AnalyticsService
        analytics_service = AnalyticsService()
        return analytics_service.generate_report(report_type, params)
    
    # Добавление задач в контекст приложения
    app.send_notifications = send_notifications
    app.generate_report = generate_report
    
    # Настройка Flask-Mail для отправки электронной почты
    from flask_mail import Mail
    mail = Mail(app)
    app.mail = mail
    
    return app

# Создание экземпляра приложения
app = create_app()

if __name__ == '__main__':
    # Запуск приложения в режиме разработки
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=app.config['DEBUG'])