from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, scoped_session
from contextlib import contextmanager
import os
from dotenv import load_dotenv
from flask import current_app

# Загрузка переменных окружения
load_dotenv()

# Инициализация SQLAlchemy
db = SQLAlchemy()

# Базовый класс для моделей
Base = declarative_base()

def get_database_url():
    """
    Получает URL базы данных из переменных окружения или конфигурации
    """
    # Приоритет: переменная окружения -> конфигурация приложения -> значение по умолчанию
    return os.getenv(
        'DATABASE_URL', 
        current_app.config.get(
            'SQLALCHEMY_DATABASE_URI', 
            'postgresql://postgres:postgres@localhost:5432/it_service_desk'
        )
    )

def init_db(app):
    """
    Инициализирует соединение с базой данных для Flask приложения
    
    Args:
        app: Flask приложение
    """
    db.init_app(app)
    
    with app.app_context():
        # Создаем все таблицы, если они не существуют
        db.create_all()
        
        # Выполняем миграции, если они есть
        if app.config.get('AUTO_MIGRATE', False):
            from flask_migrate import Migrate, upgrade
            migrate = Migrate(app, db)
            upgrade()

def get_engine():
    """
    Создает и возвращает движок SQLAlchemy для работы с базой данных
    
    Returns:
        SQLAlchemy engine
    """
    return create_engine(
        get_database_url(),
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800,  # Переподключение каждые 30 минут
        echo=current_app.config.get('SQLALCHEMY_ECHO', False)
    )

def get_session_factory():
    """
    Создает и возвращает фабрику сессий SQLAlchemy
    
    Returns:
        SQLAlchemy session factory
    """
    engine = get_engine()
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db_session():
    """
    Создает и возвращает scoped session для работы с базой данных
    
    Returns:
        SQLAlchemy scoped session
    """
    return scoped_session(get_session_factory())

@contextmanager
def session_scope():
    """
    Контекстный менеджер для работы с сессией базы данных.
    Автоматически выполняет commit при успешном выполнении
    и rollback при возникновении исключения.
    
    Yields:
        SQLAlchemy session
    """
    session = get_db_session()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()

def execute_raw_sql(query, params=None, fetch=True):
    """
    Выполняет SQL запрос напрямую к базе данных
    
    Args:
        query (str): SQL запрос
        params (dict, optional): Параметры запроса
        fetch (bool, optional): Нужно ли возвращать результат запроса
        
    Returns:
        list: Результат запроса, если fetch=True
    """
    with session_scope() as session:
        result = session.execute(query, params or {})
        if fetch:
            return result.fetchall()
        return None

def check_connection():
    """
    Проверяет соединение с базой данных
    
    Returns:
        bool: True если соединение успешно, иначе False
    """
    try:
        engine = get_engine()
        with engine.connect() as connection:
            connection.execute("SELECT 1")
        return True
    except Exception as e:
        current_app.logger.error(f"Database connection error: {str(e)}")
        return False

def create_database_if_not_exists():
    """
    Создает базу данных, если она не существует
    """
    db_url = get_database_url()
    db_name = db_url.split('/')[-1]
    
    # Создаем URL для подключения к postgres (без указания конкретной БД)
    postgres_url = db_url.rsplit('/', 1)[0] + '/postgres'
    
    engine = create_engine(postgres_url)
    with engine.connect() as conn:
        # Проверяем, существует ли база данных
        result = conn.execute(f"SELECT 1 FROM pg_database WHERE datname = '{db_name}'")
        if not result.fetchone():
            # Отключаем активные соединения
            conn.execute(f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{db_name}'")
            # Создаем базу данных
            conn.execute(f"CREATE DATABASE {db_name}")
            current_app.logger.info(f"Created database: {db_name}")

def drop_database():
    """
    Удаляет базу данных (используется только в тестах)
    """
    if not current_app.config.get('TESTING', False):
        raise RuntimeError("This function can only be called in testing environment")
    
    db_url = get_database_url()
    db_name = db_url.split('/')[-1]
    
    # Создаем URL для подключения к postgres (без указания конкретной БД)
    postgres_url = db_url.rsplit('/', 1)[0] + '/postgres'
    
    engine = create_engine(postgres_url)
    with engine.connect() as conn:
        # Отключаем активные соединения
        conn.execute(f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{db_name}'")
        # Удаляем базу данных
        conn.execute(f"DROP DATABASE IF EXISTS {db_name}")