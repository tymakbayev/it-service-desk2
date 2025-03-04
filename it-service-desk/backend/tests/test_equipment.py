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
from models.equipment import Equipment, EquipmentStatus, EquipmentType
from models.incident import Incident
from services.equipment_service import EquipmentService
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
        test_laptop = Equipment(
            name='Test Laptop',
            serial_number='SN12345678',
            inventory_number='INV001',
            type=EquipmentType.LAPTOP,
            status=EquipmentStatus.IN_USE,
            purchase_date=datetime.now() - timedelta(days=365),
            warranty_end_date=datetime.now() + timedelta(days=365),
            assigned_to=test_user.id,
            location='Office 101',
            department='IT Department',
            manufacturer='Dell',
            model='XPS 15',
            specifications='Intel i7, 16GB RAM, 512GB SSD',
            notes='Company laptop for development',
            created_by=test_admin.id,
            last_updated_by=test_admin.id
        )
        
        test_monitor = Equipment(
            name='Test Monitor',
            serial_number='MON87654321',
            inventory_number='INV002',
            type=EquipmentType.MONITOR,
            status=EquipmentStatus.IN_USE,
            purchase_date=datetime.now() - timedelta(days=180),
            warranty_end_date=datetime.now() + timedelta(days=545),
            assigned_to=test_user.id,
            location='Office 101',
            department='IT Department',
            manufacturer='Dell',
            model='U2719D',
            specifications='27-inch, 2560x1440, IPS',
            notes='External monitor for developers',
            created_by=test_admin.id,
            last_updated_by=test_admin.id
        )
        
        test_printer = Equipment(
            name='Test Printer',
            serial_number='PRN55555555',
            inventory_number='INV003',
            type=EquipmentType.PRINTER,
            status=EquipmentStatus.AVAILABLE,
            purchase_date=datetime.now() - timedelta(days=90),
            warranty_end_date=datetime.now() + timedelta(days=640),
            assigned_to=None,
            location='Office 102',
            department='Administration',
            manufacturer='HP',
            model='LaserJet Pro',
            specifications='Color, Wireless, Duplex',
            notes='Shared printer for office use',
            created_by=test_admin.id,
            last_updated_by=test_admin.id
        )
        
        db.session.add_all([test_laptop, test_monitor, test_printer])
        db.session.commit()
        
        yield app
        
        # Очистка после тестов
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Создание тестового клиента"""
    return app.test_client()


@pytest.fixture
def admin_token(app):
    """Создание JWT токена для администратора"""
    with app.app_context():
        admin = User.query.filter_by(username='admin').first()
        return generate_token(admin.id, 'admin')


@pytest.fixture
def support_token(app):
    """Создание JWT токена для специалиста поддержки"""
    with app.app_context():
        support = User.query.filter_by(username='support').first()
        return generate_token(support.id, 'support')


@pytest.fixture
def user_token(app):
    """Создание JWT токена для обычного пользователя"""
    with app.app_context():
        user = User.query.filter_by(username='user').first()
        return generate_token(user.id, 'user')


def test_get_all_equipment(client, admin_token):
    """Тест получения списка всего оборудования"""
    response = client.get(
        '/api/equipment',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'equipment' in data
    assert len(data['equipment']) == 3
    assert data['equipment'][0]['name'] == 'Test Laptop'
    assert data['equipment'][1]['name'] == 'Test Monitor'
    assert data['equipment'][2]['name'] == 'Test Printer'


def test_get_equipment_by_id(client, admin_token, app):
    """Тест получения оборудования по ID"""
    with app.app_context():
        equipment = Equipment.query.filter_by(name='Test Laptop').first()
        
    response = client.get(
        f'/api/equipment/{equipment.id}',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['equipment']['name'] == 'Test Laptop'
    assert data['equipment']['serial_number'] == 'SN12345678'
    assert data['equipment']['inventory_number'] == 'INV001'
    assert data['equipment']['type'] == 'LAPTOP'
    assert data['equipment']['status'] == 'IN_USE'


def test_get_equipment_by_id_not_found(client, admin_token):
    """Тест получения несуществующего оборудования"""
    response = client.get(
        '/api/equipment/9999',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 404
    data = json.loads(response.data)
    assert 'error' in data
    assert 'not found' in data['error'].lower()


def test_create_equipment(client, admin_token):
    """Тест создания нового оборудования"""
    new_equipment = {
        'name': 'New Server',
        'serial_number': 'SRV123456',
        'inventory_number': 'INV004',
        'type': 'SERVER',
        'status': 'AVAILABLE',
        'purchase_date': (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'),
        'warranty_end_date': (datetime.now() + timedelta(days=730)).strftime('%Y-%m-%d'),
        'location': 'Server Room',
        'department': 'IT Department',
        'manufacturer': 'Dell',
        'model': 'PowerEdge R740',
        'specifications': '2x Intel Xeon, 64GB RAM, 4TB SSD RAID',
        'notes': 'Main application server'
    }
    
    response = client.post(
        '/api/equipment',
        headers={
            'Authorization': f'Bearer {admin_token}',
            'Content-Type': 'application/json'
        },
        data=json.dumps(new_equipment)
    )
    
    assert response.status_code == 201
    data = json.loads(response.data)
    assert 'equipment' in data
    assert data['equipment']['name'] == 'New Server'
    assert data['equipment']['serial_number'] == 'SRV123456'
    assert data['equipment']['type'] == 'SERVER'
    assert data['equipment']['status'] == 'AVAILABLE'
    assert 'id' in data['equipment']


def test_create_equipment_validation_error(client, admin_token):
    """Тест создания оборудования с неверными данными"""
    invalid_equipment = {
        'name': '',  # Пустое имя
        'serial_number': 'SRV123456',
        'inventory_number': 'INV004',
        'type': 'INVALID_TYPE',  # Неверный тип
        'status': 'AVAILABLE',
    }
    
    response = client.post(
        '/api/equipment',
        headers={
            'Authorization': f'Bearer {admin_token}',
            'Content-Type': 'application/json'
        },
        data=json.dumps(invalid_equipment)
    )
    
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'error' in data
    assert 'validation' in data['error'].lower()


def test_update_equipment(client, admin_token, app):
    """Тест обновления оборудования"""
    with app.app_context():
        equipment = Equipment.query.filter_by(name='Test Laptop').first()
    
    update_data = {
        'name': 'Updated Laptop',
        'status': 'UNDER_REPAIR',
        'notes': 'Laptop is being repaired due to screen issues',
        'location': 'Repair Center'
    }
    
    response = client.put(
        f'/api/equipment/{equipment.id}',
        headers={
            'Authorization': f'Bearer {admin_token}',
            'Content-Type': 'application/json'
        },
        data=json.dumps(update_data)
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['equipment']['name'] == 'Updated Laptop'
    assert data['equipment']['status'] == 'UNDER_REPAIR'
    assert data['equipment']['notes'] == 'Laptop is being repaired due to screen issues'
    assert data['equipment']['location'] == 'Repair Center'
    
    # Проверяем, что данные действительно обновились в БД
    with app.app_context():
        updated_equipment = Equipment.query.get(equipment.id)
        assert updated_equipment.name == 'Updated Laptop'
        assert updated_equipment.status == EquipmentStatus.UNDER_REPAIR
        assert updated_equipment.notes == 'Laptop is being repaired due to screen issues'
        assert updated_equipment.location == 'Repair Center'


def test_update_equipment_not_found(client, admin_token):
    """Тест обновления несуществующего оборудования"""
    update_data = {
        'name': 'Updated Equipment',
        'status': 'AVAILABLE'
    }
    
    response = client.put(
        '/api/equipment/9999',
        headers={
            'Authorization': f'Bearer {admin_token}',
            'Content-Type': 'application/json'
        },
        data=json.dumps(update_data)
    )
    
    assert response.status_code == 404
    data = json.loads(response.data)
    assert 'error' in data
    assert 'not found' in data['error'].lower()


def test_delete_equipment(client, admin_token, app):
    """Тест удаления оборудования"""
    with app.app_context():
        equipment = Equipment.query.filter_by(name='Test Printer').first()
    
    response = client.delete(
        f'/api/equipment/{equipment.id}',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'message' in data
    assert 'successfully deleted' in data['message'].lower()
    
    # Проверяем, что оборудование действительно удалено из БД
    with app.app_context():
        deleted_equipment = Equipment.query.get(equipment.id)
        assert deleted_equipment is None


def test_delete_equipment_not_found(client, admin_token):
    """Тест удаления несуществующего оборудования"""
    response = client.delete(
        '/api/equipment/9999',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 404
    data = json.loads(response.data)
    assert 'error' in data
    assert 'not found' in data['error'].lower()


def test_filter_equipment(client, admin_token):
    """Тест фильтрации оборудования"""
    # Фильтр по типу
    response = client.get(
        '/api/equipment?type=LAPTOP',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data['equipment']) == 1
    assert data['equipment'][0]['type'] == 'LAPTOP'
    
    # Фильтр по статусу
    response = client.get(
        '/api/equipment?status=IN_USE',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data['equipment']) == 2
    assert all(item['status'] == 'IN_USE' for item in data['equipment'])
    
    # Фильтр по отделу
    response = client.get(
        '/api/equipment?department=Administration',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data['equipment']) == 1
    assert data['equipment'][0]['department'] == 'Administration'
    
    # Комбинированный фильтр
    response = client.get(
        '/api/equipment?type=MONITOR&status=IN_USE',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data['equipment']) == 1
    assert data['equipment'][0]['type'] == 'MONITOR'
    assert data['equipment'][0]['status'] == 'IN_USE'


def test_search_equipment(client, admin_token):
    """Тест поиска оборудования"""
    # Поиск по имени
    response = client.get(
        '/api/equipment?search=Monitor',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data['equipment']) == 1
    assert 'Monitor' in data['equipment'][0]['name']
    
    # Поиск по серийному номеру
    response = client.get(
        '/api/equipment?search=SN12345678',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data['equipment']) == 1
    assert data['equipment'][0]['serial_number'] == 'SN12345678'
    
    # Поиск по производителю
    response = client.get(
        '/api/equipment?search=Dell',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data['equipment']) == 2
    assert all('Dell' in item['manufacturer'] for item in data['equipment'])


def test_assign_equipment(client, admin_token, app):
    """Тест назначения оборудования пользователю"""
    with app.app_context():
        equipment = Equipment.query.filter_by(name='Test Printer').first()
        user = User.query.filter_by(username='support').first()
    
    assign_data = {
        'user_id': user.id,
        'notes': 'Assigned to support team for testing'
    }
    
    response = client.post(
        f'/api/equipment/{equipment.id}/assign',
        headers={
            'Authorization': f'Bearer {admin_token}',
            'Content-Type': 'application/json'
        },
        data=json.dumps(assign_data)
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'equipment' in data
    assert data['equipment']['assigned_to'] == user.id
    assert 'Assigned to support team for testing' in data['equipment']['notes']
    
    # Проверяем, что оборудование действительно назначено в БД
    with app.app_context():
        updated_equipment = Equipment.query.get(equipment.id)
        assert updated_equipment.assigned_to == user.id
        assert 'Assigned to support team for testing' in updated_equipment.notes


def test_unassign_equipment(client, admin_token, app):
    """Тест отмены назначения оборудования"""
    with app.app_context():
        equipment = Equipment.query.filter_by(name='Test Laptop').first()
    
    response = client.post(
        f'/api/equipment/{equipment.id}/unassign',
        headers={
            'Authorization': f'Bearer {admin_token}',
            'Content-Type': 'application/json'
        },
        data=json.dumps({'notes': 'Equipment returned to inventory'})
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'equipment' in data
    assert data['equipment']['assigned_to'] is None
    assert 'Equipment returned to inventory' in data['equipment']['notes']
    
    # Проверяем, что назначение действительно отменено в БД
    with app.app_context():
        updated_equipment = Equipment.query.get(equipment.id)
        assert updated_equipment.assigned_to is None
        assert 'Equipment returned to inventory' in updated_equipment.notes


def test_change_equipment_status(client, admin_token, app):
    """Тест изменения статуса оборудования"""
    with app.app_context():
        equipment = Equipment.query.filter_by(name='Test Monitor').first()
    
    status_data = {
        'status': 'UNDER_REPAIR',
        'notes': 'Monitor has dead pixels, sent for repair'
    }
    
    response = client.post(
        f'/api/equipment/{equipment.id}/status',
        headers={
            'Authorization': f'Bearer {admin_token}',
            'Content-Type': 'application/json'
        },
        data=json.dumps(status_data)
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'equipment' in data
    assert data['equipment']['status'] == 'UNDER_REPAIR'
    assert 'Monitor has dead pixels, sent for repair' in data['equipment']['notes']
    
    # Проверяем, что статус действительно изменен в БД
    with app.app_context():
        updated_equipment = Equipment.query.get(equipment.id)
        assert updated_equipment.status == EquipmentStatus.UNDER_REPAIR
        assert 'Monitor has dead pixels, sent for repair' in updated_equipment.notes


def test_get_equipment_history(client, admin_token, app):
    """Тест получения истории изменений оборудования"""
    with app.app_context():
        equipment = Equipment.query.filter_by(name='Test Laptop').first()
        
        # Создаем несколько изменений для тестирования истории
        equipment_service = EquipmentService()
        equipment_service.update_equipment(
            equipment_id=equipment.id,
            data={'status': EquipmentStatus.UNDER_REPAIR, 'notes': 'Sent for repair'},
            user_id=1
        )
        equipment_service.update_equipment(
            equipment_id=equipment.id,
            data={'status': EquipmentStatus.AVAILABLE, 'notes': 'Repair completed'},
            user_id=1
        )
    
    response = client.get(
        f'/api/equipment/{equipment.id}/history',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'history' in data
    assert len(data['history']) >= 2
    
    # Проверяем, что история содержит записи о статусах
    statuses = [entry['status'] for entry in data['history'] if 'status' in entry]
    assert 'UNDER_REPAIR' in statuses
    assert 'AVAILABLE' in statuses


def test_get_equipment_by_user(client, admin_token, app):
    """Тест получения оборудования, назначенного пользователю"""
    with app.app_context():
        user = User.query.filter_by(username='user').first()
    
    response = client.get(
        f'/api/equipment/user/{user.id}',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'equipment' in data
    assert len(data['equipment']) == 2  # Laptop и Monitor назначены пользователю
    assert all(item['assigned_to'] == user.id for item in data['equipment'])


def test_export_equipment_list(client, admin_token):
    """Тест экспорта списка оборудования"""
    response = client.get(
        '/api/equipment/export?format=csv',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 200
    assert response.headers['Content-Type'] == 'text/csv'
    assert 'attachment; filename=' in response.headers['Content-Disposition']
    
    # Проверяем содержимое CSV
    csv_content = response.data.decode('utf-8')
    assert 'Name,Serial Number,Inventory Number,Type,Status' in csv_content
    assert 'Test Laptop,SN12345678,INV001,LAPTOP,IN_USE' in csv_content
    assert 'Test Monitor,MON87654321,INV002,MONITOR,IN_USE' in csv_content
    assert 'Test Printer,PRN55555555,INV003,PRINTER,AVAILABLE' in csv_content


def test_bulk_import_equipment(client, admin_token):
    """Тест массового импорта оборудования"""
    import_data = {
        'equipment': [
            {
                'name': 'Imported Keyboard',
                'serial_number': 'KB12345',
                'inventory_number': 'INV010',
                'type': 'KEYBOARD',
                'status': 'AVAILABLE',
                'manufacturer': 'Logitech',
                'model': 'MX Keys',
                'department': 'IT Department'
            },
            {
                'name': 'Imported Mouse',
                'serial_number': 'MS67890',
                'inventory_number': 'INV011',
                'type': 'MOUSE',
                'status': 'AVAILABLE',
                'manufacturer': 'Logitech',
                'model': 'MX Master',
                'department': 'IT Department'
            }
        ]
    }
    
    response = client.post(
        '/api/equipment/import',
        headers={
            'Authorization': f'Bearer {admin_token}',
            'Content-Type': 'application/json'
        },
        data=json.dumps(import_data)
    )
    
    assert response.status_code == 201
    data = json.loads(response.data)
    assert 'message' in data
    assert 'successfully imported' in data['message'].lower()
    assert 'count' in data
    assert data['count'] == 2
    
    # Проверяем, что оборудование действительно импортировано
    response = client.get(
        '/api/equipment?search=Imported',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data['equipment']) == 2
    names = [item['name'] for item in data['equipment']]
    assert 'Imported Keyboard' in names
    assert 'Imported Mouse' in names


def test_equipment_service_unit_tests():
    """Юнит-тесты для EquipmentService"""
    # Создаем моки для зависимостей
    mock_db = MagicMock()
    mock_notification_service = MagicMock(spec=NotificationService)
    
    # Создаем экземпляр сервиса с моками
    service = EquipmentService(db_session=mock_db, notification_service=mock_notification_service)
    
    # Тест создания оборудования
    mock_equipment = MagicMock(spec=Equipment)
    mock_equipment.id = 1
    mock_equipment.name = 'Test Equipment'
    mock_equipment.to_dict.return_value = {'id': 1, 'name': 'Test Equipment'}
    
    mock_db.add.return_value = None
    mock_db.commit.return_value = None
    mock_db.refresh.return_value = None
    
    # Мокаем Equipment.from_dict для возврата нашего мок-объекта
    with patch('models.equipment.Equipment.from_dict', return_value=mock_equipment):
        result = service.create_equipment(
            {
                'name': 'Test Equipment',
                'serial_number': 'TEST123',
                'type': 'LAPTOP',
                'status': 'AVAILABLE'
            },
            user_id=1
        )
    
    assert result == {'id': 1, 'name': 'Test Equipment'}
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()
    mock_notification_service.send_notification.assert_called_once()
    
    # Тест обновления оборудования
    mock_db.query.return_value.filter_by.return_value.first.return_value = mock_equipment
    
    with patch('models.equipment.Equipment.update_from_dict') as mock_update:
        mock_update.return_value = None
        result = service.update_equipment(
            equipment_id=1,
            data={'name': 'Updated Equipment'},
            user_id=1
        )
    
    assert result == {'id': 1, 'name': 'Test Equipment'}
    mock_update.assert_called_once()
    mock_db.commit.assert_called()
    
    # Тест удаления оборудования
    mock_db.query.return_value.filter_by.return_value.first.return_value = mock_equipment
    
    result = service.delete_equipment(equipment_id=1, user_id=1)
    
    assert result is True
    mock_db.delete.assert_called_once_with(mock_equipment)
    mock_db.commit.assert_called()
    mock_notification_service.send_notification.assert_called()


def test_access_control_equipment_endpoints(client, admin_token, support_token, user_token, app):
    """Тест контроля доступа к эндпоинтам оборудования для разных ролей"""
    with app.app_context():
        equipment = Equipment.query.filter_by(name='Test Laptop').first()
    
    # Тест доступа к получению списка оборудования
    # Все роли должны иметь доступ к просмотру
    for token in [admin_token, support_token, user_token]:
        response = client.get(
            '/api/equipment',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200
    
    # Тест создания оборудования
    # Только admin и support могут создавать
    new_equipment = {
        'name': 'New Equipment',
        'serial_number': 'NEW123',
        'inventory_number': 'INV999',
        'type': 'OTHER',
        'status': 'AVAILABLE'
    }
    
    # Admin может создавать
    response = client.post(
        '/api/equipment',
        headers={
            'Authorization': f'Bearer {admin_token}',
            'Content-Type': 'application/json'
        },
        data=json.dumps(new_equipment)
    )
    assert response.status_code == 201
    
    # Support может создавать
    response = client.post(
        '/api/equipment',
        headers={
            'Authorization': f'Bearer {support_token}',
            'Content-Type': 'application/json'
        },
        data=json.dumps(new_equipment)
    )
    assert response.status_code == 201
    
    # User не может создавать
    response = client.post(
        '/api/equipment',
        headers={
            'Authorization': f'Bearer {user_token}',
            'Content-Type': 'application/json'
        },
        data=json.dumps(new_equipment)
    )
    assert response.status_code == 403
    
    # Тест обновления оборудования
    # Только admin и support могут обновлять
    update_data = {
        'name': 'Updated by Role Test',
        'notes': 'Testing access control'
    }
    
    # Admin может обновлять
    response = client.put(
        f'/api/equipment/{equipment.id}',
        headers={
            'Authorization': f'Bearer {admin_token}',
            'Content-Type': 'application/json'
        },
        data=json.dumps(update_data)
    )
    assert response.status_code == 200
    
    # Support может обновлять
    response = client.put(
        f'/api/equipment/{equipment.id}',
        headers={
            'Authorization': f'Bearer {support_token}',
            'Content-Type': 'application/json'
        },
        data=json.dumps(update_data)
    )
    assert response.status_code == 200
    
    # User не может обновлять
    response = client.put(
        f'/api/equipment/{equipment.id}',
        headers={
            'Authorization': f'Bearer {user_token}',
            'Content-Type': 'application/json'
        },
        data=json.dumps(update_data)
    )
    assert response.status_code == 403
    
    # Тест удаления оборудования
    # Только admin может удалять
    with app.app_context():
        equipment_to_delete = Equipment.query.filter_by(name='Updated by Role Test').first()
    
    # Support не может удалять
    response = client.delete(
        f'/api/equipment/{equipment_to_delete.id}',
        headers={'Authorization': f'Bearer {support_token}'}
    )
    assert response.status_code == 403
    
    # User не может удалять
    response = client.delete(
        f'/api/equipment/{equipment_to_delete.id}',
        headers={'Authorization': f'Bearer {user_token}'}
    )
    assert response.status_code == 403
    
    # Admin может удалять
    response = client.delete(
        f'/api/equipment/{equipment_to_delete.id}',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert response.status_code == 200


def test_equipment_model_validation():
    """Тест валидации модели оборудования"""
    # Тест создания валидного оборудования
    valid_equipment = Equipment(
        name='Valid Equipment',
        serial_number='VALID123',
        inventory_number='INV123',
        type=EquipmentType.LAPTOP,
        status=EquipmentStatus.AVAILABLE,
        purchase_date=datetime.now(),
        warranty_end_date=datetime.now() + timedelta(days=365),
        created_by=1
    )
    
    assert valid_equipment.name == 'Valid Equipment'
    assert valid_equipment.serial_number == 'VALID123'
    assert valid_equipment.type == EquipmentType.LAPTOP
    assert valid_equipment.status == EquipmentStatus.AVAILABLE
    
    # Тест валидации типа оборудования
    with pytest.raises(ValueError):
        Equipment(
            name='Invalid Equipment',
            serial_number='INVALID123',
            inventory_number='INV456',
            type='INVALID_TYPE',  # Неверный тип
            status=EquipmentStatus.AVAILABLE,
            created_by=1
        )
    
    # Тест валидации статуса оборудования
    with pytest.raises(ValueError):
        Equipment(
            name='Invalid Equipment',
            serial_number='INVALID123',
            inventory_number='INV456',
            type=EquipmentType.LAPTOP,
            status='INVALID_STATUS',  # Неверный статус
            created_by=1
        )
    
    # Тест метода to_dict
    equipment_dict = valid_equipment.to_dict()
    assert equipment_dict['name'] == 'Valid Equipment'
    assert equipment_dict['serial_number'] == 'VALID123'
    assert equipment_dict['type'] == 'LAPTOP'
    assert equipment_dict['status'] == 'AVAILABLE'
    
    # Тест метода from_dict
    new_equipment = Equipment.from_dict({
        'name': 'New Equipment',
        'serial_number': 'NEW123',
        'inventory_number': 'INV789',
        'type': 'MONITOR',
        'status': 'IN_USE',
        'created_by': 1
    })
    
    assert new_equipment.name == 'New Equipment'
    assert new_equipment.serial_number == 'NEW123'
    assert new_equipment.type == EquipmentType.MONITOR
    assert new_equipment.status == EquipmentStatus.IN_USE


def test_equipment_service_integration(app):
    """Интеграционный тест для EquipmentService"""
    with app.app_context():
        # Создаем экземпляр сервиса
        equipment_service = EquipmentService()
        
        # Тест создания оборудования
        new_equipment_data = {
            'name': 'Integration Test Equipment',
            'serial_number': 'INT123',
            'inventory_number': 'INT001',
            'type': 'LAPTOP',
            'status': 'AVAILABLE',
            'manufacturer': 'Test Manufacturer',
            'model': 'Test Model',
            'department': 'Test Department'
        }
        
        result = equipment_service.create_equipment(new_equipment_data, user_id=1)
        assert result['name'] == 'Integration Test Equipment'
        assert result['serial_number'] == 'INT123'
        assert result['type'] == 'LAPTOP'
        assert 'id' in result
        
        equipment_id = result['id']
        
        # Тест получения оборудования по ID
        equipment = equipment_service.get_equipment_by_id(equipment_id)
        assert equipment['id'] == equipment_id
        assert equipment['name'] == 'Integration Test Equipment'
        
        # Тест обновления оборудования
        update_data = {
            'name': 'Updated Integration Equipment',
            'status': 'IN_USE',
            'notes': 'Updated during integration test'
        }
        
        updated_equipment = equipment_service.update_equipment(equipment_id, update_data, user_id=1)
        assert updated_equipment['name'] == 'Updated Integration Equipment'
        assert updated_equipment['status'] == 'IN_USE'
        assert updated_equipment['notes'] == 'Updated during integration test'
        
        # Тест назначения оборудования пользователю
        user = User.query.filter_by(username='user').first()
        assigned_equipment = equipment_service.assign_equipment(
            equipment_id=equipment_id,
            user_id=user.id,
            assigned_by=1,
            notes='Assigned during integration test'
        )
        
        assert assigned_equipment['assigned_to'] == user.id
        assert 'Assigned during integration test' in assigned_equipment['notes']
        
        # Тест изменения статуса оборудования
        status_changed = equipment_service.change_equipment_status(
            equipment_id=equipment_id,
            status=EquipmentStatus.UNDER_REPAIR,
            user_id=1,
            notes='Status changed during integration test'
        )
        
        assert status_changed['status'] == 'UNDER_REPAIR'
        assert 'Status changed during integration test' in status_changed['notes']
        
        # Тест получения истории оборудования
        history = equipment_service.get_equipment_history(equipment_id)
        assert len(history) >= 3  # Создание, обновление, изменение статуса
        
        # Тест отмены назначения оборудования
        unassigned_equipment = equipment_service.unassign_equipment(
            equipment_id=equipment_id,
            unassigned_by=1,
            notes='Unassigned during integration test'
        )
        
        assert unassigned_equipment['assigned_to'] is None
        assert 'Unassigned during integration test' in unassigned_equipment['notes']
        
        # Тест удаления оборудования
        result = equipment_service.delete_equipment(equipment_id, user_id=1)
        assert result is True
        
        # Проверяем, что оборудование действительно удалено
        with pytest.raises(Exception):
            equipment_service.get_equipment_by_id(equipment_id)


def test_equipment_bulk_operations(client, admin_token, app):
    """Тест массовых операций с оборудованием"""
    # Тест массового обновления статуса
    with app.app_context():
        equipment_ids = [
            Equipment.query.filter_by(name='Test Laptop').first().id,
            Equipment.query.filter_by(name='Test Monitor').first().id
        ]
    
    bulk_update_data = {
        'equipment_ids': equipment_ids,
        'status': 'UNDER_REPAIR',
        'notes': 'Bulk status update test'
    }
    
    response = client.post(
        '/api/equipment/bulk/status',
        headers={
            'Authorization': f'Bearer {admin_token}',
            'Content-Type': 'application/json'
        },
        data=json.dumps(bulk_update_data)
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'updated_count' in data
    assert data['updated_count'] == 2
    
    # Проверяем, что статусы действительно обновились
    with app.app_context():
        for equipment_id in equipment_ids:
            equipment = Equipment.query.get(equipment_id)
            assert equipment.status == EquipmentStatus.UNDER_REPAIR
            assert 'Bulk status update test' in equipment.notes
    
    # Тест массового назначения отдела
    bulk_department_data = {
        'equipment_ids': equipment_ids,
        'department': 'Testing Department',
        'notes': 'Bulk department update test'
    }
    
    response = client.post(
        '/api/equipment/bulk/department',
        headers={
            'Authorization': f'Bearer {admin_token}',
            'Content-Type': 'application/json'
        },
        data=json.dumps(bulk_department_data)
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'updated_count' in data
    assert data['updated_count'] == 2
    
    # Проверяем, что отделы действительно обновились
    with app.app_context():
        for equipment_id in equipment_ids:
            equipment = Equipment.query.get(equipment_id)
            assert equipment.department == 'Testing Department'
            assert 'Bulk department update test' in equipment.notes


def test_equipment_statistics(client, admin_token):
    """Тест получения статистики по оборудованию"""
    response = client.get(
        '/api/equipment/statistics',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    
    # Проверяем наличие ключевых метрик в ответе
    assert 'total_count' in data
    assert 'by_type' in data
    assert 'by_status' in data
    assert 'by_department' in data
    
    # Проверяем корректность общего количества
    assert data['total_count'] >= 3  # Минимум 3 единицы оборудования созданы в фикстуре
    
    # Проверяем статистику по типам
    assert 'LAPTOP' in data['by_type']
    assert 'MONITOR' in data['by_type']
    assert 'PRINTER' in data['by_type']
    
    # Проверяем статистику по статусам
    assert 'IN_USE' in data['by_status']
    assert 'AVAILABLE' in data['by_status']
    
    # Проверяем статистику по отделам
    assert 'IT Department' in data['by_department']
    assert 'Administration' in data['by_department']


def test_equipment_warranty_notifications(client, admin_token, app):
    """Тест уведомлений о скором истечении гарантии"""
    # Создаем оборудование с гарантией, которая скоро истекает
    with app.app_context():
        soon_expiring_equipment = Equipment(
            name='Warranty Test Equipment',
            serial_number='WARRANTY123',
            inventory_number='WAR001',
            type=EquipmentType.LAPTOP,
            status=EquipmentStatus.IN_USE,
            purchase_date=datetime.now() - timedelta(days=350),
            warranty_end_date=datetime.now() + timedelta(days=15),  # Гарантия истекает через 15 дней
            created_by=1,
            assigned_to=1
        )
        
        db.session.add(soon_expiring_equipment)
        db.session.commit()
    
    # Запрашиваем список оборудования с истекающей гарантией
    response = client.get(
        '/api/equipment/warranty-expiring',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    
    assert 'equipment' in data
    assert len(data['equipment']) >= 1
    
    # Проверяем, что наше тестовое оборудование в списке
    warranty_equipment_names = [item['name'] for item in data['equipment']]
    assert 'Warranty Test Equipment' in warranty_equipment_names
    
    # Проверяем, что для каждого элемента указано количество дней до истечения гарантии
    for item in data['equipment']:
        if item['name'] == 'Warranty Test Equipment':
            assert 'days_until_expiry' in item
            assert 0 <= item['days_until_expiry'] <= 30  # Гарантия истекает в течение 30 дней


def test_equipment_audit_log(client, admin_token, app):
    """Тест журнала аудита для оборудования"""
    with app.app_context():
        equipment = Equipment.query.filter_by(name='Test Laptop').first()
        
        # Создаем несколько изменений для тестирования аудита
        equipment_service = EquipmentService()
        
        # Изменение 1: Обновление статуса
        equipment_service.change_equipment_status(
            equipment_id=equipment.id,
            status=EquipmentStatus.UNDER_REPAIR,
            user_id=1,
            notes='Audit test: Status change to UNDER_REPAIR'
        )
        
        # Изменение 2: Обновление информации
        equipment_service.update_equipment(
            equipment_id=equipment.id,
            data={
                'location': 'Audit Test Location',
                'notes': 'Audit test: Location update'
            },
            user_id=1
        )
        
        # Изменение 3: Возврат к исходному статусу
        equipment_service.change_equipment_status(
            equipment_id=equipment.id,
            status=EquipmentStatus.IN_USE,
            user_id=1,
            notes='Audit test: Status change to IN_USE'
        )
    
    # Запрашиваем журнал аудита
    response = client.get(
        f'/api/equipment/{equipment.id}/audit',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    
    assert 'audit_log' in data
    assert len(data['audit_log']) >= 3  # Минимум 3 записи, которые мы создали
    
    # Проверяем содержимое журнала аудита
    actions = [entry['action'] for entry in data['audit_log']]
    assert 'STATUS_CHANGE' in actions
    assert 'UPDATE' in actions
    
    # Проверяем наличие наших тестовых заметок
    notes = []
    for entry in data['audit_log']:
        if 'details' in entry and 'notes' in entry['details']:
            notes.append(entry['details']['notes'])
    
    assert any('Status change to UNDER_REPAIR' in note for note in notes)
    assert any('Location update' in note for note in notes)
    assert any('Status change to IN_USE' in note for note in notes)