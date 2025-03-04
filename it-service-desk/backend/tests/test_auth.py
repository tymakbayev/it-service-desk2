import pytest
import json
import jwt
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from flask import Flask, url_for
import sys
import os

# Добавляем корневую директорию проекта в sys.path для импорта модулей
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from config.config import Config
from config.database import db
from models.user import User
from models.role import Role
from services.auth_service import AuthService
from utils.jwt_util import generate_token, decode_token, validate_token
from utils.password_util import hash_password, check_password

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
            password=hash_password('admin123'),
            first_name='Admin',
            last_name='User',
            role_id=admin_role.id,
            is_active=True
        )
        
        test_support = User(
            username='support',
            email='support@example.com',
            password=hash_password('support123'),
            first_name='Support',
            last_name='User',
            role_id=support_role.id,
            is_active=True
        )
        
        test_user = User(
            username='user',
            email='user@example.com',
            password=hash_password('user123'),
            first_name='Regular',
            last_name='User',
            role_id=user_role.id,
            is_active=True
        )
        
        inactive_user = User(
            username='inactive',
            email='inactive@example.com',
            password=hash_password('inactive123'),
            first_name='Inactive',
            last_name='User',
            role_id=user_role.id,
            is_active=False
        )
        
        db.session.add_all([test_admin, test_support, test_user, inactive_user])
        db.session.commit()
        
    yield app
    
    # Очистка после тестов
    with app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Создание тестового клиента"""
    return app.test_client()


@pytest.fixture
def auth_headers(app, client):
    """Получение заголовков авторизации для тестового пользователя"""
    with app.app_context():
        # Логин пользователя
        response = client.post(
            '/api/auth/login',
            data=json.dumps({'email': 'admin@example.com', 'password': 'admin123'}),
            content_type='application/json'
        )
        data = json.loads(response.data)
        token = data['access_token']
        
        # Возвращаем заголовки с токеном
        return {'Authorization': f'Bearer {token}'}


class TestAuthAPI:
    """Тесты API аутентификации"""
    
    def test_register_success(self, client):
        """Тест успешной регистрации пользователя"""
        response = client.post(
            '/api/auth/register',
            data=json.dumps({
                'username': 'newuser',
                'email': 'newuser@example.com',
                'password': 'Password123!',
                'first_name': 'New',
                'last_name': 'User'
            }),
            content_type='application/json'
        )
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert 'id' in data
        assert data['username'] == 'newuser'
        assert data['email'] == 'newuser@example.com'
        assert 'password' not in data
        assert data['role'] == 'user'  # По умолчанию роль - user
    
    def test_register_duplicate_email(self, client):
        """Тест регистрации с уже существующим email"""
        response = client.post(
            '/api/auth/register',
            data=json.dumps({
                'username': 'another',
                'email': 'admin@example.com',  # Уже существующий email
                'password': 'Password123!',
                'first_name': 'Another',
                'last_name': 'User'
            }),
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert 'email already exists' in data['error'].lower()
    
    def test_register_duplicate_username(self, client):
        """Тест регистрации с уже существующим username"""
        response = client.post(
            '/api/auth/register',
            data=json.dumps({
                'username': 'admin',  # Уже существующий username
                'email': 'another@example.com',
                'password': 'Password123!',
                'first_name': 'Another',
                'last_name': 'User'
            }),
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert 'username already exists' in data['error'].lower()
    
    def test_register_invalid_data(self, client):
        """Тест регистрации с невалидными данными"""
        # Тест с коротким паролем
        response = client.post(
            '/api/auth/register',
            data=json.dumps({
                'username': 'newuser',
                'email': 'newuser@example.com',
                'password': 'short',  # Слишком короткий пароль
                'first_name': 'New',
                'last_name': 'User'
            }),
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert 'password' in data['error'].lower()
        
        # Тест с невалидным email
        response = client.post(
            '/api/auth/register',
            data=json.dumps({
                'username': 'newuser',
                'email': 'invalid-email',  # Невалидный email
                'password': 'Password123!',
                'first_name': 'New',
                'last_name': 'User'
            }),
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert 'email' in data['error'].lower()
    
    def test_login_success(self, client):
        """Тест успешного входа в систему"""
        response = client.post(
            '/api/auth/login',
            data=json.dumps({
                'email': 'admin@example.com',
                'password': 'admin123'
            }),
            content_type='application/json'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'access_token' in data
        assert 'refresh_token' in data
        assert 'user' in data
        assert data['user']['email'] == 'admin@example.com'
        assert data['user']['role'] == 'admin'
    
    def test_login_invalid_credentials(self, client):
        """Тест входа с неверными учетными данными"""
        response = client.post(
            '/api/auth/login',
            data=json.dumps({
                'email': 'admin@example.com',
                'password': 'wrong_password'
            }),
            content_type='application/json'
        )
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data
        assert 'invalid credentials' in data['error'].lower()
    
    def test_login_inactive_user(self, client):
        """Тест входа неактивного пользователя"""
        response = client.post(
            '/api/auth/login',
            data=json.dumps({
                'email': 'inactive@example.com',
                'password': 'inactive123'
            }),
            content_type='application/json'
        )
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data
        assert 'account is inactive' in data['error'].lower()
    
    def test_refresh_token(self, client, app):
        """Тест обновления токена"""
        # Сначала получаем токены через логин
        login_response = client.post(
            '/api/auth/login',
            data=json.dumps({
                'email': 'admin@example.com',
                'password': 'admin123'
            }),
            content_type='application/json'
        )
        
        login_data = json.loads(login_response.data)
        refresh_token = login_data['refresh_token']
        
        # Используем refresh_token для получения нового access_token
        response = client.post(
            '/api/auth/refresh',
            data=json.dumps({
                'refresh_token': refresh_token
            }),
            content_type='application/json'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'access_token' in data
        assert 'refresh_token' in data  # Новый refresh_token также должен быть возвращен
    
    def test_refresh_token_invalid(self, client):
        """Тест обновления с невалидным токеном"""
        response = client.post(
            '/api/auth/refresh',
            data=json.dumps({
                'refresh_token': 'invalid_token'
            }),
            content_type='application/json'
        )
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data
        assert 'invalid token' in data['error'].lower()
    
    def test_logout(self, client, auth_headers):
        """Тест выхода из системы"""
        response = client.post(
            '/api/auth/logout',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'message' in data
        assert 'successfully logged out' in data['message'].lower()
    
    def test_get_current_user(self, client, auth_headers):
        """Тест получения данных текущего пользователя"""
        response = client.get(
            '/api/auth/me',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['email'] == 'admin@example.com'
        assert data['username'] == 'admin'
        assert data['role'] == 'admin'
    
    def test_unauthorized_access(self, client):
        """Тест доступа без авторизации"""
        response = client.get('/api/auth/me')
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data
        assert 'unauthorized' in data['error'].lower()


class TestAuthService:
    """Тесты сервиса аутентификации"""
    
    def test_register_user(self, app):
        """Тест регистрации пользователя через сервис"""
        with app.app_context():
            auth_service = AuthService()
            
            user_data = {
                'username': 'service_test',
                'email': 'service_test@example.com',
                'password': 'Password123!',
                'first_name': 'Service',
                'last_name': 'Test'
            }
            
            user = auth_service.register_user(user_data)
            
            assert user is not None
            assert user.username == 'service_test'
            assert user.email == 'service_test@example.com'
            assert check_password('Password123!', user.password)
            
            # Проверяем, что пользователь действительно сохранен в БД
            db_user = User.query.filter_by(email='service_test@example.com').first()
            assert db_user is not None
            assert db_user.id == user.id
    
    def test_authenticate_user(self, app):
        """Тест аутентификации пользователя через сервис"""
        with app.app_context():
            auth_service = AuthService()
            
            # Успешная аутентификация
            user, tokens = auth_service.authenticate_user('admin@example.com', 'admin123')
            
            assert user is not None
            assert user.email == 'admin@example.com'
            assert 'access_token' in tokens
            assert 'refresh_token' in tokens
            
            # Неверный пароль
            with pytest.raises(Exception) as excinfo:
                auth_service.authenticate_user('admin@example.com', 'wrong_password')
            assert 'Invalid credentials' in str(excinfo.value)
            
            # Несуществующий пользователь
            with pytest.raises(Exception) as excinfo:
                auth_service.authenticate_user('nonexistent@example.com', 'password')
            assert 'Invalid credentials' in str(excinfo.value)
            
            # Неактивный пользователь
            with pytest.raises(Exception) as excinfo:
                auth_service.authenticate_user('inactive@example.com', 'inactive123')
            assert 'Account is inactive' in str(excinfo.value)
    
    def test_refresh_token_service(self, app):
        """Тест обновления токена через сервис"""
        with app.app_context():
            auth_service = AuthService()
            
            # Получаем токены через аутентификацию
            user, tokens = auth_service.authenticate_user('admin@example.com', 'admin123')
            refresh_token = tokens['refresh_token']
            
            # Обновляем токен
            new_tokens = auth_service.refresh_token(refresh_token)
            
            assert 'access_token' in new_tokens
            assert 'refresh_token' in new_tokens
            assert new_tokens['access_token'] != tokens['access_token']
            
            # Проверяем невалидный токен
            with pytest.raises(Exception) as excinfo:
                auth_service.refresh_token('invalid_token')
            assert 'Invalid token' in str(excinfo.value)
    
    def test_get_current_user(self, app):
        """Тест получения текущего пользователя по токену"""
        with app.app_context():
            auth_service = AuthService()
            
            # Получаем токены через аутентификацию
            original_user, tokens = auth_service.authenticate_user('admin@example.com', 'admin123')
            access_token = tokens['access_token']
            
            # Получаем пользователя по токену
            user = auth_service.get_current_user(access_token)
            
            assert user is not None
            assert user.id == original_user.id
            assert user.email == 'admin@example.com'
            
            # Проверяем невалидный токен
            with pytest.raises(Exception) as excinfo:
                auth_service.get_current_user('invalid_token')
            assert 'Invalid token' in str(excinfo.value)


class TestJWTUtils:
    """Тесты утилит для работы с JWT"""
    
    def test_generate_token(self, app):
        """Тест генерации JWT токена"""
        with app.app_context():
            # Генерируем токен
            payload = {'user_id': 1, 'role': 'admin'}
            token = generate_token(payload)
            
            # Проверяем, что токен не пустой
            assert token is not None
            assert isinstance(token, str)
            
            # Декодируем токен и проверяем payload
            decoded = jwt.decode(
                token, 
                app.config['JWT_SECRET_KEY'],
                algorithms=['HS256']
            )
            
            assert 'user_id' in decoded
            assert decoded['user_id'] == 1
            assert 'role' in decoded
            assert decoded['role'] == 'admin'
            assert 'exp' in decoded  # Проверяем наличие срока действия
    
    def test_decode_token(self, app):
        """Тест декодирования JWT токена"""
        with app.app_context():
            # Генерируем токен
            payload = {'user_id': 1, 'role': 'admin'}
            token = generate_token(payload)
            
            # Декодируем токен
            decoded = decode_token(token)
            
            assert decoded is not None
            assert 'user_id' in decoded
            assert decoded['user_id'] == 1
            assert 'role' in decoded
            assert decoded['role'] == 'admin'
            
            # Проверяем невалидный токен
            with pytest.raises(Exception):
                decode_token('invalid_token')
    
    def test_validate_token(self, app):
        """Тест валидации JWT токена"""
        with app.app_context():
            # Генерируем токен
            payload = {'user_id': 1, 'role': 'admin'}
            token = generate_token(payload)
            
            # Валидируем токен
            is_valid = validate_token(token)
            assert is_valid is True
            
            # Проверяем невалидный токен
            is_valid = validate_token('invalid_token')
            assert is_valid is False
            
            # Проверяем просроченный токен
            expired_payload = {
                'user_id': 1, 
                'role': 'admin',
                'exp': datetime.utcnow() - timedelta(hours=1)  # Токен просрочен на 1 час
            }
            expired_token = jwt.encode(
                expired_payload,
                app.config['JWT_SECRET_KEY'],
                algorithm='HS256'
            )
            is_valid = validate_token(expired_token)
            assert is_valid is False


class TestPasswordUtils:
    """Тесты утилит для работы с паролями"""
    
    def test_hash_password(self):
        """Тест хеширования пароля"""
        password = 'test_password'
        hashed = hash_password(password)
        
        # Проверяем, что хеш не равен исходному паролю
        assert hashed != password
        # Проверяем, что хеш не пустой
        assert hashed is not None
        assert len(hashed) > 0
    
    def test_check_password(self):
        """Тест проверки пароля"""
        password = 'test_password'
        hashed = hash_password(password)
        
        # Проверяем правильный пароль
        assert check_password(password, hashed) is True
        
        # Проверяем неправильный пароль
        assert check_password('wrong_password', hashed) is False
    
    def test_password_salt(self):
        """Тест уникальности соли для каждого пароля"""
        password = 'same_password'
        
        # Хешируем один и тот же пароль дважды
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        
        # Хеши должны быть разными из-за разной соли
        assert hash1 != hash2


if __name__ == '__main__':
    pytest.main()