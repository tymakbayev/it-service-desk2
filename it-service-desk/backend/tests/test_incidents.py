import pytest
import json
import sys
import os
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock, Mock

# Добавляем корневую директорию проекта в sys.path для импорта модулей
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from config.config import Config
from config.database import db
from models.user import User
from models.role import Role
from models.incident import Incident, IncidentStatus, IncidentPriority
from models.equipment import Equipment
from services.incident_service import IncidentService
from services.notification_service import NotificationService
from utils.jwt_util import generate_token

# Тестовая конфигурация
class TestConfig(Config):
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    JWT_SECRET_KEY = 'test-jwt-secret-key'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=1)


@pytest.fixture
def app():
    """Создание тестового Flask приложения"""
    app = create_app(TestConfig)
    
    # Создаем контекст приложения
    with app.app_context():
        # Создаем все таблицы в тестовой БД
        db.create_all()
        
        # Создаем роли
        admin_role = Role(name='admin', description='Administrator')
        support_role = Role(name='support', description='Support Specialist')
        user_role = Role(name='user', description='Regular User')
        
        db.session.add_all([admin_role, support_role, user_role])
        db.session.commit()
        
        # Создаем тестовых пользователей
        test_admin = User(
            username='admin',
            email='admin@example.com',
            password='$2b$12$tVN1BzXJkRGm4IQO9aXIyexjFTtOdUvPi7Wh8W.9SMFTEcFYwqcbu',  # admin123
            first_name='Admin',
            last_name='User',
            role_id=admin_role.id,
            is_active=True
        )
        
        test_support = User(
            username='support',
            email='support@example.com',
            password='$2b$12$tVN1BzXJkRGm4IQO9aXIyexjFTtOdUvPi7Wh8W.9SMFTEcFYwqcbu',  # admin123
            first_name='Support',
            last_name='User',
            role_id=support_role.id,
            is_active=True
        )
        
        test_user = User(
            username='user',
            email='user@example.com',
            password='$2b$12$tVN1BzXJkRGm4IQO9aXIyexjFTtOdUvPi7Wh8W.9SMFTEcFYwqcbu',  # admin123
            first_name='Regular',
            last_name='User',
            role_id=user_role.id,
            is_active=True
        )
        
        db.session.add_all([test_admin, test_support, test_user])
        db.session.commit()
        
        # Создаем тестовое оборудование
        test_equipment = Equipment(
            name='Test Laptop',
            type='Laptop',
            serial_number='SN123456',
            inventory_number='INV-001',
            status='active',
            purchase_date=datetime.now() - timedelta(days=365),
            warranty_end_date=datetime.now() + timedelta(days=365),
            assigned_to=test_user.id,
            location='Office 101',
            notes='Test equipment'
        )
        
        db.session.add(test_equipment)
        db.session.commit()
        
        # Создаем тестовые инциденты
        test_incident1 = Incident(
            title='Test Incident 1',
            description='This is a test incident 1',
            status=IncidentStatus.OPEN.value,
            priority=IncidentPriority.MEDIUM.value,
            reported_by=test_user.id,
            assigned_to=test_support.id,
            equipment_id=test_equipment.id,
            created_at=datetime.now() - timedelta(days=2),
            updated_at=datetime.now() - timedelta(days=1)
        )
        
        test_incident2 = Incident(
            title='Test Incident 2',
            description='This is a test incident 2',
            status=IncidentStatus.IN_PROGRESS.value,
            priority=IncidentPriority.HIGH.value,
            reported_by=test_user.id,
            assigned_to=test_support.id,
            created_at=datetime.now() - timedelta(days=5),
            updated_at=datetime.now() - timedelta(days=3)
        )
        
        test_incident3 = Incident(
            title='Test Incident 3',
            description='This is a test incident 3',
            status=IncidentStatus.RESOLVED.value,
            priority=IncidentPriority.LOW.value,
            reported_by=test_user.id,
            assigned_to=test_admin.id,
            resolution='Fixed by restarting',
            created_at=datetime.now() - timedelta(days=10),
            updated_at=datetime.now() - timedelta(days=8),
            resolved_at=datetime.now() - timedelta(days=8)
        )
        
        db.session.add_all([test_incident1, test_incident2, test_incident3])
        db.session.commit()
        
        yield app
        
        # Очищаем БД после тестов
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Создает тестовый клиент Flask"""
    return app.test_client()


@pytest.fixture
def auth_headers():
    """Создает заголовки авторизации для разных ролей"""
    admin_token = generate_token({'user_id': 1, 'role': 'admin'})
    support_token = generate_token({'user_id': 2, 'role': 'support'})
    user_token = generate_token({'user_id': 3, 'role': 'user'})
    
    return {
        'admin': {'Authorization': f'Bearer {admin_token}'},
        'support': {'Authorization': f'Bearer {support_token}'},
        'user': {'Authorization': f'Bearer {user_token}'}
    }


@pytest.fixture
def incident_service(app):
    """Создает экземпляр сервиса инцидентов"""
    with app.app_context():
        return IncidentService()


class TestIncidentAPI:
    """Тесты API для работы с инцидентами"""
    
    def test_get_all_incidents(self, client, auth_headers):
        """Тест получения списка всех инцидентов"""
        # Администратор должен видеть все инциденты
        response = client.get('/api/incidents', headers=auth_headers['admin'])
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['incidents']) == 3
        
        # Специалист поддержки должен видеть все инциденты
        response = client.get('/api/incidents', headers=auth_headers['support'])
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['incidents']) == 3
        
        # Обычный пользователь должен видеть только свои инциденты
        response = client.get('/api/incidents', headers=auth_headers['user'])
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['incidents']) == 3  # В тестовых данных все инциденты созданы пользователем
    
    def test_get_incident_by_id(self, client, auth_headers):
        """Тест получения инцидента по ID"""
        # Администратор может получить любой инцидент
        response = client.get('/api/incidents/1', headers=auth_headers['admin'])
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['incident']['id'] == 1
        assert data['incident']['title'] == 'Test Incident 1'
        
        # Специалист поддержки может получить любой инцидент
        response = client.get('/api/incidents/2', headers=auth_headers['support'])
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['incident']['id'] == 2
        
        # Пользователь может получить только свои инциденты
        response = client.get('/api/incidents/1', headers=auth_headers['user'])
        assert response.status_code == 200  # Инцидент принадлежит пользователю
        
        # Тест на несуществующий инцидент
        response = client.get('/api/incidents/999', headers=auth_headers['admin'])
        assert response.status_code == 404
    
    def test_create_incident(self, client, auth_headers):
        """Тест создания нового инцидента"""
        new_incident = {
            'title': 'New Test Incident',
            'description': 'This is a new test incident',
            'priority': IncidentPriority.HIGH.value,
            'equipment_id': 1
        }
        
        # Пользователь может создать инцидент
        response = client.post(
            '/api/incidents',
            headers=auth_headers['user'],
            data=json.dumps(new_incident),
            content_type='application/json'
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['incident']['title'] == 'New Test Incident'
        assert data['incident']['status'] == IncidentStatus.OPEN.value
        assert data['incident']['reported_by'] == 3  # ID пользователя
        
        # Проверка обязательных полей
        invalid_incident = {
            'description': 'Missing title'
        }
        response = client.post(
            '/api/incidents',
            headers=auth_headers['user'],
            data=json.dumps(invalid_incident),
            content_type='application/json'
        )
        assert response.status_code == 400
    
    def test_update_incident(self, client, auth_headers):
        """Тест обновления инцидента"""
        update_data = {
            'status': IncidentStatus.IN_PROGRESS.value,
            'priority': IncidentPriority.HIGH.value,
            'assigned_to': 2  # ID специалиста поддержки
        }
        
        # Администратор может обновить любой инцидент
        response = client.put(
            '/api/incidents/1',
            headers=auth_headers['admin'],
            data=json.dumps(update_data),
            content_type='application/json'
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['incident']['status'] == IncidentStatus.IN_PROGRESS.value
        assert data['incident']['priority'] == IncidentPriority.HIGH.value
        
        # Специалист поддержки может обновить назначенный ему инцидент
        update_data = {
            'status': IncidentStatus.RESOLVED.value,
            'resolution': 'Fixed the issue'
        }
        response = client.put(
            '/api/incidents/1',
            headers=auth_headers['support'],
            data=json.dumps(update_data),
            content_type='application/json'
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['incident']['status'] == IncidentStatus.RESOLVED.value
        assert data['incident']['resolution'] == 'Fixed the issue'
        
        # Пользователь не может изменить статус инцидента
        update_data = {
            'status': IncidentStatus.CLOSED.value
        }
        response = client.put(
            '/api/incidents/1',
            headers=auth_headers['user'],
            data=json.dumps(update_data),
            content_type='application/json'
        )
        assert response.status_code == 403
        
        # Пользователь может добавить комментарий к своему инциденту
        update_data = {
            'description': 'Updated description'
        }
        response = client.put(
            '/api/incidents/1',
            headers=auth_headers['user'],
            data=json.dumps(update_data),
            content_type='application/json'
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['incident']['description'] == 'Updated description'
    
    def test_delete_incident(self, client, auth_headers):
        """Тест удаления инцидента"""
        # Только администратор может удалить инцидент
        response = client.delete('/api/incidents/3', headers=auth_headers['admin'])
        assert response.status_code == 204
        
        # Проверяем, что инцидент удален
        response = client.get('/api/incidents/3', headers=auth_headers['admin'])
        assert response.status_code == 404
        
        # Специалист поддержки не может удалить инцидент
        response = client.delete('/api/incidents/2', headers=auth_headers['support'])
        assert response.status_code == 403
        
        # Пользователь не может удалить инцидент
        response = client.delete('/api/incidents/1', headers=auth_headers['user'])
        assert response.status_code == 403
    
    def test_filter_incidents(self, client, auth_headers):
        """Тест фильтрации инцидентов"""
        # Фильтрация по статусу
        response = client.get(
            '/api/incidents?status=open',
            headers=auth_headers['admin']
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['incidents']) == 1
        assert data['incidents'][0]['status'] == IncidentStatus.OPEN.value
        
        # Фильтрация по приоритету
        response = client.get(
            '/api/incidents?priority=high',
            headers=auth_headers['admin']
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['incidents']) == 1
        assert data['incidents'][0]['priority'] == IncidentPriority.HIGH.value
        
        # Фильтрация по назначенному специалисту
        response = client.get(
            '/api/incidents?assigned_to=2',
            headers=auth_headers['admin']
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['incidents']) == 2
        
        # Комбинированная фильтрация
        response = client.get(
            '/api/incidents?status=in_progress&priority=high',
            headers=auth_headers['admin']
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['incidents']) == 1
        assert data['incidents'][0]['status'] == IncidentStatus.IN_PROGRESS.value
        assert data['incidents'][0]['priority'] == IncidentPriority.HIGH.value


class TestIncidentService:
    """Тесты для сервиса инцидентов"""
    
    def test_get_all_incidents(self, app, incident_service):
        """Тест получения всех инцидентов"""
        with app.app_context():
            # Администратор видит все инциденты
            incidents = incident_service.get_all_incidents(user_id=1, role='admin')
            assert len(incidents) == 3
            
            # Специалист поддержки видит все инциденты
            incidents = incident_service.get_all_incidents(user_id=2, role='support')
            assert len(incidents) == 3
            
            # Пользователь видит только свои инциденты
            incidents = incident_service.get_all_incidents(user_id=3, role='user')
            assert len(incidents) == 3  # В тестовых данных все инциденты созданы пользователем
    
    def test_get_incident_by_id(self, app, incident_service):
        """Тест получения инцидента по ID"""
        with app.app_context():
            # Существующий инцидент
            incident = incident_service.get_incident_by_id(1)
            assert incident is not None
            assert incident.id == 1
            assert incident.title == 'Test Incident 1'
            
            # Несуществующий инцидент
            incident = incident_service.get_incident_by_id(999)
            assert incident is None
    
    def test_create_incident(self, app, incident_service):
        """Тест создания инцидента"""
        with app.app_context():
            # Создание инцидента с минимальными данными
            incident_data = {
                'title': 'New Service Test Incident',
                'description': 'This is a new test incident created via service',
                'priority': IncidentPriority.MEDIUM.value,
                'reported_by': 3
            }
            
            new_incident = incident_service.create_incident(incident_data)
            assert new_incident is not None
            assert new_incident.title == 'New Service Test Incident'
            assert new_incident.status == IncidentStatus.OPEN.value
            assert new_incident.reported_by == 3
            
            # Проверка, что инцидент сохранен в БД
            saved_incident = incident_service.get_incident_by_id(new_incident.id)
            assert saved_incident is not None
            assert saved_incident.id == new_incident.id
    
    @patch('services.notification_service.NotificationService.create_notification')
    def test_update_incident_status(self, mock_create_notification, app, incident_service):
        """Тест обновления статуса инцидента с отправкой уведомления"""
        with app.app_context():
            # Настраиваем мок для создания уведомления
            mock_create_notification.return_value = MagicMock()
            
            # Обновляем статус инцидента
            updated_incident = incident_service.update_incident(1, {
                'status': IncidentStatus.IN_PROGRESS.value,
                'assigned_to': 2
            })
            
            assert updated_incident is not None
            assert updated_incident.status == IncidentStatus.IN_PROGRESS.value
            assert updated_incident.assigned_to == 2
            
            # Проверяем, что было создано уведомление
            mock_create_notification.assert_called_once()
            args, kwargs = mock_create_notification.call_args
            assert args[0] == 3  # ID пользователя, создавшего инцидент
            assert 'status' in args[1]
            assert args[1]['incident_id'] == 1
    
    def test_resolve_incident(self, app, incident_service):
        """Тест разрешения инцидента"""
        with app.app_context():
            # Разрешаем инцидент
            resolution_data = {
                'status': IncidentStatus.RESOLVED.value,
                'resolution': 'Issue fixed by restarting the system',
                'resolved_by': 2
            }
            
            resolved_incident = incident_service.update_incident(1, resolution_data)
            assert resolved_incident is not None
            assert resolved_incident.status == IncidentStatus.RESOLVED.value
            assert resolved_incident.resolution == 'Issue fixed by restarting the system'
            assert resolved_incident.resolved_by == 2
            assert resolved_incident.resolved_at is not None
    
    def test_close_incident(self, app, incident_service):
        """Тест закрытия инцидента"""
        with app.app_context():
            # Сначала разрешаем инцидент
            incident_service.update_incident(1, {
                'status': IncidentStatus.RESOLVED.value,
                'resolution': 'Fixed',
                'resolved_by': 2
            })
            
            # Затем закрываем инцидент
            closed_incident = incident_service.update_incident(1, {
                'status': IncidentStatus.CLOSED.value,
                'closed_by': 1
            })
            
            assert closed_incident is not None
            assert closed_incident.status == IncidentStatus.CLOSED.value
            assert closed_incident.closed_by == 1
            assert closed_incident.closed_at is not None
    
    def test_delete_incident(self, app, incident_service):
        """Тест удаления инцидента"""
        with app.app_context():
            # Удаляем инцидент
            result = incident_service.delete_incident(3)
            assert result is True
            
            # Проверяем, что инцидент удален
            deleted_incident = incident_service.get_incident_by_id(3)
            assert deleted_incident is None
            
            # Попытка удалить несуществующий инцидент
            result = incident_service.delete_incident(999)
            assert result is False
    
    def test_filter_incidents(self, app, incident_service):
        """Тест фильтрации инцидентов"""
        with app.app_context():
            # Фильтрация по статусу
            filters = {'status': IncidentStatus.OPEN.value}
            incidents = incident_service.get_all_incidents(user_id=1, role='admin', filters=filters)
            assert len(incidents) == 1
            assert incidents[0].status == IncidentStatus.OPEN.value
            
            # Фильтрация по приоритету
            filters = {'priority': IncidentPriority.HIGH.value}
            incidents = incident_service.get_all_incidents(user_id=1, role='admin', filters=filters)
            assert len(incidents) == 1
            assert incidents[0].priority == IncidentPriority.HIGH.value
            
            # Фильтрация по оборудованию
            filters = {'equipment_id': 1}
            incidents = incident_service.get_all_incidents(user_id=1, role='admin', filters=filters)
            assert len(incidents) == 1
            assert incidents[0].equipment_id == 1
            
            # Комбинированная фильтрация
            filters = {
                'status': IncidentStatus.OPEN.value,
                'priority': IncidentPriority.MEDIUM.value
            }
            incidents = incident_service.get_all_incidents(user_id=1, role='admin', filters=filters)
            assert len(incidents) == 1
            assert incidents[0].status == IncidentStatus.OPEN.value
            assert incidents[0].priority == IncidentPriority.MEDIUM.value


class TestIncidentStatistics:
    """Тесты для статистики инцидентов"""
    
    def test_get_incident_stats_by_status(self, app, incident_service):
        """Тест получения статистики инцидентов по статусу"""
        with app.app_context():
            stats = incident_service.get_stats_by_status()
            assert len(stats) > 0
            
            # Проверяем, что в статистике есть все статусы из тестовых данных
            status_counts = {item['status']: item['count'] for item in stats}
            assert IncidentStatus.OPEN.value in status_counts
            assert IncidentStatus.IN_PROGRESS.value in status_counts
            assert IncidentStatus.RESOLVED.value in status_counts
            
            # Проверяем количество инцидентов по статусам
            assert status_counts[IncidentStatus.OPEN.value] == 1
            assert status_counts[IncidentStatus.IN_PROGRESS.value] == 1
            assert status_counts[IncidentStatus.RESOLVED.value] == 1
    
    def test_get_incident_stats_by_priority(self, app, incident_service):
        """Тест получения статистики инцидентов по приоритету"""
        with app.app_context():
            stats = incident_service.get_stats_by_priority()
            assert len(stats) > 0
            
            # Проверяем, что в статистике есть все приоритеты из тестовых данных
            priority_counts = {item['priority']: item['count'] for item in stats}
            assert IncidentPriority.LOW.value in priority_counts
            assert IncidentPriority.MEDIUM.value in priority_counts
            assert IncidentPriority.HIGH.value in priority_counts
            
            # Проверяем количество инцидентов по приоритетам
            assert priority_counts[IncidentPriority.LOW.value] == 1
            assert priority_counts[IncidentPriority.MEDIUM.value] == 1
            assert priority_counts[IncidentPriority.HIGH.value] == 1
    
    def test_get_incident_stats_by_time(self, app, incident_service):
        """Тест получения статистики инцидентов по времени"""
        with app.app_context():
            # Статистика за последние 30 дней
            stats = incident_service.get_stats_by_time(days=30)
            assert len(stats) > 0
            
            # Проверяем, что в статистике есть данные за период
            total_incidents = sum(item['count'] for item in stats)
            assert total_incidents == 3  # Все тестовые инциденты созданы в течение последних 30 дней
            
            # Статистика за последние 7 дней
            stats = incident_service.get_stats_by_time(days=7)
            total_incidents = sum(item['count'] for item in stats)
            assert total_incidents == 2  # Два инцидента созданы в течение последних 7 дней
    
    def test_get_incident_resolution_time(self, app, incident_service):
        """Тест получения статистики по времени разрешения инцидентов"""
        with app.app_context():
            # Создаем инцидент и сразу разрешаем его
            incident_data = {
                'title': 'Quick Resolution Incident',
                'description': 'This incident will be resolved quickly',
                'priority': IncidentPriority.HIGH.value,
                'reported_by': 3
            }
            
            new_incident = incident_service.create_incident(incident_data)
            
            # Устанавливаем время создания на 2 часа назад
            created_time = datetime.now() - timedelta(hours=2)
            new_incident.created_at = created_time
            db.session.commit()
            
            # Разрешаем инцидент
            incident_service.update_incident(new_incident.id, {
                'status': IncidentStatus.RESOLVED.value,
                'resolution': 'Fixed quickly',
                'resolved_by': 2
            })
            
            # Получаем статистику по времени разрешения
            stats = incident_service.get_avg_resolution_time()
            assert stats is not None
            assert 'avg_resolution_time' in stats
            assert stats['avg_resolution_time'] > 0
            
            # Проверяем статистику по приоритетам
            priority_stats = incident_service.get_avg_resolution_time_by_priority()
            assert len(priority_stats) > 0
            
            # Должны быть данные для высокого приоритета
            high_priority_stats = next((item for item in priority_stats if item['priority'] == IncidentPriority.HIGH.value), None)
            assert high_priority_stats is not None
            assert high_priority_stats['avg_resolution_time'] > 0


class TestIncidentValidation:
    """Тесты для валидации данных инцидентов"""
    
    def test_validate_incident_creation(self, app, incident_service):
        """Тест валидации при создании инцидента"""
        with app.app_context():
            # Валидные данные
            valid_data = {
                'title': 'Valid Incident',
                'description': 'This is a valid incident',
                'priority': IncidentPriority.MEDIUM.value,
                'reported_by': 3
            }
            
            # Должно пройти валидацию без ошибок
            try:
                incident_service.validate_incident_data(valid_data, is_new=True)
            except ValueError:
                pytest.fail("Validation failed for valid data")
            
            # Отсутствует обязательное поле title
            invalid_data = {
                'description': 'Missing title',
                'priority': IncidentPriority.MEDIUM.value,
                'reported_by': 3
            }
            
            # Должна быть ошибка валидации
            with pytest.raises(ValueError):
                incident_service.validate_incident_data(invalid_data, is_new=True)
            
            # Неверный приоритет
            invalid_data = {
                'title': 'Invalid Priority',
                'description': 'This incident has invalid priority',
                'priority': 'super-high',  # Недопустимое значение
                'reported_by': 3
            }
            
            # Должна быть ошибка валидации
            with pytest.raises(ValueError):
                incident_service.validate_incident_data(invalid_data, is_new=True)
    
    def test_validate_incident_update(self, app, incident_service):
        """Тест валидации при обновлении инцидента"""
        with app.app_context():
            # Валидные данные для обновления
            valid_update = {
                'status': IncidentStatus.IN_PROGRESS.value,
                'priority': IncidentPriority.HIGH.value,
                'assigned_to': 2
            }
            
            # Должно пройти валидацию без ошибок
            try:
                incident_service.validate_incident_data(valid_update, is_new=False)
            except ValueError:
                pytest.fail("Validation failed for valid update data")
            
            # Неверный статус
            invalid_update = {
                'status': 'pending',  # Недопустимое значение
                'priority': IncidentPriority.HIGH.value
            }
            
            # Должна быть ошибка валидации
            with pytest.raises(ValueError):
                incident_service.validate_incident_data(invalid_update, is_new=False)
            
            # Попытка обновить несуществующего пользователя
            invalid_update = {
                'status': IncidentStatus.IN_PROGRESS.value,
                'assigned_to': 999  # Несуществующий пользователь
            }
            
            # Должна быть ошибка валидации при проверке существования пользователя
            with pytest.raises(ValueError):
                incident_service.validate_incident_data(invalid_update, is_new=False)
    
    def test_validate_resolution(self, app, incident_service):
        """Тест валидации при разрешении инцидента"""
        with app.app_context():
            # Валидные данные для разрешения
            valid_resolution = {
                'status': IncidentStatus.RESOLVED.value,
                'resolution': 'Fixed the issue by restarting',
                'resolved_by': 2
            }
            
            # Должно пройти валидацию без ошибок
            try:
                incident_service.validate_incident_data(valid_resolution, is_new=False)
            except ValueError:
                pytest.fail("Validation failed for valid resolution data")
            
            # Отсутствует обязательное поле resolution при статусе RESOLVED
            invalid_resolution = {
                'status': IncidentStatus.RESOLVED.value,
                'resolved_by': 2
                # Отсутствует resolution
            }
            
            # Должна быть ошибка валидации
            with pytest.raises(ValueError):
                incident_service.validate_incident_data(invalid_resolution, is_new=False)


if __name__ == '__main__':
    pytest.main()