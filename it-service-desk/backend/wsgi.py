# backend/wsgi.py
"""
WSGI конфигурационный файл для запуска приложения Flask через WSGI-серверы.
Этот файл является точкой входа для Gunicorn, uWSGI или других WSGI-серверов.
"""

import os
from dotenv import load_dotenv

# Загрузка переменных окружения перед импортом приложения
load_dotenv()

# Импорт фабрики приложения
from app import create_app
from config.config import Config

# Создание экземпляра приложения
application = create_app(Config)

# Для запуска через 'python wsgi.py' в режиме разработки
if __name__ == "__main__":
    # Определение порта из переменной окружения или использование порта по умолчанию
    port = int(os.environ.get("PORT", 5000))
    
    # Определение режима отладки из переменной окружения
    debug = os.environ.get("FLASK_DEBUG", "False").lower() in ("true", "1", "t")
    
    # Запуск приложения с настройками для разработки
    application.run(
        host="0.0.0.0",  # Доступно со всех сетевых интерфейсов
        port=port,
        debug=debug,
        use_reloader=debug,  # Автоматическая перезагрузка при изменении кода в режиме отладки
    )

# Экспорт для WSGI-серверов
app = application